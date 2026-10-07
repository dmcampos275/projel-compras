import { PurchaseRecord, MappingReport, RecordOrigin } from '../types/purchases';
import {
  saveBaseDataToFirestore,
  loadBaseDataFromFirestore,
  clearBaseDataFromFirestore,
  clearAllFirestoreData,
  SaveProgressCallback,
} from '../firebase/firestoreService';
import {
  saveDatasetToIndexedDB,
  loadDatasetFromIndexedDB,
  clearDatasetFromIndexedDB,
} from './indexedDb';

const STORAGE_KEY_COMPRAS_DATA = 'projel_purchases_compras_records_v2';
const STORAGE_KEY_COMPRAS_REPORT = 'projel_purchases_compras_report_v2';
const STORAGE_KEY_SERVICOS_DATA = 'projel_purchases_servicos_records_v2';
const STORAGE_KEY_SERVICOS_REPORT = 'projel_purchases_servicos_report_v2';
const STORAGE_KEY_THEME = 'projel_dashboard_theme_v1';

/**
 * Salva a base no servidor Express corporativo para que qualquer pessoa
 * na empresa acesse os dados reais imediatamente.
 */
export async function saveToServer(
  origin: RecordOrigin,
  records: PurchaseRecord[],
  report: MappingReport
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const key = origin === 'Serviços' ? 'servicos' : 'compras';
    const res = await fetch(`/api/datasets/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, records, report }),
    });
    return res.ok;
  } catch (err) {
    console.warn(`[Servidor] Aviso ao persistir base ${origin} na API:`, err);
    return false;
  }
}

/**
 * Carrega a base do servidor Express corporativo.
 */
export async function loadFromServer(
  origin: RecordOrigin
): Promise<{ records: PurchaseRecord[]; report: MappingReport } | null> {
  if (typeof window === 'undefined') return null;
  try {
    const key = origin === 'Serviços' ? 'servicos' : 'compras';
    const res = await fetch(`/api/datasets/${key}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || !Array.isArray(data.records) || data.records.length === 0) return null;

    const records: PurchaseRecord[] = data.records.map((r: any) => ({
      ...r,
      origin: r.origin || origin,
      issueDate: r.issueDate ? new Date(r.issueDate) : null,
      deliveryDate: r.deliveryDate ? new Date(r.deliveryDate) : null,
      quoteDate: r.quoteDate ? new Date(r.quoteDate) : null,
    }));

    return { records, report: data.report };
  } catch {
    return null;
  }
}

/**
 * Salva apenas no armazenamento local imediato (localStorage + sessionStorage)
 */
export function saveBaseDataLocal(origin: RecordOrigin, records: PurchaseRecord[], report: MappingReport): void {
  const dataKey = origin === 'Serviços' ? STORAGE_KEY_SERVICOS_DATA : STORAGE_KEY_COMPRAS_DATA;
  const reportKey = origin === 'Serviços' ? STORAGE_KEY_SERVICOS_REPORT : STORAGE_KEY_COMPRAS_REPORT;

  if (typeof window !== 'undefined') {
    try {
      const serializedRecords = JSON.stringify(records);
      const serializedReport = JSON.stringify(report);
      window.sessionStorage.setItem(dataKey, serializedRecords);
      window.sessionStorage.setItem(reportKey, serializedReport);
      window.localStorage.setItem(dataKey, serializedRecords);
      window.localStorage.setItem(reportKey, serializedReport);
    } catch (err) {
      console.warn(`Aviso ao persistir base ${origin} no localStorage:`, err);
    }
  }

  // Também grava no IndexedDB para garantir que ultrapasse qualquer limite de 5MB do localStorage
  saveDatasetToIndexedDB(origin, records, report).catch(console.warn);
}

/**
 * Salva base de dados com tripla garantia:
 * 1. IndexedDB + LocalStorage (permanente no navegador do usuário)
 * 2. API do Servidor (compartilhada com qualquer pessoa da empresa no ar)
 * 3. Cloud Firestore (banco em tempo real do Firebase)
 */
export async function saveBaseData(
  origin: RecordOrigin,
  records: PurchaseRecord[],
  report: MappingReport,
  syncToCloud = true,
  onProgress?: SaveProgressCallback
): Promise<boolean> {
  // 1. Sempre salva localmente e no IndexedDB primeiro para resposta instantânea
  saveBaseDataLocal(origin, records, report);

  // 2. Persiste na API do Servidor para compartilhamento instantâneo entre todos os colaboradores
  saveToServer(origin, records, report).catch(console.warn);

  // 3. Persiste no Cloud Firestore
  if (syncToCloud) {
    try {
      const cloudSuccess = await saveBaseDataToFirestore(origin, records, report, onProgress);
      return cloudSuccess;
    } catch (err) {
      console.warn(`Aviso ao sincronizar base ${origin} com Firestore:`, err);
      return false;
    }
  }

  return true;
}

/**
 * Carrega a base localmente (localStorage / sessionStorage)
 */
export function loadBaseData(origin: RecordOrigin): { records: PurchaseRecord[]; report: MappingReport } | null {
  const dataKey = origin === 'Serviços' ? STORAGE_KEY_SERVICOS_DATA : STORAGE_KEY_COMPRAS_DATA;
  const reportKey = origin === 'Serviços' ? STORAGE_KEY_SERVICOS_REPORT : STORAGE_KEY_COMPRAS_REPORT;

  if (typeof window === 'undefined') return null;

  try {
    const rawData = window.sessionStorage.getItem(dataKey) || window.localStorage.getItem(dataKey);
    const rawReport = window.sessionStorage.getItem(reportKey) || window.localStorage.getItem(reportKey);
    if (!rawData || !rawReport) return null;

    const parsedRecords = JSON.parse(rawData);
    const parsedReport = JSON.parse(rawReport);

    const records: PurchaseRecord[] = parsedRecords.map((r: PurchaseRecord) => ({
      ...r,
      origin: r.origin || origin,
      issueDate: r.issueDate ? new Date(r.issueDate) : null,
      deliveryDate: r.deliveryDate ? new Date(r.deliveryDate) : null,
      quoteDate: r.quoteDate ? new Date(r.quoteDate) : null,
    }));

    return { records, report: parsedReport };
  } catch (err) {
    console.warn(`Erro ao carregar base ${origin} do armazenamento local:`, err);
    return null;
  }
}

/**
 * Carregamento resiliente:
 * Consulta o Servidor Corporativo, o Firebase Firestore, o IndexedDB e o LocalStorage.
 * Garante que dados reais NUNCA sejam perdidos ao recarregar a página com F5.
 */
export async function loadBaseDataAsync(
  origin: RecordOrigin
): Promise<{ records: PurchaseRecord[]; report: MappingReport; isDemo?: boolean } | null> {
  // 1. Tenta carregar do Servidor Central (disponível para todos os usuários da empresa)
  const serverData = await loadFromServer(origin);
  if (serverData && serverData.records.length > 0) {
    const isServerDemo = Boolean((serverData.report?.fileName || '').toLowerCase().includes('demo'));
    if (!isServerDemo) {
      saveBaseDataLocal(origin, serverData.records, serverData.report);
      return serverData;
    }
  }

  // 2. Tenta carregar do Cloud Firestore
  try {
    const firestoreData = await loadBaseDataFromFirestore(origin);
    if (firestoreData && firestoreData.records.length > 0) {
      const isFirestoreDemo = Boolean(firestoreData.isDemo || (firestoreData.report?.fileName || '').toLowerCase().includes('demo'));
      if (!isFirestoreDemo) {
        saveBaseDataLocal(origin, firestoreData.records, firestoreData.report);
        saveToServer(origin, firestoreData.records, firestoreData.report).catch(console.warn);
        return firestoreData;
      }
    }
  } catch (err) {
    console.warn(`Falha ao carregar ${origin} do Firestore:`, err);
  }

  // 3. Tenta carregar do IndexedDB permanente (capacidade ilimitada no navegador)
  const idbData = await loadDatasetFromIndexedDB(origin);
  if (idbData && idbData.records.length > 0) {
    const isIdbDemo = Boolean((idbData.report?.fileName || '').toLowerCase().includes('demo'));
    if (!isIdbDemo) {
      saveToServer(origin, idbData.records, idbData.report).catch(console.warn);
      return idbData;
    }
  }

  // 4. Tenta carregar do LocalStorage
  const localData = loadBaseData(origin);
  if (localData && localData.records.length > 0) {
    const isLocalDemo = Boolean((localData.report?.fileName || '').toLowerCase().includes('demo'));
    if (!isLocalDemo) {
      saveToServer(origin, localData.records, localData.report).catch(console.warn);
      return localData;
    }
  }

  // 5. Se nenhuma versão real foi encontrada, retorna o que houver (servidor, local ou null)
  if (serverData && serverData.records.length > 0) return serverData;
  if (idbData && idbData.records.length > 0) return idbData;
  if (localData && localData.records.length > 0) return localData;

  return null;
}

export function clearBaseData(origin: RecordOrigin): void {
  const dataKey = origin === 'Serviços' ? STORAGE_KEY_SERVICOS_DATA : STORAGE_KEY_COMPRAS_DATA;
  const reportKey = origin === 'Serviços' ? STORAGE_KEY_SERVICOS_REPORT : STORAGE_KEY_COMPRAS_REPORT;

  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(dataKey);
      window.sessionStorage.removeItem(reportKey);
      window.localStorage.removeItem(dataKey);
      window.localStorage.removeItem(reportKey);
    } catch (err) {
      console.warn(err);
    }

    const key = origin === 'Serviços' ? 'servicos' : 'compras';
    fetch(`/api/datasets/${key}`, { method: 'DELETE' }).catch(console.warn);
  }

  clearDatasetFromIndexedDB(origin).catch(console.warn);
  clearBaseDataFromFirestore(origin).catch(console.warn);
}

export function clearAllSavedData(): void {
  clearBaseData('Compras');
  clearBaseData('Serviços');
  clearAllFirestoreData().catch(console.warn);
}

export function saveThemePreference(theme: 'light' | 'dark'): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_THEME, theme);
  } catch (e) {
    console.warn(e);
  }
}

export function loadThemePreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch (e) {
    console.warn(e);
  }
  return 'light';
}

export {
  saveBaseDataToFirestore,
  loadBaseDataFromFirestore,
  clearBaseDataFromFirestore,
  clearAllFirestoreData,
};
