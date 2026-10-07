import { PurchaseRecord, MappingReport, RecordOrigin } from '../types/purchases';
import {
  saveBaseDataToFirestore,
  loadBaseDataFromFirestore,
  clearBaseDataFromFirestore,
  clearAllFirestoreData,
} from '../firebase/firestoreService';

const STORAGE_KEY_COMPRAS_DATA = 'projel_purchases_compras_records_v2';
const STORAGE_KEY_COMPRAS_REPORT = 'projel_purchases_compras_report_v2';
const STORAGE_KEY_SERVICOS_DATA = 'projel_purchases_servicos_records_v2';
const STORAGE_KEY_SERVICOS_REPORT = 'projel_purchases_servicos_report_v2';
const STORAGE_KEY_THEME = 'projel_dashboard_theme_v1';

/**
 * Salva base de dados tanto no Firestore (nuvem) quanto no cache local de sessão
 */
export function saveBaseData(origin: RecordOrigin, records: PurchaseRecord[], report: MappingReport): void {
  // 1. Salva em cache local para resposta imediata
  try {
    const dataKey = origin === 'Serviços' ? STORAGE_KEY_SERVICOS_DATA : STORAGE_KEY_COMPRAS_DATA;
    const reportKey = origin === 'Serviços' ? STORAGE_KEY_SERVICOS_REPORT : STORAGE_KEY_COMPRAS_REPORT;

    sessionStorage.setItem(dataKey, JSON.stringify(records));
    sessionStorage.setItem(reportKey, JSON.stringify(report));
  } catch (err) {
    console.warn(`Não foi possível persistir base ${origin} no sessionStorage:`, err);
  }

  // 2. Persiste de forma assíncrona no Cloud Firestore
  saveBaseDataToFirestore(origin, records, report).catch((err) => {
    console.warn(`Falha ao sincronizar base ${origin} com o Firestore:`, err);
  });
}

/**
 * Carrega a base local do sessionStorage (rápido)
 */
export function loadBaseData(origin: RecordOrigin): { records: PurchaseRecord[]; report: MappingReport } | null {
  try {
    const dataKey = origin === 'Serviços' ? STORAGE_KEY_SERVICOS_DATA : STORAGE_KEY_COMPRAS_DATA;
    const reportKey = origin === 'Serviços' ? STORAGE_KEY_SERVICOS_REPORT : STORAGE_KEY_COMPRAS_REPORT;

    const rawData = sessionStorage.getItem(dataKey);
    const rawReport = sessionStorage.getItem(reportKey);
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
    console.warn(`Erro ao carregar base ${origin} da sessão:`, err);
    return null;
  }
}

/**
 * Carrega do Cloud Firestore com fallback para o cache local
 */
export async function loadBaseDataAsync(
  origin: RecordOrigin
): Promise<{ records: PurchaseRecord[]; report: MappingReport } | null> {
  try {
    const firestoreData = await loadBaseDataFromFirestore(origin);
    if (firestoreData && firestoreData.records.length > 0) {
      // Atualiza cache de sessão com dados do Firestore
      try {
        const dataKey = origin === 'Serviços' ? STORAGE_KEY_SERVICOS_DATA : STORAGE_KEY_COMPRAS_DATA;
        const reportKey = origin === 'Serviços' ? STORAGE_KEY_SERVICOS_REPORT : STORAGE_KEY_COMPRAS_REPORT;
        sessionStorage.setItem(dataKey, JSON.stringify(firestoreData.records));
        sessionStorage.setItem(reportKey, JSON.stringify(firestoreData.report));
      } catch {}
      return firestoreData;
    }
  } catch (err) {
    console.warn(`Falha ao carregar ${origin} do Firestore, usando fallback local:`, err);
  }

  return loadBaseData(origin);
}

export function clearBaseData(origin: RecordOrigin): void {
  try {
    const dataKey = origin === 'Serviços' ? STORAGE_KEY_SERVICOS_DATA : STORAGE_KEY_COMPRAS_DATA;
    const reportKey = origin === 'Serviços' ? STORAGE_KEY_SERVICOS_REPORT : STORAGE_KEY_COMPRAS_REPORT;
    sessionStorage.removeItem(dataKey);
    sessionStorage.removeItem(reportKey);
  } catch (err) {
    console.warn(err);
  }

  clearBaseDataFromFirestore(origin).catch(console.warn);
}

export function clearAllSavedData(): void {
  clearBaseData('Compras');
  clearBaseData('Serviços');
  clearAllFirestoreData().catch(console.warn);
}

export function saveThemePreference(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
  } catch (e) {
    console.warn(e);
  }
}

export function loadThemePreference(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch (e) {
    console.warn(e);
  }
  return 'light';
}

export function saveSessionPurchases(
  records: PurchaseRecord[],
  report: MappingReport,
  origin: RecordOrigin = 'Compras'
): void {
  saveBaseData(origin, records, report);
}

export function loadSessionPurchases(
  origin: RecordOrigin = 'Compras'
): { records: PurchaseRecord[]; report: MappingReport } | null {
  return loadBaseData(origin);
}

export {
  saveBaseDataToFirestore,
  loadBaseDataFromFirestore,
  clearBaseDataFromFirestore,
  clearAllFirestoreData,
};
