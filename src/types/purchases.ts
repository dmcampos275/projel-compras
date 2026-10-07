export type RecordOrigin = 'Compras' | 'Serviços';
export type OriginFilter = 'Compras' | 'Serviços' | 'Consolidado';

export interface PurchaseRecord {
  id: string;
  origin: RecordOrigin;
  branch: string;
  orderNumber: string;
  seq: number | string;
  status: string;
  statusGroup: 'Aberta' | 'Parcialmente Atendida' | 'Atendida/Encerrada' | 'Cancelada' | 'Outros';
  reason: string;
  reasonDescription: string;
  service: string;
  descriptionComplement: string;
  itemDescription: string;
  family: string;
  unit: string;
  supplier: string;
  cleanSupplier?: string;
  rawSupplier?: string;
  supplierCode?: string;
  supplierTradeName: string;
  supplierGroup: string;
  supplierState: string;
  qtyRequested: number;
  qtyCancelled: number;
  qtyOpen: number;
  qtyReceived: number;
  unitPrice: number;
  itemValue: number;
  netValue: number;
  grossCalculatedValue?: number;
  openValue: number;
  cancelledValue: number;
  discountValue: number;
  discountPercent: number;
  ipiValue: number;
  icmsValue: number;
  issValue: number;
  inssValue: number;
  // Retenções específicas de serviços e compras
  irrfValue: number;
  pisValue: number;
  cofinsValue: number;
  csllValue: number;
  issueDate: Date | null;
  issueDateStr: string;
  deliveryDate: Date | null;
  deliveryDateStr: string;
  quoteDate: Date | null;
  leadTimeDays: number;
  isDelayed: boolean;
  delayDays: number;
  costCenter: string;
  costCenterAbbr: string;
  financialAccount: string;
  financialAccountAbbr: string;
  accountingAccount: string;
  accountingAccountAbbr: string;
  buyer: string;
  creator: string;
  deliveryCity: string;
  deliveryState: string;
  currency: string;
  currencyDesc: string;
}

export interface ColumnMappingDefinition {
  field: keyof PurchaseRecord | string;
  label: string;
  required: boolean;
  aliases: string[];
}

export type CalculationBasis = 'net' | 'item' | 'calc';

export interface ColumnReconciliation {
  sumNetValue: number;
  sumItemValue: number;
  sumCalculatedPriceQty: number;
  sumOpenValue: number;
  sumCancelledValue: number;
  sumDiscount: number;
  sumActiveNetValue: number;
  sumActiveItemValue: number;
  hasNetValueColumn: boolean;
  hasItemValueColumn: boolean;
  hasUnitPriceColumn: boolean;
  discrepantRowsCount: number;
}

export interface MappingReport {
  totalRows: number;
  recognizedColumns: {
    canonical: string;
    matchedHeader: string;
    label: string;
    required: boolean;
  }[];
  missingEssentialColumns: string[];
  unmatchedHeaders: string[];
  sampleProcessed: boolean;
  fileName: string;
  baseName: RecordOrigin;
  loadTimestamp: string;
  orderDiscrepancyWarning?: string;
  columnOrderNotice?: string;
  reconciliation?: ColumnReconciliation;
}

export interface FilterState {
  dateRange: {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
  };
  branches: string[];
  suppliers: string[];
  families: string[];
  costCenters: string[];
  buyers: string[];
  statuses: string[];
  supplierStates: string[];
  calculationBasis?: CalculationBasis;
  excludeCancelledFromTotal?: boolean;
}

export interface KPIData {
  totalValue: number;
  totalNetValue: number;
  totalItemValue: number;
  totalGrossCalculated: number;
  totalValidOrdersValue: number;
  calculationBasis: CalculationBasis;
  excludeCancelled: boolean;
  uniqueOrdersCount: number;
  totalItemsCount: number;
  averageTicket: number;
  activeSuppliersCount: number;
  openValue: number;
  openValuePercent: number;
  cancelledValue: number;
  cancelledValuePercent: number;
  totalDiscount: number;
  discountPercent: number;
  averageLeadTimeDays: number;
  onTimePercent: number;
  delayedCount: number;
  delayedPercent: number;
  // Retenções totais
  totalRetentions?: number;
  totalISS?: number;
  totalINSS?: number;
  totalIRRF?: number;
  totalPIS?: number;
  totalCOFINS?: number;
  totalCSLL?: number;
  // Variações em relação ao mês anterior (MoM em %)
  momVariations: {
    totalValue?: number | null;
    uniqueOrdersCount?: number | null;
    totalItemsCount?: number | null;
    averageTicket?: number | null;
    activeSuppliersCount?: number | null;
    openValue?: number | null;
    cancelledValue?: number | null;
    totalDiscount?: number | null;
    averageLeadTimeDays?: number | null;
    onTimePercent?: number | null;
  };
}

export type ActiveTab =
  | 'overview'
  | 'suppliers'
  | 'families'
  | 'costCenters'
  | 'leadTimes'
  | 'buyers'
  | 'services'
  | 'comparison'
  | 'details';

export interface CrossFilterAction {
  type: keyof FilterState;
  value: string;
  label?: string;
}
