import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from './config';
import { PurchaseRecord, MappingReport, RecordOrigin } from '../types/purchases';

// Tamanho otimizado de chunk (500 registros por documento = pouquíssimas gravações, bem abaixo do limite de 1MB por doc)
const CHUNK_SIZE = 500;

/**
 * Função utilitária que aplica timeout a qualquer Promise do Firestore.
 * Evita que operações travem indefinidamente em conexões lentas ou quando a cota gratuita do Firebase expira.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err: any = new Error(errorMessage);
      err.code = 'timeout';
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Sanitiza objetos para o Firestore (substitui undefined por null, converte Date em ISO string)
 */
function sanitizeRecordForFirestore(r: PurchaseRecord): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, val] of Object.entries(r)) {
    if (val === undefined) {
      sanitized[key] = null;
    } else if (val instanceof Date) {
      sanitized[key] = val.toISOString();
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

/**
 * Reconstrói PurchaseRecord restaurando instâncias de Date
 */
function deserializeFirestoreRecord(raw: any, origin: RecordOrigin): PurchaseRecord {
  return {
    ...raw,
    origin: raw.origin || origin,
    issueDate: raw.issueDate ? new Date(raw.issueDate) : null,
    deliveryDate: raw.deliveryDate ? new Date(raw.deliveryDate) : null,
    quoteDate: raw.quoteDate ? new Date(raw.quoteDate) : null,
  };
}

export function getDatasetId(origin: RecordOrigin): 'compras' | 'servicos' {
  return origin === 'Serviços' ? 'servicos' : 'compras';
}

export function isQuotaOrPermissionOrTimeoutError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const code = (err.code || '').toLowerCase();
  return (
    code === 'resource-exhausted' ||
    code === 'permission-denied' ||
    code === 'timeout' ||
    code === 'unavailable' ||
    msg.includes('quota limit exceeded') ||
    msg.includes('free daily write units') ||
    msg.includes('resource_exhausted') ||
    msg.includes('missing or insufficient permissions') ||
    msg.includes('timeout') ||
    msg.includes('maximum backoff') ||
    msg.includes('offline')
  );
}

export interface SaveProgressCallback {
  (progress: { step: string; percent: number; savedChunks: number; totalChunks: number }): void;
}

/**
 * Salva a base completa (Produtos/Compras ou Serviços) no Firestore de forma particionada e segura.
 * Nunca trava a interface: possui timeouts rígidos e tratamento gracioso caso a cota do Firebase esteja esgotada.
 */
export async function saveBaseDataToFirestore(
  origin: RecordOrigin,
  records: PurchaseRecord[],
  report: MappingReport,
  onProgress?: SaveProgressCallback
): Promise<boolean> {
  const datasetId = getDatasetId(origin);
  const datasetDocPath = `datasets/${datasetId}`;

  try {
    const isDemo = (report.fileName || '').toLowerCase().includes('demo');
    const sanitizedRecords = records.map(sanitizeRecordForFirestore);
    const totalChunks = Math.max(1, Math.ceil(sanitizedRecords.length / CHUNK_SIZE));

    onProgress?.({
      step: `Preparando ${records.length.toLocaleString('pt-BR')} registros...`,
      percent: 25,
      savedChunks: 0,
      totalChunks,
    });

    // 1. Gravação do primeiro chunk como teste de conectividade e cota (timeout estrito de 3.5 segundos)
    const firstChunkRecords = sanitizedRecords.slice(0, CHUNK_SIZE);
    try {
      await withTimeout(
        setDoc(doc(db, 'datasets', datasetId, 'chunks', 'chunk_0'), {
          id: 'chunk_0',
          datasetId,
          chunkIndex: 0,
          count: firstChunkRecords.length,
          records: firstChunkRecords,
          updatedAt: new Date().toISOString(),
        }),
        3500,
        'Tempo limite excedido ao conectar com Firestore (cota diária ou latência na nuvem).'
      );
    } catch (probeErr: any) {
      if (isQuotaOrPermissionOrTimeoutError(probeErr)) {
        console.warn(
          `[Firestore] Gravação na nuvem indisponível no momento (${probeErr.message}). Os dados continuam salvos no navegador com segurança.`
        );
        return false;
      }
      handleFirestoreError(probeErr, OperationType.WRITE, `${datasetDocPath}/chunks/chunk_0`);
    }

    onProgress?.({
      step: `Gravando no Firebase Firestore (1/${totalChunks} pacotes)...`,
      percent: Math.min(90, Math.round((1 / totalChunks) * 65) + 25),
      savedChunks: 1,
      totalChunks,
    });

    // 2. Grava os chunks restantes se houver mais de 1
    if (totalChunks > 1) {
      const BATCH_CONCURRENCY = 3;
      let saved = 1;

      for (let i = 1; i < totalChunks; i += BATCH_CONCURRENCY) {
        const batchIndices: number[] = [];
        for (let j = i; j < Math.min(i + BATCH_CONCURRENCY, totalChunks); j++) {
          batchIndices.push(j);
        }

        try {
          await withTimeout(
            Promise.all(
              batchIndices.map(async (chunkIdx) => {
                const chunkRecords = sanitizedRecords.slice(
                  chunkIdx * CHUNK_SIZE,
                  (chunkIdx + 1) * CHUNK_SIZE
                );
                await setDoc(doc(db, 'datasets', datasetId, 'chunks', `chunk_${chunkIdx}`), {
                  id: `chunk_${chunkIdx}`,
                  datasetId,
                  chunkIndex: chunkIdx,
                  count: chunkRecords.length,
                  records: chunkRecords,
                  updatedAt: new Date().toISOString(),
                });
              })
            ),
            4500,
            'Tempo limite excedido ao gravar lote no Firestore.'
          );
        } catch (batchErr: any) {
          if (isQuotaOrPermissionOrTimeoutError(batchErr)) {
            console.warn(
              `[Firestore] Limite atingido durante gravação de lotes. Dados mantidos localmente.`
            );
            return false;
          }
          throw batchErr;
        }

        saved += batchIndices.length;
        const progressPct = Math.min(90, Math.round((saved / totalChunks) * 65) + 25);
        onProgress?.({
          step: `Gravando no Firebase Firestore (${saved}/${totalChunks} pacotes)...`,
          percent: progressPct,
          savedChunks: saved,
          totalChunks,
        });
      }
    }

    // 3. Limpa partições antigas remanescentes se a planilha atual for menor
    try {
      const existingChunksSnapshot = await withTimeout(
        getDocs(collection(db, 'datasets', datasetId, 'chunks')),
        3000,
        'Timeout ao listar partições'
      );
      const deletePromises: Promise<void>[] = [];
      for (const chunkDoc of existingChunksSnapshot.docs) {
        const data = chunkDoc.data();
        if (typeof data.chunkIndex === 'number' && data.chunkIndex >= totalChunks) {
          deletePromises.push(deleteDoc(chunkDoc.ref));
        }
      }
      if (deletePromises.length > 0) {
        await withTimeout(Promise.all(deletePromises), 3000, 'Timeout ao limpar partições antigas');
      }
    } catch {
      // Ignora falha não crítica de limpeza
    }

    // 4. Grava o documento principal de metadados da base
    onProgress?.({
      step: 'Finalizando publicação e registrando metadados...',
      percent: 95,
      savedChunks: totalChunks,
      totalChunks,
    });

    const metadataPayload = {
      id: datasetId,
      origin,
      fileName: report.fileName,
      loadTimestamp: report.loadTimestamp,
      totalRows: records.length,
      chunksCount: totalChunks,
      isDemo,
      report: JSON.parse(JSON.stringify(report)),
      updatedAt: new Date().toISOString(),
    };

    await withTimeout(
      setDoc(doc(db, 'datasets', datasetId), metadataPayload),
      3500,
      'Timeout ao gravar metadados no Firestore'
    );

    onProgress?.({
      step: 'Concluído com sucesso!',
      percent: 100,
      savedChunks: totalChunks,
      totalChunks,
    });

    return true;
  } catch (err: any) {
    if (isQuotaOrPermissionOrTimeoutError(err)) {
      console.warn(
        `[Firestore] Cota diária do Firebase atingida ou latência para ${origin}. Os dados permanecem seguros no cache persistente local do navegador.`
      );
      return false;
    }
    console.warn(`[Firestore] Erro ao salvar base ${origin}:`, err);
    return false;
  }
}

/**
 * Carrega a base completa do Firestore. Retorna null se não houver dados ou se a cota foi atingida.
 */
export async function loadBaseDataFromFirestore(
  origin: RecordOrigin
): Promise<{ records: PurchaseRecord[]; report: MappingReport; isDemo?: boolean; updatedAt?: string } | null> {
  const datasetId = getDatasetId(origin);

  try {
    const docSnap = await withTimeout(
      getDoc(doc(db, 'datasets', datasetId)),
      3500,
      'Timeout getDoc metadata'
    );
    if (!docSnap.exists()) {
      return null;
    }

    const metadata = docSnap.data();
    const chunksCount = metadata.chunksCount || 0;
    const isDemo = !!metadata.isDemo || (metadata.fileName || '').toLowerCase().includes('demo');

    let chunkDataList: any[] = [];

    if (chunksCount > 0) {
      // Carregamento direto por chave primária de cada chunk
      const chunkPromises = Array.from({ length: chunksCount }, (_, i) =>
        getDoc(doc(db, 'datasets', datasetId, 'chunks', `chunk_${i}`))
      );
      const chunkSnaps = await withTimeout(
        Promise.all(chunkPromises),
        5000,
        'Timeout getDoc chunks'
      );
      for (const s of chunkSnaps) {
        if (s.exists()) {
          chunkDataList.push(s.data());
        }
      }
    } else {
      // Fallback para getDocs caso legados não possuam chunksCount
      const chunksSnapshot = await withTimeout(
        getDocs(collection(db, 'datasets', datasetId, 'chunks')),
        4000,
        'Timeout getDocs chunks'
      );
      chunkDataList = chunksSnapshot.docs
        .map((d) => d.data())
        .sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));
    }

    if (chunkDataList.length === 0) {
      return null;
    }

    const allRecords: PurchaseRecord[] = [];
    for (const chunkData of chunkDataList) {
      if (Array.isArray(chunkData.records)) {
        for (const raw of chunkData.records) {
          allRecords.push(deserializeFirestoreRecord(raw, origin));
        }
      }
    }

    return {
      records: allRecords,
      report: metadata.report as MappingReport,
      isDemo,
      updatedAt: metadata.updatedAt,
    };
  } catch (err: any) {
    if (isQuotaOrPermissionOrTimeoutError(err)) {
      console.warn(
        `[Firestore] Cota de leitura atingida ou indisponível para base ${origin}. O sistema operará com os dados locais salvos.`
      );
      return null;
    }
    console.warn(`[Firestore] Aviso ao carregar base ${origin} do Firestore:`, err);
    return null;
  }
}

/**
 * Escuta atualizações em tempo real nos metadados do Firestore para que toda a empresa
 * veja os novos dados assim que qualquer usuário fizer upload de uma planilha.
 */
export function subscribeToDatasetUpdates(
  origin: RecordOrigin,
  onUpdate: (data: { records: PurchaseRecord[]; report: MappingReport; updatedAt?: string; isDemo?: boolean } | null) => void
): () => void {
  const datasetId = getDatasetId(origin);
  let lastSeenUpdatedAt: string | null = null;
  let isInitial = true;

  return onSnapshot(
    doc(db, 'datasets', datasetId),
    async (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }
      const meta = snapshot.data();
      const currentUpdatedAt = meta?.updatedAt || null;

      // Ignora o primeiro disparo no mount para evitar sobreposição com initializeFromFirestore
      if (isInitial) {
        isInitial = false;
        lastSeenUpdatedAt = currentUpdatedAt;
        return;
      }

      // Só recarrega se o timestamp realmente mudou após o carregamento inicial
      if (currentUpdatedAt && currentUpdatedAt !== lastSeenUpdatedAt) {
        lastSeenUpdatedAt = currentUpdatedAt;
        const freshData = await loadBaseDataFromFirestore(origin);
        if (freshData) {
          onUpdate(freshData);
        }
      }
    },
    (error) => {
      console.warn(`[Firestore] Listener em tempo real inativo para ${origin}:`, error.message);
    }
  );
}

/**
 * Remove a base do Firestore
 */
export async function clearBaseDataFromFirestore(origin: RecordOrigin): Promise<void> {
  const datasetId = getDatasetId(origin);

  try {
    const docSnap = await withTimeout(
      getDoc(doc(db, 'datasets', datasetId)),
      3000,
      'Timeout clear getDoc'
    );
    if (docSnap.exists()) {
      const chunksCount = docSnap.data().chunksCount || 0;
      if (chunksCount > 0) {
        await withTimeout(
          Promise.all(
            Array.from({ length: chunksCount }, (_, i) =>
              deleteDoc(doc(db, 'datasets', datasetId, 'chunks', `chunk_${i}`))
            )
          ),
          4000,
          'Timeout delete chunks'
        );
      }
    }
    await withTimeout(deleteDoc(doc(db, 'datasets', datasetId)), 3000, 'Timeout delete dataset doc');
  } catch (err: any) {
    if (isQuotaOrPermissionOrTimeoutError(err)) {
      console.warn(`[Firestore] Cota atingida ao excluir base ${origin} na nuvem.`);
      return;
    }
    console.warn(`[Firestore] Erro ao excluir base ${origin}:`, err);
  }
}

/**
 * Remove todas as bases persistidas no Firestore
 */
export async function clearAllFirestoreData(): Promise<void> {
  await Promise.all([
    clearBaseDataFromFirestore('Compras'),
    clearBaseDataFromFirestore('Serviços'),
  ]);
}
