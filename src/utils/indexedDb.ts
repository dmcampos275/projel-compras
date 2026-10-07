import { PurchaseRecord, MappingReport, RecordOrigin } from '../types/purchases';

const DB_NAME = 'projel_purchases_db';
const DB_VERSION = 1;
const STORE_NAME = 'datasets';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB não suportado no ambiente'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface StoredDataset {
  id: string; // 'compras' | 'servicos'
  origin: RecordOrigin;
  records: PurchaseRecord[];
  report: MappingReport;
  updatedAt: string;
}

export async function saveDatasetToIndexedDB(
  origin: RecordOrigin,
  records: PurchaseRecord[],
  report: MappingReport
): Promise<boolean> {
  try {
    const db = await openDB();
    const id = origin === 'Serviços' ? 'servicos' : 'compras';

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const entry: StoredDataset = {
        id,
        origin,
        records,
        report,
        updatedAt: new Date().toISOString(),
      };

      const req = store.put(entry);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Falha ao gravar base ${origin}:`, err);
    return false;
  }
}

export async function loadDatasetFromIndexedDB(
  origin: RecordOrigin
): Promise<{ records: PurchaseRecord[]; report: MappingReport } | null> {
  try {
    const db = await openDB();
    const id = origin === 'Serviços' ? 'servicos' : 'compras';

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const result = req.result as StoredDataset | undefined;
        if (!result || !result.records || result.records.length === 0) {
          return resolve(null);
        }

        const restoredRecords = result.records.map((r: PurchaseRecord) => ({
          ...r,
          origin: r.origin || origin,
          issueDate: r.issueDate ? new Date(r.issueDate) : null,
          deliveryDate: r.deliveryDate ? new Date(r.deliveryDate) : null,
          quoteDate: r.quoteDate ? new Date(r.quoteDate) : null,
        }));

        resolve({
          records: restoredRecords,
          report: result.report,
        });
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Falha ao ler base ${origin}:`, err);
    return null;
  }
}

export async function clearDatasetFromIndexedDB(origin: RecordOrigin): Promise<void> {
  try {
    const db = await openDB();
    const id = origin === 'Serviços' ? 'servicos' : 'compras';

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn(`[IndexedDB] Falha ao limpar base ${origin}:`, err);
  }
}
