import * as XLSX from 'xlsx';
import { PurchaseRecord, MappingReport, RecordOrigin, ColumnReconciliation } from '../types/purchases';
import { matchHeadersToColumns, checkColumnOrderNotice } from './columnMapping';
import {
  parseExcelDate,
  parseExcelNumber,
  formatDate,
  classifyStatusGroup,
  extractSupplierDetails,
} from './formatters';

export interface ParseResult {
  records: PurchaseRecord[];
  report: MappingReport;
}

/**
 * Garante que todo o range da planilha seja lido, corrigindo !ref truncados por exportadores de ERP
 */
function ensureFullSheetRange(worksheet: XLSX.WorkSheet) {
  if (!worksheet) return;
  let minR = Infinity, maxR = -Infinity;
  let minC = Infinity, maxC = -Infinity;

  for (const cell in worksheet) {
    if (cell.startsWith('!')) continue;
    try {
      const decoded = XLSX.utils.decode_cell(cell);
      if (decoded.r < minR) minR = decoded.r;
      if (decoded.r > maxR) maxR = decoded.r;
      if (decoded.c < minC) minC = decoded.c;
      if (decoded.c > maxC) maxC = decoded.c;
    } catch {
      // ignora células com formato não padrão
    }
  }

  if (minR !== Infinity && maxR >= minR && minC !== Infinity && maxC >= minC) {
    worksheet['!ref'] = XLSX.utils.encode_range({
      s: { r: minR, c: minC },
      e: { r: maxR, c: maxC },
    });
  }
}

/**
 * Lê e analisa a planilha Excel (.xlsx, .xls ou .csv) 100% no navegador
 * Suporta separação por Origem ('Compras' ou 'Serviços')
 */
export async function parsePurchasesFile(
  file: File | ArrayBuffer,
  fileName = 'planilha.xlsx',
  origin: RecordOrigin = 'Compras',
  customOverrides?: Record<string, string>,
  otherBaseHeaders?: string[]
): Promise<ParseResult> {
  let dataBuffer: ArrayBuffer;
  if (file instanceof File) {
    dataBuffer = await file.arrayBuffer();
  } else {
    dataBuffer = file;
  }

  // Leitura com SheetJS
  const workbook = XLSX.read(dataBuffer, {
    type: 'array',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('A planilha enviada não contém nenhuma aba válida.');
  }

  // Identifica a aba com maior número de dados (evita ler abas de capa/resumo vazias)
  let targetSheetName = workbook.SheetNames[0];
  let maxCellCount = 0;

  for (const sName of workbook.SheetNames) {
    const ws = workbook.Sheets[sName];
    if (ws) {
      ensureFullSheetRange(ws);
      const cellCount = Object.keys(ws).filter((k) => !k.startsWith('!')).length;
      if (cellCount > maxCellCount) {
        maxCellCount = cellCount;
        targetSheetName = sName;
      }
    }
  }

  const worksheet = workbook.Sheets[targetSheetName];
  ensureFullSheetRange(worksheet);

  // Converte a aba em matriz de dados com cabeçalhos
  const rawData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rawData.length === 0) {
    throw new Error('A planilha está vazia.');
  }

  // Regra: Detectar automaticamente a linha de cabeçalho (primeira linha com pelo menos 5 nomes de colunas esperados)
  let headerRowIndex = 0;
  let maxMatchedCount = 0;
  let headers: string[] = (rawData[0] || []).map((c) => String(c || '').trim());

  const maxScanRows = Math.min(30, rawData.length);
  for (let r = 0; r < maxScanRows; r++) {
    const row = rawData[r];
    if (!Array.isArray(row)) continue;
    const stringCells = row.map((cell) => String(cell || '').trim());
    const nonEmpty = stringCells.filter((c) => c.length > 0);
    if (nonEmpty.length >= 3) {
      const matchTest = matchHeadersToColumns(stringCells, customOverrides);
      if (matchTest.matchedDetails.length >= 5 && matchTest.matchedDetails.length > maxMatchedCount) {
        maxMatchedCount = matchTest.matchedDetails.length;
        headerRowIndex = r;
        headers = stringCells;
      } else if (matchTest.matchedDetails.length > maxMatchedCount && maxMatchedCount < 5) {
        maxMatchedCount = matchTest.matchedDetails.length;
        headerRowIndex = r;
        headers = stringCells;
      }
    }
  }

  const headerAnalysis = matchHeadersToColumns(headers, customOverrides);

  // Cria índice por nome da coluna correspondente
  const colIndexMap = new Map<string, number>();
  headers.forEach((h, idx) => {
    colIndexMap.set(h, idx);
  });

  const getRowVal = (row: unknown[], canonicalKey: string): unknown => {
    const rawHeader = headerAnalysis.matchedMap.get(canonicalKey);
    if (!rawHeader) return '';
    const idx = colIndexMap.get(rawHeader);
    if (idx === undefined || idx < 0 || idx >= row.length) return '';
    return row[idx];
  };

  const records: PurchaseRecord[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Variáveis para preenchimento de células mescladas contíguas do ERP
  let lastOrderNumber = '';
  let lastBranch = 'Matriz';
  let lastSupplier = '';
  let lastSupplierTradeName = '';
  let lastSupplierGroup = 'Geral';
  let lastSupplierState = 'SP';
  let lastIssueDate: Date | null = null;

  for (let r = headerRowIndex + 1; r < rawData.length; r++) {
    const row = rawData[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    // Se toda a linha for vazia, ignora
    const hasData = row.some((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (!hasData) continue;

    // Detecção segura de linha de subtotal / resumo geral
    const firstCell = String(row[0] || '').toLowerCase().trim();
    const rawOrderCell = String(getRowVal(row, 'orderNumber') || '').toLowerCase().trim();
    if (
      firstCell.startsWith('total geral') ||
      firstCell.startsWith('subtotal') ||
      rawOrderCell === 'total' ||
      rawOrderCell === 'subtotal' ||
      rawOrderCell.startsWith('total geral')
    ) {
      continue;
    }

    let orderNumber = String(getRowVal(row, 'orderNumber') || '').trim();
    let branch = String(getRowVal(row, 'branch') || '').trim();
    const seq = getRowVal(row, 'seq') !== '' ? getRowVal(row, 'seq') : r;
    const rawStatus = String(getRowVal(row, 'status') || '').trim() || 'Não informado';
    const statusGroup = classifyStatusGroup(rawStatus);

    const service = String(getRowVal(row, 'service') || '').trim() || 'Item não especificado';
    const descriptionComplement = String(getRowVal(row, 'descriptionComplement') || '').trim();
    const itemDescription = descriptionComplement
      ? `${service} - ${descriptionComplement}`
      : service;

    const family = String(getRowVal(row, 'family') || '').trim() || (origin === 'Serviços' ? 'Serviços Gerais' : 'Geral / Outros');
    const unit = String(getRowVal(row, 'unit') || '').trim() || (origin === 'Serviços' ? 'SV' : 'UN');

    let rawSupplierVal = String(getRowVal(row, 'supplier') || '').trim();
    let rawSupplierTradeVal = String(getRowVal(row, 'supplierTradeName') || '').trim();
    let rawSupplierGroupVal = String(getRowVal(row, 'supplierGroup') || '').trim();
    let rawSupplierStateVal = String(getRowVal(row, 'supplierState') || '').trim().toUpperCase();

    // Se a linha não tem fornecedor ou O.C., mas é contígua à O.C. anterior (células mescladas do ERP Totvs/SAP)
    if (!orderNumber && lastOrderNumber) {
      orderNumber = lastOrderNumber;
    }
    if (!branch && lastBranch) {
      branch = lastBranch;
    }
    if (!branch) {
      branch = 'Matriz';
    }

    if (!rawSupplierVal && orderNumber === lastOrderNumber && lastSupplier) {
      rawSupplierVal = lastSupplier;
      if (!rawSupplierTradeVal) rawSupplierTradeVal = lastSupplierTradeName;
      if (!rawSupplierGroupVal) rawSupplierGroupVal = lastSupplierGroup;
      if (!rawSupplierStateVal) rawSupplierStateVal = lastSupplierState;
    }

    if (!orderNumber) {
      orderNumber = `SEM-NUM-${r}`;
    }

    const rawSupplier = rawSupplierVal || (origin === 'Serviços' ? 'Prestador não informado' : 'Fornecedor não informado');
    let supplier = rawSupplier.replace(/\s+/g, ' ').trim();
    let supplierTradeName = (rawSupplierTradeVal || supplier).replace(/\s+/g, ' ').trim();

    // Se fornecedor for apenas código e nome fantasia contiver a razão comercial
    if (/^\d+([-\/]\d+)?$/.test(supplier) && supplierTradeName && !/^\d+$/.test(supplierTradeName)) {
      supplier = `${supplierTradeName} (${supplier})`;
    }

    // Higieniza nome limpo e extrai código do fornecedor
    const { cleanSupplier, supplierCode } = extractSupplierDetails(supplier);

    const supplierGroup = rawSupplierGroupVal || 'Geral';
    const supplierState = rawSupplierStateVal || 'SP';

    // Atualiza rastreamento para linhas mescladas subsequentes
    lastOrderNumber = orderNumber;
    lastBranch = branch;
    lastSupplier = supplier;
    lastSupplierTradeName = supplierTradeName;
    lastSupplierGroup = supplierGroup;
    lastSupplierState = supplierState;

    // Quantidades
    const qtyRequested = parseExcelNumber(getRowVal(row, 'qtyRequested'));
    const qtyCancelled = parseExcelNumber(getRowVal(row, 'qtyCancelled'));
    const qtyOpen = parseExcelNumber(getRowVal(row, 'qtyOpen'));
    const qtyReceived = parseExcelNumber(getRowVal(row, 'qtyReceived'));

    // Valores com tratamento e fidelidade aos dados da planilha
    const hasNetValueCol = headerAnalysis.matchedMap.has('netValue');
    const hasItemValueCol = headerAnalysis.matchedMap.has('itemValue');

    let unitPrice = parseExcelNumber(getRowVal(row, 'unitPrice'));
    let itemValue = parseExcelNumber(getRowVal(row, 'itemValue'));
    let netValue = parseExcelNumber(getRowVal(row, 'netValue'));

    // Se a coluna Valor Líquido NÃO foi encontrada no arquivo mas temos Valor do Item, usa itemValue
    if (!hasNetValueCol && hasItemValueCol) {
      netValue = itemValue;
    }
    // Se a coluna Valor do Item NÃO foi encontrada mas temos Valor Líquido, usa netValue
    if (!hasItemValueCol && hasNetValueCol) {
      itemValue = netValue;
    }

    // Se nenhuma coluna de total foi encontrada no arquivo, calcula Preço Unitário x Quantidade
    if (!hasNetValueCol && !hasItemValueCol && unitPrice > 0 && qtyRequested > 0) {
      netValue = Math.round(unitPrice * qtyRequested * 100) / 100;
      itemValue = netValue;
    }

    // Se unitPrice for zero mas temos valor e quantidade:
    if (unitPrice === 0 && qtyRequested > 0 && (netValue > 0 || itemValue > 0)) {
      unitPrice = Math.round(((netValue || itemValue) / qtyRequested) * 100) / 100;
    }

    const grossCalculatedValue =
      unitPrice > 0 && qtyRequested > 0
        ? Math.round(unitPrice * qtyRequested * 100) / 100
        : Math.max(itemValue, netValue);

    const openValue = parseExcelNumber(getRowVal(row, 'openValue'));
    const cancelledValue = parseExcelNumber(getRowVal(row, 'cancelledValue'));
    const discountValue = parseExcelNumber(getRowVal(row, 'discountValue'));
    const discountPercent = parseExcelNumber(getRowVal(row, 'discountPercent'));
    const ipiValue = parseExcelNumber(getRowVal(row, 'ipiValue'));
    const icmsValue = parseExcelNumber(getRowVal(row, 'icmsValue'));
    const issValue = parseExcelNumber(getRowVal(row, 'issValue'));
    const inssValue = parseExcelNumber(getRowVal(row, 'inssValue'));

    // Retenções de impostos (especialmente relevantes para Serviços)
    const irrfValue = parseExcelNumber(getRowVal(row, 'irrfValue'));
    const pisValue = parseExcelNumber(getRowVal(row, 'pisValue'));
    const cofinsValue = parseExcelNumber(getRowVal(row, 'cofinsValue'));
    const csllValue = parseExcelNumber(getRowVal(row, 'csllValue'));

    // Datas
    let issueDate = parseExcelDate(getRowVal(row, 'issueDate'));
    if (!issueDate && orderNumber === lastOrderNumber && lastIssueDate) {
      issueDate = lastIssueDate;
    }
    if (issueDate) {
      lastIssueDate = issueDate;
    }

    const deliveryDate = parseExcelDate(getRowVal(row, 'deliveryDate'));
    const quoteDate = parseExcelDate(getRowVal(row, 'quoteDate'));

    // Prazos e atrasos
    let leadTimeDays = 0;
    if (deliveryDate && issueDate) {
      const diffMs = deliveryDate.getTime() - issueDate.getTime();
      leadTimeDays = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }

    // Regra: atrasado se entrega < hoje E (quantidade em aberto > 0 OU valor em aberto > 0)
    let isDelayed = false;
    let delayDays = 0;
    if (
      deliveryDate &&
      deliveryDate.getTime() < today.getTime() &&
      statusGroup !== 'Cancelada' &&
      statusGroup !== 'Atendida/Encerrada' &&
      (qtyOpen > 0 || openValue > 0)
    ) {
      isDelayed = true;
      delayDays = Math.max(0, Math.floor((today.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Classificações
    const costCenter = String(getRowVal(row, 'costCenter') || '').trim() || 'Geral / Adm';
    const costCenterAbbr = String(getRowVal(row, 'costCenterAbbr') || '').trim() || costCenter;
    const financialAccount = String(getRowVal(row, 'financialAccount') || '').trim() || 'Não informada';
    const financialAccountAbbr = String(getRowVal(row, 'financialAccountAbbr') || '').trim() || financialAccount;
    const accountingAccount = String(getRowVal(row, 'accountingAccount') || '').trim() || 'Não informada';
    const accountingAccountAbbr = String(getRowVal(row, 'accountingAccountAbbr') || '').trim() || accountingAccount;

    // Responsáveis
    const buyer = String(getRowVal(row, 'buyer') || '').trim() || (origin === 'Serviços' ? 'Gestor de Contratos' : 'Equipe de Compras');
    const creator = String(getRowVal(row, 'creator') || '').trim() || 'Sistema';

    // Localidade de entrega
    const deliveryCity = String(getRowVal(row, 'deliveryCity') || '').trim() || 'São Paulo';
    const deliveryState = String(getRowVal(row, 'deliveryState') || '').trim() || 'SP';

    // Moeda
    const currency = String(getRowVal(row, 'currency') || '').trim() || 'BRL';
    const currencyDesc = String(getRowVal(row, 'currencyDesc') || '').trim() || 'Real';

    // Motivos
    const reason = String(getRowVal(row, 'reason') || '').trim();
    const reasonDescription = String(getRowVal(row, 'reasonDescription') || '').trim() || (statusGroup === 'Cancelada' ? 'Cancelado pelo solicitante' : '');

    const record: PurchaseRecord = {
      id: `${origin}-${orderNumber}-${seq}-${branch}-${r}`,
      origin,
      branch,
      orderNumber,
      seq: seq as number | string,
      status: rawStatus,
      statusGroup,
      reason,
      reasonDescription,
      service,
      descriptionComplement,
      itemDescription,
      family,
      unit,
      supplier,
      cleanSupplier,
      rawSupplier,
      supplierCode,
      supplierTradeName,
      supplierGroup,
      supplierState,
      qtyRequested,
      qtyCancelled,
      qtyOpen,
      qtyReceived,
      unitPrice,
      itemValue,
      netValue,
      grossCalculatedValue,
      openValue,
      cancelledValue,
      discountValue,
      discountPercent,
      ipiValue,
      icmsValue,
      issValue,
      inssValue,
      irrfValue,
      pisValue,
      cofinsValue,
      csllValue,
      issueDate,
      issueDateStr: formatDate(issueDate),
      deliveryDate,
      deliveryDateStr: formatDate(deliveryDate),
      quoteDate,
      leadTimeDays,
      isDelayed,
      delayDays,
      costCenter,
      costCenterAbbr,
      financialAccount,
      financialAccountAbbr,
      accountingAccount,
      accountingAccountAbbr,
      buyer,
      creator,
      deliveryCity,
      deliveryState,
      currency,
      currencyDesc,
    };

    records.push(record);
  }

  const columnOrderNotice = otherBaseHeaders
    ? checkColumnOrderNotice(headers, otherBaseHeaders)
    : undefined;

  let sumNetValue = 0;
  let sumItemValue = 0;
  let sumCalculatedPriceQty = 0;
  let sumOpenValue = 0;
  let sumCancelledValue = 0;
  let sumDiscount = 0;
  let sumActiveNetValue = 0;
  let sumActiveItemValue = 0;
  let discrepantRowsCount = 0;

  for (const r of records) {
    sumNetValue += r.netValue;
    sumItemValue += r.itemValue;
    sumCalculatedPriceQty += (r.grossCalculatedValue || (r.unitPrice * r.qtyRequested));
    sumOpenValue += r.openValue;
    sumCancelledValue += r.cancelledValue;
    sumDiscount += r.discountValue;

    if (r.statusGroup !== 'Cancelada') {
      sumActiveNetValue += r.netValue;
      sumActiveItemValue += r.itemValue;
    }

    if (Math.abs(r.netValue - r.itemValue) > 0.01) {
      discrepantRowsCount++;
    }
  }

  const reconciliation: ColumnReconciliation = {
    sumNetValue: Math.round(sumNetValue * 100) / 100,
    sumItemValue: Math.round(sumItemValue * 100) / 100,
    sumCalculatedPriceQty: Math.round(sumCalculatedPriceQty * 100) / 100,
    sumOpenValue: Math.round(sumOpenValue * 100) / 100,
    sumCancelledValue: Math.round(sumCancelledValue * 100) / 100,
    sumDiscount: Math.round(sumDiscount * 100) / 100,
    sumActiveNetValue: Math.round(sumActiveNetValue * 100) / 100,
    sumActiveItemValue: Math.round(sumActiveItemValue * 100) / 100,
    hasNetValueColumn: headerAnalysis.matchedMap.has('netValue'),
    hasItemValueColumn: headerAnalysis.matchedMap.has('itemValue'),
    hasUnitPriceColumn: headerAnalysis.matchedMap.has('unitPrice'),
    discrepantRowsCount,
  };

  const report: MappingReport = {
    totalRows: records.length,
    recognizedColumns: headerAnalysis.matchedDetails,
    missingEssentialColumns: headerAnalysis.missingEssential,
    unmatchedHeaders: headerAnalysis.unmatchedHeaders,
    sampleProcessed: false,
    fileName,
    baseName: origin,
    loadTimestamp: new Date().toLocaleString('pt-BR'),
    columnOrderNotice,
    reconciliation,
  };

  return { records, report };
}

/**
 * Exporta registros filtrados para arquivo Excel (.xlsx) com a coluna Origem
 */
export function exportToExcel(records: PurchaseRecord[], fileName = 'dados_projel_filtrado.xlsx') {
  const exportRows = records.map((r) => ({
    'Origem': r.origin,
    'Filial': r.branch,
    'Nº Ordem Compra': r.orderNumber,
    'Seq.': r.seq,
    'Situação': r.status,
    'Grupo Situação': r.statusGroup,
    'Serviço / Item': r.service,
    'Complemento': r.descriptionComplement,
    'Família': r.family,
    'U.M.': r.unit,
    'Fornecedor / Prestador': r.supplier,
    'UF': r.supplierState,
    'Comprador / Gestor': r.buyer,
    'Centro de Custo': r.costCenter,
    'Emissão': r.issueDateStr,
    'Entrega': r.deliveryDateStr,
    'Prazo (Dias)': r.leadTimeDays,
    'Atrasado?': r.isDelayed ? `SIM (${r.delayDays} dias)` : 'NÃO',
    'Qtd Pedida': r.qtyRequested,
    'Qtd Recebida': r.qtyReceived,
    'Qtd Aberto': r.qtyOpen,
    'Preço Unitário': r.unitPrice,
    'Valor Líquido (R$)': r.netValue,
    'Valor em Aberto (R$)': r.openValue,
    'Valor Cancelado (R$)': r.cancelledValue,
    'Vlr Desc (R$)': r.discountValue,
    '% Desconto': r.discountPercent,
    'Valor ISS': r.issValue,
    'Valor INSS': r.inssValue,
    'Valor IRRF': r.irrfValue,
    'Valor PIS Retido': r.pisValue,
    'Valor COFINS Ret.': r.cofinsValue,
    'Valor CSLL Retido': r.csllValue,
    'Cta Financeira': r.financialAccount,
    'Cta Contábil': r.accountingAccount,
    'Motivo Cancelamento': r.reasonDescription,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

  XLSX.writeFile(workbook, fileName);
}

/**
 * Exporta registros filtrados para CSV com separador ponto-e-vírgula (Excel PT-BR)
 */
export function exportToCSV(records: PurchaseRecord[], fileName = 'dados_projel_filtrado.csv') {
  const exportRows = records.map((r) => ({
    'Origem': r.origin,
    'Filial': r.branch,
    'Nº Ordem Compra': r.orderNumber,
    'Seq.': r.seq,
    'Situação': r.status,
    'Serviço / Item': r.service,
    'Família': r.family,
    'Fornecedor': r.supplier,
    'UF': r.supplierState,
    'Comprador': r.buyer,
    'Centro de Custo': r.costCenter,
    'Emissão': r.issueDateStr,
    'Entrega': r.deliveryDateStr,
    'Valor Líquido': r.netValue,
    'Valor Aberto': r.openValue,
    'Atrasado': r.isDelayed ? 'Sim' : 'Não',
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
  
  // Adiciona BOM UTF-8 para que o Excel no Windows abra com acentuação correta
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
