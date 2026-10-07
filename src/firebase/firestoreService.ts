import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from './config';
import { PurchaseRecord, MappingReport, RecordOrigin } from '../types/purchases';

const CHUNK_SIZE = 150;

/**
 * Sanitiza objetos para o Firestore (substitui undefined por null ou remove, converte Date em ISO string)
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

function getDatasetId(origin: RecordOrigin): 'compras' | 'servicos' {
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

/**
 * Salva a base completa (comprasRecords ou servicosRecords) no Firestore de forma particionada e persistente.
 * Retorna true se salvou na nuvem, ou false se a cota gratuita do Firebase foi atingida.
 */
export async function saveBaseDataToFirestore(
  origin: RecordOrigin,
  records: PurchaseRecord[],
  report: MappingReport
): Promise<boolean> {
  const datasetId = getDatasetId(origin);
  const datasetDocPath = `datasets/${datasetId}`;

  try {
    const sanitizedRecords = records.map(sanitizeRecordForFirestore);
    const totalChunks = Math.ceil(sanitizedRecords.length / CHUNK_SIZE);

    // 1. Grava as partições (chunks)
    for (let i = 0; i < totalChunks; i++) {
      const chunkRecords = sanitizedRecords.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkPath = `datasets/${datasetId}/chunks/chunk_${i}`;

      try {
        await setDoc(doc(db, 'datasets', datasetId, 'chunks', `chunk_${i}`), {
          id: `chunk_${i}`,
          datasetId,
          chunkIndex: i,
          count: chunkRecords.length,
          records: chunkRecords,
          updatedAt: new Date().toISOString(),
        });
      } catch (chunkErr: any) {
        if (isQuotaOrPermissionError(chunkErr)) {
          console.warn(
            `[Firestore] Cota diária gratuita atingida ou permissão ao gravar chunk ${i}. Dados salvos localmente no navegador.`
          );
          return false;
        }
        handleFirestoreError(chunkErr, OperationType.WRITE, chunkPath);
      }
    }

    // 2. Limpa partições antigas que possam ter sobrado se o novo arquivo tiver menos linhas
    try {
      const existingChunksSnapshot = await getDocs(collection(db, 'datasets', datasetId, 'chunks'));
      for (const chunkDoc of existingChunksSnapshot.docs) {
        const data = chunkDoc.data();
        if (typeof data.chunkIndex === 'number' && data.chunkIndex >= totalChunks) {
          await deleteDoc(chunkDoc.ref);
        }
      }
    } catch {
      // Ignora erro não crítico de limpeza de chunks órfãos
    }

    // 3. Grava o documento principal de metadados da base
    const metadataPayload = {
      id: datasetId,
      origin,
      fileName: report.fileName,
      loadTimestamp: report.loadTimestamp,
      totalRows: records.length,
      chunksCount: totalChunks,
      report: JSON.parse(JSON.stringify(report)), // sanitiza undefined do report
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'datasets', datasetId), metadataPayload);
    return true;
  } catch (err: any) {
    if (isQuotaOrPermissionError(err)) {
      console.warn(
        `[Firestore] Cota diária de gravação gratuita do Firebase atingida para ${origin}. Os dados permanecem seguros no cache persistente local.`
      );
      return false;
    }
    handleFirestoreError(err, OperationType.WRITE, datasetDocPath);
    return false;
  }
}

/**
 * Carrega a base completa do Firestore. Retorna null se não houver dados ou se a cota do Firebase foi atingida.
 */
export async function loadBaseDataFromFirestore(
  origin: RecordOrigin
): Promise<{ records: PurchaseRecord[]; report: MappingReport } | null> {
  const datasetId = getDatasetId(origin);
  const datasetDocPath = `datasets/${datasetId}`;

  try {
    const docSnap = await getDoc(doc(db, 'datasets', datasetId));
    if (!docSnap.exists()) {
      return null;
    }

    const metadata = docSnap.data();
    const chunksSnapshot = await getDocs(collection(db, 'datasets', datasetId, 'chunks'));

    if (chunksSnapshot.empty) {
      return null;
    }

    // Ordena os chunks sequencialmente pelo chunkIndex
    const sortedChunkDocs = chunksSnapshot.docs
      .map((d) => d.data())
      .sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0));

    const allRecords: PurchaseRecord[] = [];
    for (const chunkData of sortedChunkDocs) {
      if (Array.isArray(chunkData.records)) {
        for (const raw of chunkData.records) {
          allRecords.push(deserializeFirestoreRecord(raw, origin));
        }
      }
    }

    return {
      records: allRecords,
      report: metadata.report as MappingReport,
    };
  } catch (err: any) {
    if (isQuotaOrPermissionError(err)) {
      console.warn(
        `[Firestore] Cota de leitura/gravação atingida ou offline para base ${origin}. O sistema operará com os dados locais salvos.`
      );
      return null;
    }
    // Não interrompe o boot da aplicação se o Firestore estiver com indisponibilidade
    console.warn(`[Firestore] Aviso ao carregar base ${origin} do Firestore:`, err);
    return null;
  }
}

/**
 * Remove a base do Firestore
 */
export async function clearBaseDataFromFirestore(origin: RecordOrigin): Promise<void> {
  const datasetId = getDatasetId(origin);
  const datasetDocPath = `datasets/${datasetId}`;

  try {
    const chunksSnapshot = await getDocs(collection(db, 'datasets', datasetId, 'chunks'));
    for (const chunkDoc of chunksSnapshot.docs) {
      await deleteDoc(chunkDoc.ref);
    }
    await deleteDoc(doc(db, 'datasets', datasetId));
  } catch (err: any) {
    if (isQuotaOrPermissionError(err)) {
      console.warn(`[Firestore] Cota atingida ao excluir base ${origin} na nuvem.`);
      return;
    }
    handleFirestoreError(err, OperationType.DELETE, datasetDocPath);
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
