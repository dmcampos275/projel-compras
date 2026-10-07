import { PurchaseRecord, MappingReport, RecordOrigin } from '../types/purchases';
import {
  saveBaseDataToFirestore,
  loadBaseDataFromFirestore,
  clearBaseDataFromFirestore,
  clearAllFirestoreData,
  SaveProgressCallback,
} from '../firebase/firestoreService';

const STORAGE_KEY_COMPRAS_DATA = 'projel_purchases_compras_records_v2';
const STORAGE_KEY_COMPRAS_REPORT = 'projel_purchases_compras_report_v2';
const STORAGE_KEY_SERVICOS_DATA = 'projel_purchases_servicos_records_v2';
const STORAGE_KEY_SERVICOS_REPORT = 'projel_purchases_servicos_report_v2';
const STORAGE_KEY_THEME = 'projel_dashboard_theme_v1';

/**
 * Salva apenas no armazenamento local (localStorage + sessionStorage) sem enviar para a nuvem
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
      console.warn(`Aviso ao persistir base ${origin} no cache do navegador:`, err);
    }
  }
}

/**
 * Salva base de dados no armazenamento local e sincroniza no Cloud Firestore (compartilhado com a empresa).
 * Retorna true se gravou no Firestore com sucesso.
 */
export async function saveBaseData(
  origin: RecordOrigin,
  records: PurchaseRecord[],
  report: MappingReport,
  syncToCloud = true,
  onProgress?: SaveProgressCallback
): Promise<boolean> {
  // 1. Sempre salva localmente primeiro para resposta imediata
  saveBaseDataLocal(origin, records, report);

  // 2. Se for solicitado e não for arquivo demo puro, persiste no Cloud Firestore
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
 * Carrega a base localmente (tenta sessionStorage primeiro, depois localStorage)
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
 * Carrega do Cloud Firestore com fallback instantâneo para o armazenamento persistente local
 */
export async function loadBaseDataAsync(
  origin: RecordOrigin
): Promise<{ records: PurchaseRecord[]; report: MappingReport; isDemo?: boolean } | null> {
  const localData = loadBaseData(origin);
  const isLocalReal = Boolean(localData && localData.report && !(localData.report.fileName || '').toLowerCase().includes('demo'));

  try {
    const firestoreData = await loadBaseDataFromFirestore(origin);
    if (firestoreData && firestoreData.records.length > 0) {
      const isFirestoreDemo = Boolean(firestoreData.isDemo || (firestoreData.report?.fileName || '').toLowerCase().includes('demo'));

      // Se o usuário tem planilha real no navegador, nunca substitui por demo vindo do Firestore
      if (isFirestoreDemo && isLocalReal) {
        console.log(`[Storage] Preservando planilha real de ${origin} gravada no navegador contra demo da nuvem.`);
        return localData;
      }

      // Atualiza o cache local persistente com os dados reais mais recentes
      saveBaseDataLocal(origin, firestoreData.records, firestoreData.report);
      return firestoreData;
    }
  } catch (err) {
    console.warn(`Falha ao carregar ${origin} do Firestore, recorrendo ao cache local:`, err);
  }

  return localData;
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
  }

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
