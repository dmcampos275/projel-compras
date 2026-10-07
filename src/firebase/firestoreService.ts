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

const CHUNK_SIZE = 250;

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

function isQuotaOrPermissionError(err: any): boolean {
  if (!err) return false;
  const msg = err.message || String(err);
  const code = err.code || '';
  return (
    code === 'resource-exhausted' ||
    code === 'permission-denied' ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Free daily write units') ||
    msg.includes('Missing or insufficient permissions')
  );
}

export interface SaveProgressCallback {
  (progress: { step: string; percent: number; savedChunks: number; totalChunks: number }): void;
}

/**
 * Salva a base completa (Produtos/Compras ou Serviços) no Firestore de forma particionada,
 * persistente e compartilhada com toda a empresa.
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
    const totalChunks = Math.ceil(sanitizedRecords.length / CHUNK_SIZE);

    onProgress?.({
      step: `Preparando ${records.length.toLocaleString('pt-BR')} registros em ${totalChunks} pacotes...`,
      percent: 10,
      savedChunks: 0,
      totalChunks,
    });

    // 1. Grava os chunks em lotes controlados (4 chunks simultâneos para rapidez sem estourar limites)
    const BATCH_CONCURRENCY = 4;
    let savedChunks = 0;

    for (let i = 0; i < totalChunks; i += BATCH_CONCURRENCY) {
      const batchIndices: number[] = [];
      for (let j = i; j < Math.min(i + BATCH_CONCURRENCY, totalChunks); j++) {
        batchIndices.push(j);
      }

      await Promise.all(
        batchIndices.map(async (chunkIdx) => {
          const chunkRecords = sanitizedRecords.slice(
            chunkIdx * CHUNK_SIZE,
            (chunkIdx + 1) * CHUNK_SIZE
          );
          const chunkPath = `datasets/${datasetId}/chunks/chunk_${chunkIdx}`;

          try {
            await setDoc(doc(db, 'datasets', datasetId, 'chunks', `chunk_${chunkIdx}`), {
              id: `chunk_${chunkIdx}`,
              datasetId,
              chunkIndex: chunkIdx,
              count: chunkRecords.length,
              records: chunkRecords,
              updatedAt: new Date().toISOString(),
            });
          } catch (chunkErr: any) {
            if (isQuotaOrPermissionError(chunkErr)) {
              console.warn(
                `[Firestore] Cota diária gratuita ou permissão ao gravar chunk ${chunkIdx}. Dados mantidos localmente.`
              );
              throw chunkErr;
            }
            handleFirestoreError(chunkErr, OperationType.WRITE, chunkPath);
          }
        })
      );

      savedChunks += batchIndices.length;
      const progressPercent = 10 + Math.round((savedChunks / totalChunks) * 75);
      onProgress?.({
        step: `Gravando no Firebase Firestore (${savedChunks}/${totalChunks} pacotes)...`,
        percent: progressPercent,
        savedChunks,
        totalChunks,
      });
    }

    // 2. Limpa partições antigas remanescentes se a planilha nova tiver menos registros
    try {
      const existingChunksSnapshot = await getDocs(collection(db, 'datasets', datasetId, 'chunks'));
      const deletePromises: Promise<void>[] = [];
      for (const chunkDoc of existingChunksSnapshot.docs) {
        const data = chunkDoc.data();
        if (typeof data.chunkIndex === 'number' && data.chunkIndex >= totalChunks) {
          deletePromises.push(deleteDoc(chunkDoc.ref));
        }
      }
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
      }
    } catch {
      // Ignora falha não crítica de limpeza
    }

    // 3. Grava o documento principal de metadados da base
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

    await setDoc(doc(db, 'datasets', datasetId), metadataPayload);

    onProgress?.({
      step: 'Concluído com sucesso!',
      percent: 100,
      savedChunks: totalChunks,
      totalChunks,
    });

    return true;
  } catch (err: any) {
    if (isQuotaOrPermissionError(err)) {
      console.warn(
        `[Firestore] Cota diária do Firebase atingida para ${origin}. Os dados permanecem seguros no cache persistente local do navegador.`
      );
      return false;
    }
    console.error(`[Firestore] Erro ao salvar base ${origin}:`, err);
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
    const docSnap = await getDoc(doc(db, 'datasets', datasetId));
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
      const chunkSnaps = await Promise.all(chunkPromises);
      for (const s of chunkSnaps) {
        if (s.exists()) {
          chunkDataList.push(s.data());
        }
      }
    } else {
      // Fallback para getDocs caso legados não possuam chunksCount
      const chunksSnapshot = await getDocs(collection(db, 'datasets', datasetId, 'chunks'));
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
    if (isQuotaOrPermissionError(err)) {
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

  return onSnapshot(
    doc(db, 'datasets', datasetId),
    async (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }
      const meta = snapshot.data();
      const currentUpdatedAt = meta?.updatedAt || null;

      // Só recarrega se o timestamp mudou
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
    const docSnap = await getDoc(doc(db, 'datasets', datasetId));
    if (docSnap.exists()) {
      const chunksCount = docSnap.data().chunksCount || 0;
      if (chunksCount > 0) {
        await Promise.all(
          Array.from({ length: chunksCount }, (_, i) =>
            deleteDoc(doc(db, 'datasets', datasetId, 'chunks', `chunk_${i}`))
          )
        );
      }
    }
    await deleteDoc(doc(db, 'datasets', datasetId));
  } catch (err: any) {
    if (isQuotaOrPermissionError(err)) {
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
