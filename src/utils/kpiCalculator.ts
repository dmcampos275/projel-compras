import { PurchaseRecord, KPIData, CalculationBasis } from '../types/purchases';

/**
 * Calcula os 10 KPIs corporativos, retenções e variações em relação ao mês anterior (MoM)
 * Suporta bases de cálculo dinâmicas: Valor Líquido (padrão ERP), Valor do Item (Bruto) ou Preço x Qtd
 * Permite também alternar a exclusão de ordens canceladas da soma geral
 */
export function calculateKPIs(
  records: PurchaseRecord[],
  basis: CalculationBasis = 'net',
  excludeCancelled: boolean = false
): KPIData {
  if (records.length === 0) {
    return {
      totalValue: 0,
      totalNetValue: 0,
      totalItemValue: 0,
      totalGrossCalculated: 0,
      totalValidOrdersValue: 0,
      calculationBasis: basis,
      excludeCancelled,
      uniqueOrdersCount: 0,
      totalItemsCount: 0,
      averageTicket: 0,
      activeSuppliersCount: 0,
      openValue: 0,
      openValuePercent: 0,
      cancelledValue: 0,
      cancelledValuePercent: 0,
      totalDiscount: 0,
      discountPercent: 0,
      averageLeadTimeDays: 0,
      onTimePercent: 100,
      delayedCount: 0,
      delayedPercent: 0,
      totalRetentions: 0,
      totalISS: 0,
      totalINSS: 0,
      totalIRRF: 0,
      totalPIS: 0,
      totalCOFINS: 0,
      totalCSLL: 0,
      momVariations: {},
    };
  }

  // Agregações de primeira ordem
  let totalNetValue = 0;
  let totalItemValue = 0;
  let totalGrossCalculated = 0;
  let totalValidOrdersValue = 0;
  let totalCalculatedValue = 0;

  let totalOpenValue = 0;
  let totalCancelledValue = 0;
  let totalDiscountValue = 0;
  let totalLeadTimeSum = 0;
  let leadTimeCount = 0;
  let delayedItemsCount = 0;
  let eligibleItemsForDelay = 0;

  // Retenções fiscais
  let totalISS = 0;
  let totalINSS = 0;
  let totalIRRF = 0;
  let totalPIS = 0;
  let totalCOFINS = 0;
  let totalCSLL = 0;

  const uniqueOrdersSet = new Set<string>();
  const activeSuppliersSet = new Set<string>();

  for (const r of records) {
    // Unique O.C. chaveada por Origem + Filial + Ordem de Compra
    const orderKey = `${r.origin || 'Compras'}:::${r.branch}:::${r.orderNumber}`;
    uniqueOrdersSet.add(orderKey);

    if (r.supplier && r.supplier !== 'Fornecedor não informado' && r.supplier !== 'Prestador não informado') {
      activeSuppliersSet.add(r.supplier);
    }

    // Determina valor do registro conforme a base solicitada
    const recValue =
      basis === 'item'
        ? (r.itemValue || r.netValue)
        : basis === 'calc'
        ? (r.grossCalculatedValue || (r.unitPrice * r.qtyRequested) || r.netValue)
        : (r.netValue || r.itemValue);

    totalNetValue += r.netValue;
    totalItemValue += r.itemValue;
    totalGrossCalculated += (r.grossCalculatedValue || (r.unitPrice * r.qtyRequested) || r.netValue);

    if (r.statusGroup !== 'Cancelada') {
      totalValidOrdersValue += recValue;
    }

    if (!excludeCancelled || r.statusGroup !== 'Cancelada') {
      totalCalculatedValue += recValue;
    }

    totalOpenValue += r.openValue;
    totalCancelledValue += r.cancelledValue;
    totalDiscountValue += r.discountValue;

    // Retenções
    totalISS += r.issValue || 0;
    totalINSS += r.inssValue || 0;
    totalIRRF += r.irrfValue || 0;
    totalPIS += r.pisValue || 0;
    totalCOFINS += r.cofinsValue || 0;
    totalCSLL += r.csllValue || 0;

    if (r.leadTimeDays > 0) {
      totalLeadTimeSum += r.leadTimeDays;
      leadTimeCount++;
    }

    if (r.statusGroup !== 'Cancelada') {
      eligibleItemsForDelay++;
      if (r.isDelayed) {
        delayedItemsCount++;
      }
    }
  }

  const totalValue = totalCalculatedValue;
  const uniqueOrdersCount = uniqueOrdersSet.size;
  const totalItemsCount = records.length;
  const averageTicket = uniqueOrdersCount > 0 ? totalValue / uniqueOrdersCount : 0;
  const activeSuppliersCount = activeSuppliersSet.size;

  const openValuePercent = totalValue > 0 ? (totalOpenValue / totalValue) * 100 : 0;
  const cancelledValuePercent = totalValue > 0 ? (totalCancelledValue / totalValue) * 100 : 0;

  // Economia sobre valor bruto = Desconto / (Valor + Desconto)
  const grossValue = totalValue + totalDiscountValue;
  const discountPercent = grossValue > 0 ? (totalDiscountValue / grossValue) * 100 : 0;

  const averageLeadTimeDays = leadTimeCount > 0 ? Math.round(totalLeadTimeSum / leadTimeCount) : 0;

  const delayedPercent =
    eligibleItemsForDelay > 0 ? (delayedItemsCount / eligibleItemsForDelay) * 100 : 0;
  const onTimePercent = Math.max(0, 100 - delayedPercent);

  const totalRetentions = totalISS + totalINSS + totalIRRF + totalPIS + totalCOFINS + totalCSLL;

  // --- CÁLCULO DE VARIAÇÃO EM RELAÇÃO AO MÊS ANTERIOR (MoM) ---
  const recordsWithDate = records.filter((r) => r.issueDate instanceof Date && !isNaN(r.issueDate.getTime()));
  
  const momVariations: KPIData['momVariations'] = {};

  if (recordsWithDate.length > 0) {
    let maxTime = 0;
    for (const r of recordsWithDate) {
      if (r.issueDate!.getTime() > maxTime) maxTime = r.issueDate!.getTime();
    }
    const latestDate = new Date(maxTime);
    const currYear = latestDate.getFullYear();
    const currMonth = latestDate.getMonth();

    const prevMonthDate = new Date(currYear, currMonth - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();

    const currMonthRecords = recordsWithDate.filter(
      (r) => r.issueDate!.getFullYear() === currYear && r.issueDate!.getMonth() === currMonth
    );
    const prevMonthRecords = recordsWithDate.filter(
      (r) => r.issueDate!.getFullYear() === prevYear && r.issueDate!.getMonth() === prevMonth
    );

    if (currMonthRecords.length > 0 && prevMonthRecords.length > 0) {
      const getSubsetStats = (items: PurchaseRecord[]) => {
        const ocs = new Set<string>();
        const sups = new Set<string>();
        let val = 0;
        let openVal = 0;
        let cancVal = 0;
        let delayed = 0;
        let eligible = 0;

        for (const item of items) {
          ocs.add(`${item.origin || 'Compras'}:::${item.branch}:::${item.orderNumber}`);
          if (item.supplier) sups.add(item.supplier);
          const iVal =
            basis === 'item'
              ? (item.itemValue || item.netValue)
              : basis === 'calc'
              ? (item.grossCalculatedValue || (item.unitPrice * item.qtyRequested) || item.netValue)
              : (item.netValue || item.itemValue);

          if (!excludeCancelled || item.statusGroup !== 'Cancelada') {
            val += iVal;
          }
          openVal += item.openValue;
          cancVal += item.cancelledValue;

          if (item.statusGroup !== 'Cancelada') {
            eligible++;
            if (item.isDelayed) delayed++;
          }
        }

        const ocsCount = ocs.size;
        const avg = ocsCount > 0 ? val / ocsCount : 0;
        const onTimePct = eligible > 0 ? Math.max(0, 100 - (delayed / eligible) * 100) : 100;

        return {
          totalVal: val,
          orders: ocsCount,
          items: items.length,
          avgTicket: avg,
          suppliers: sups.size,
          open: openVal,
          canc: cancVal,
          onTime: onTimePct,
        };
      };

      const currStats = getSubsetStats(currMonthRecords);
      const prevStats = getSubsetStats(prevMonthRecords);

      const calcPct = (curr: number, prev: number) => {
        if (prev === 0) return null;
        return ((curr - prev) / prev) * 100;
      };

      momVariations.totalValue = calcPct(currStats.totalVal, prevStats.totalVal);
      momVariations.uniqueOrdersCount = calcPct(currStats.orders, prevStats.orders);
      momVariations.totalItemsCount = calcPct(currStats.items, prevStats.items);
      momVariations.averageTicket = calcPct(currStats.avgTicket, prevStats.avgTicket);
      momVariations.activeSuppliersCount = calcPct(currStats.suppliers, prevStats.suppliers);
      momVariations.openValue = calcPct(currStats.open, prevStats.open);
      momVariations.cancelledValue = calcPct(currStats.canc, prevStats.canc);
      momVariations.onTimePercent = currStats.onTime - prevStats.onTime; // variação em pontos percentuais (p.p.)
    }
  }

  return {
    totalValue,
    totalNetValue,
    totalItemValue,
    totalGrossCalculated,
    totalValidOrdersValue,
    calculationBasis: basis,
    excludeCancelled,
    uniqueOrdersCount,
    totalItemsCount,
    averageTicket,
    activeSuppliersCount,
    openValue: totalOpenValue,
    openValuePercent,
    cancelledValue: totalCancelledValue,
    cancelledValuePercent,
    totalDiscount: totalDiscountValue,
    discountPercent,
    averageLeadTimeDays,
    onTimePercent,
    delayedCount: delayedItemsCount,
    delayedPercent,
    totalRetentions,
    totalISS,
    totalINSS,
    totalIRRF,
    totalPIS,
    totalCOFINS,
    totalCSLL,
    momVariations,
  };
}
