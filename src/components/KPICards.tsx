import React from 'react';
import {
  DollarSign,
  FileCheck2,
  ListOrdered,
  Receipt,
  Users2,
  Clock,
  Ban,
  Tag,
  CalendarCheck,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { KPIData } from '../types/purchases';
import {
  formatCurrency,
  formatCompactCurrency,
  formatNumber,
  formatCompactNumber,
  formatPercent,
} from '../utils/formatters';

interface KPICardsProps {
  kpis: KPIData;
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis }) => {
  const renderVariation = (
    delta: number | null | undefined,
    inverse = false,
    unit = '%'
  ) => {
    if (delta === null || delta === undefined || isNaN(delta)) {
      return (
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          Sem base MoM
        </span>
      );
    }

    const isPositive = delta > 0;
    const isZero = Math.abs(delta) < 0.05;
    if (isZero) {
      return (
        <span className="text-[10px] text-slate-500 font-medium">
          Estável MoM
        </span>
      );
    }

    // Inverse: para atrasos ou cancelamentos, subir é ruim (vermelho) e cair é bom (verde)
    const isGood = inverse ? !isPositive : isPositive;
    const colorClass = isGood
      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40'
      : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40';

    return (
      <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${colorClass}`}>
        {isPositive ? (
          <TrendingUp className="w-3 h-3 stroke-[2.5]" />
        ) : (
          <TrendingDown className="w-3 h-3 stroke-[2.5]" />
        )}
        <span className="tabular-nums">
          {isPositive ? '+' : ''}
          {delta.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          {unit}
        </span>
      </div>
    );
  };

  const cards = [
    // 1. Valor Total Comprado
    {
      title: 'Valor Total Comprado',
      shortValue: formatCompactCurrency(kpis.totalValue),
      fullValue: `${formatCurrency(kpis.totalValue)} (Valor Líquido: ${formatCurrency(kpis.totalNetValue || 0)} | Valor do Item: ${formatCurrency(kpis.totalItemValue || 0)})`,
      subtitle:
        kpis.calculationBasis === 'item'
          ? `Coluna Valor do Item ${kpis.excludeCancelled ? '(sem canceladas)' : ''}`
          : kpis.calculationBasis === 'calc'
          ? `Preço × Qtd ${kpis.excludeCancelled ? '(sem canceladas)' : ''}`
          : `Coluna Valor Líquido ${kpis.excludeCancelled ? '(sem canceladas)' : ''}`,
      icon: DollarSign,
      iconColor: 'text-[#1E4E8C] dark:text-[#8DA9C4]',
      variation: renderVariation(kpis.momVariations.totalValue),
      borderColor: 'border-l-4 border-l-[#1E4E8C]',
    },
    // 2. Quantidade de O.C.s
    {
      title: 'O.C. Emitidas',
      shortValue: formatNumber(kpis.uniqueOrdersCount),
      fullValue: `${formatNumber(kpis.uniqueOrdersCount)} Ordens de Compra únicas`,
      subtitle: 'Valores únicos por Filial + OC',
      icon: FileCheck2,
      iconColor: 'text-[#13315C] dark:text-[#8DA9C4]',
      variation: renderVariation(kpis.momVariations.uniqueOrdersCount),
      borderColor: 'border-l-4 border-l-[#13315C]',
    },
    // 3. Quantidade de Itens / Linhas
    {
      title: 'Itens de Compra',
      shortValue: formatCompactNumber(kpis.totalItemsCount),
      fullValue: `${formatNumber(kpis.totalItemsCount)} itens / linhas processadas`,
      subtitle: 'Total de sequenciais (itens)',
      icon: ListOrdered,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      variation: renderVariation(kpis.momVariations.totalItemsCount),
      borderColor: 'border-l-4 border-l-indigo-600',
    },
    // 4. Ticket Médio por O.C.
    {
      title: 'Ticket Médio / O.C.',
      shortValue: formatCompactCurrency(kpis.averageTicket),
      fullValue: formatCurrency(kpis.averageTicket),
      subtitle: 'Valor Comprado / O.C. únicas',
      icon: Receipt,
      iconColor: 'text-teal-600 dark:text-teal-400',
      variation: renderVariation(kpis.momVariations.averageTicket),
      borderColor: 'border-l-4 border-l-teal-600',
    },
    // 5. Nº de Fornecedores Ativos
    {
      title: 'Fornecedores Ativos',
      shortValue: formatNumber(kpis.activeSuppliersCount),
      fullValue: `${formatNumber(kpis.activeSuppliersCount)} parceiros com pedidos`,
      subtitle: 'Fornecedores distintos no período',
      icon: Users2,
      iconColor: 'text-sky-600 dark:text-sky-400',
      variation: renderVariation(kpis.momVariations.activeSuppliersCount),
      borderColor: 'border-l-4 border-l-sky-600',
    },
    // 6. Valor em Aberto
    {
      title: 'Saldo em Aberto',
      shortValue: formatCompactCurrency(kpis.openValue),
      fullValue: `${formatCurrency(kpis.openValue)} (${formatPercent(kpis.openValuePercent)} do total)`,
      subtitle: `${formatPercent(kpis.openValuePercent)} do total faturável`,
      icon: Clock,
      iconColor: 'text-amber-500',
      variation: renderVariation(kpis.momVariations.openValue, true),
      borderColor: 'border-l-4 border-l-amber-500',
    },
    // 7. Valor Cancelado
    {
      title: 'Valor Cancelado',
      shortValue: formatCompactCurrency(kpis.cancelledValue),
      fullValue: `${formatCurrency(kpis.cancelledValue)} (${formatPercent(kpis.cancelledValuePercent)} do total)`,
      subtitle: `${formatPercent(kpis.cancelledValuePercent)} de perdas/cancelamentos`,
      icon: Ban,
      iconColor: 'text-rose-600 dark:text-rose-400',
      variation: renderVariation(kpis.momVariations.cancelledValue, true),
      borderColor: 'border-l-4 border-l-rose-600',
    },
    // 8. Total de Descontos
    {
      title: 'Descontos Obtidos',
      shortValue: formatCompactCurrency(kpis.totalDiscount),
      fullValue: `${formatCurrency(kpis.totalDiscount)} economizados (${formatPercent(kpis.discountPercent)} do bruto)`,
      subtitle: `${formatPercent(kpis.discountPercent)} de economia s/ bruto`,
      icon: Tag,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      variation: renderVariation(kpis.momVariations.totalDiscount),
      borderColor: 'border-l-4 border-l-emerald-600',
    },
    // 9. Prazo Médio de Entrega
    {
      title: 'Prazo Médio Entrega',
      shortValue: `${kpis.averageLeadTimeDays} dias`,
      fullValue: `Média de ${kpis.averageLeadTimeDays} dias (Entrega - Emissão)`,
      subtitle: 'Lead time médio de entrega',
      icon: CalendarCheck,
      iconColor: 'text-blue-600 dark:text-blue-400',
      variation: renderVariation(kpis.momVariations.averageLeadTimeDays, true),
      borderColor: 'border-l-4 border-l-blue-600',
    },
    // 10. % Entregas no Prazo / Em Atraso
    {
      title: 'Pontualidade / Atrasos',
      shortValue: formatPercent(kpis.onTimePercent),
      fullValue: `${formatPercent(kpis.onTimePercent)} no prazo | ${formatNumber(kpis.delayedCount)} itens em atraso (${formatPercent(kpis.delayedPercent)})`,
      subtitle: `${kpis.delayedCount} itens em atraso (${formatPercent(kpis.delayedPercent)})`,
      icon: AlertCircle,
      iconColor: kpis.delayedCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400',
      variation: renderVariation(kpis.momVariations.onTimePercent, false, ' p.p.'),
      borderColor: kpis.delayedCount > 0 ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-emerald-500',
    },
  ];

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              title={card.fullValue}
              className={`bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group ${card.borderColor}`}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                  {card.title}
                </span>
                <Icon className={`w-4 h-4 ${card.iconColor} shrink-0`} />
              </div>

              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
                  {card.shortValue}
                </span>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[65%]">
                  {card.subtitle}
                </span>
                <div className="shrink-0">{card.variation}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Painel Consolidado de Retenções Fiscais na Fonte (Serviços e Obras) */}
      {Boolean(kpis.totalRetentions && kpis.totalRetentions > 0) && (
        <div className="mt-3 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-300/60 dark:border-amber-800/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
              Retenções Fiscais na Fonte
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Total Retido: <strong className="text-amber-600 dark:text-amber-400 font-mono text-sm">{formatCurrency(kpis.totalRetentions || 0)}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-600 dark:text-slate-300">
            {Boolean(kpis.totalISS && kpis.totalISS > 0) && (
              <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                ISS: <strong className="text-slate-900 dark:text-white">{formatCurrency(kpis.totalISS || 0)}</strong>
              </span>
            )}
            {Boolean(kpis.totalINSS && kpis.totalINSS > 0) && (
              <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                INSS: <strong className="text-slate-900 dark:text-white">{formatCurrency(kpis.totalINSS || 0)}</strong>
              </span>
            )}
            {Boolean(kpis.totalIRRF && kpis.totalIRRF > 0) && (
              <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                IRRF: <strong className="text-slate-900 dark:text-white">{formatCurrency(kpis.totalIRRF || 0)}</strong>
              </span>
            )}
            {Boolean(kpis.totalPIS && kpis.totalPIS > 0) && (
              <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                PIS: <strong className="text-slate-900 dark:text-white">{formatCurrency(kpis.totalPIS || 0)}</strong>
              </span>
            )}
            {Boolean(kpis.totalCOFINS && kpis.totalCOFINS > 0) && (
              <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                COFINS: <strong className="text-slate-900 dark:text-white">{formatCurrency(kpis.totalCOFINS || 0)}</strong>
              </span>
            )}
            {Boolean(kpis.totalCSLL && kpis.totalCSLL > 0) && (
              <span className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                CSLL: <strong className="text-slate-900 dark:text-white">{formatCurrency(kpis.totalCSLL || 0)}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
