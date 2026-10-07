import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { AlertCircle, Clock, CheckCircle2, CalendarRange, ArrowUpDown } from 'lucide-react';
import { PurchaseRecord, CrossFilterAction } from '../../types/purchases';
import { formatCurrency, formatNumber } from '../../utils/formatters';

interface LeadTimesTabProps {
  records: PurchaseRecord[];
  onApplyCrossFilter: (action: CrossFilterAction) => void;
}

export const LeadTimesTab: React.FC<LeadTimesTabProps> = ({
  records,
  onApplyCrossFilter,
}) => {
  const [delaySortAsc, setDelaySortAsc] = useState(false);

  // --- 1. Itens em Atraso ---
  const delayedItems = useMemo(() => {
    const delayed = records.filter((r) => r.isDelayed);
    return delayed.sort((a, b) => (delaySortAsc ? a.delayDays - b.delayDays : b.delayDays - a.delayDays));
  }, [records, delaySortAsc]);

  const totalDelayedOpenValue = useMemo(() => {
    return delayedItems.reduce((acc, curr) => acc + curr.openValue, 0);
  }, [delayedItems]);

  // --- 2. Histograma de Prazos de Entrega ---
  const leadTimeHistogramData = useMemo(() => {
    const buckets = [
      { range: '0-7 dias', count: 0, value: 0 },
      { range: '8-15 dias', count: 0, value: 0 },
      { range: '16-30 dias', count: 0, value: 0 },
      { range: '31-60 dias', count: 0, value: 0 },
      { range: '60+ dias', count: 0, value: 0 },
    ];

    records.forEach((r) => {
      const days = r.leadTimeDays;
      if (days <= 7) {
        buckets[0].count++;
        buckets[0].value += r.netValue;
      } else if (days <= 15) {
        buckets[1].count++;
        buckets[1].value += r.netValue;
      } else if (days <= 30) {
        buckets[2].count++;
        buckets[2].value += r.netValue;
      } else if (days <= 60) {
        buckets[3].count++;
        buckets[3].value += r.netValue;
      } else {
        buckets[4].count++;
        buckets[4].value += r.netValue;
      }
    });

    return buckets;
  }, [records]);

  // --- 3. Balanço de Quantidades (Pedida x Recebida x Aberta x Cancelada) ---
  const quantityBalanceData = useMemo(() => {
    let requested = 0;
    let received = 0;
    let open = 0;
    let cancelled = 0;

    records.forEach((r) => {
      requested += r.qtyRequested;
      received += r.qtyReceived;
      open += r.qtyOpen;
      cancelled += r.qtyCancelled;
    });

    return [
      { name: 'Pedida', quantidade: requested, fill: '#0B2545' },
      { name: 'Recebida', quantidade: received, fill: '#10B981' },
      { name: 'Em Aberto', quantidade: open, fill: '#F28C28' },
      { name: 'Cancelada', quantidade: cancelled, fill: '#EF4444' },
    ];
  }, [records]);

  // --- 4. Entregas Previstas para os Próximos 30 Dias (por Semana) ---
  const upcomingDeliveriesData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weeks = [
      { label: 'Semana 1 (1-7 dias)', count: 0, value: 0 },
      { label: 'Semana 2 (8-14 dias)', count: 0, value: 0 },
      { label: 'Semana 3 (15-21 dias)', count: 0, value: 0 },
      { label: 'Semana 4 (22-30 dias)', count: 0, value: 0 },
    ];

    records.forEach((r) => {
      if (!r.deliveryDate || r.statusGroup === 'Cancelada' || r.statusGroup === 'Atendida/Encerrada') return;
      const diffMs = r.deliveryDate.getTime() - today.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 86400));

      if (diffDays >= 0 && diffDays <= 7) {
        weeks[0].count++;
        weeks[0].value += r.openValue > 0 ? r.openValue : r.netValue;
      } else if (diffDays <= 14) {
        weeks[1].count++;
        weeks[1].value += r.openValue > 0 ? r.openValue : r.netValue;
      } else if (diffDays <= 21) {
        weeks[2].count++;
        weeks[2].value += r.openValue > 0 ? r.openValue : r.netValue;
      } else if (diffDays <= 30) {
        weeks[3].count++;
        weeks[3].value += r.openValue > 0 ? r.openValue : r.netValue;
      }
    });

    return weeks;
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Alerta de Itens em Atraso */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
              Itens em Atraso
            </span>
            <div className="text-2xl font-black text-red-900 dark:text-red-200 tabular-nums mt-1">
              {delayedItems.length} itens
            </div>
            <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
              Prazo de entrega expirado com saldo pendente de recebimento
            </p>
          </div>
          <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Valor em Risco por Atraso
            </span>
            <div className="text-2xl font-black text-amber-900 dark:text-amber-200 tabular-nums mt-1">
              {formatCurrency(totalDelayedOpenValue)}
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
              Montante financeiro de itens não entregues na data acordada
            </p>
          </div>
          <Clock className="w-8 h-8 text-amber-500 shrink-0" />
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Previsão Próximos 30 Dias
            </span>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 tabular-nums mt-1">
              {upcomingDeliveriesData.reduce((acc, c) => acc + c.count, 0)} entregas
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(upcomingDeliveriesData.reduce((acc, c) => acc + c.value, 0))} em entregas programadas
            </p>
          </div>
          <CalendarRange className="w-8 h-8 text-emerald-500 shrink-0" />
        </div>
      </div>

      {/* Gráficos: Histograma de Prazo + Balanço de Quantidades + Entregas Previstas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Histograma de Prazos */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Histograma de Prazo de Entrega
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Faixas de dias entre a emissão e a entrega prevista
            </p>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadTimeHistogramData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="range" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(val: unknown) => [formatNumber(Number(val) || 0), 'Itens']}
                  contentStyle={{
                    backgroundColor: '#0B2545',
                    borderColor: '#13315C',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Quantidade de Itens" fill="#1E4E8C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Balanço de Quantidades */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Balanço Físico de Quantidades
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pedida × Recebida × Em Aberto × Cancelada
            </p>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quantityBalanceData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val: unknown) => [formatNumber(Number(val) || 0), 'Unidades']}
                  contentStyle={{
                    backgroundColor: '#0B2545',
                    borderColor: '#13315C',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="quantidade" name="Quantidade" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Entregas Próximos 30 Dias */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Entregas Próximos 30 Dias
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cronograma de recebimento dividido por semanas
            </p>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={upcomingDeliveriesData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Valor Previsto']}
                  contentStyle={{
                    backgroundColor: '#0B2545',
                    borderColor: '#13315C',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" name="Valor Programado" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela de Itens em Atraso */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/60 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-red-100 dark:border-red-900/40 flex items-center justify-between bg-red-50/50 dark:bg-red-950/20">
          <div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-bold text-red-950 dark:text-red-200">
                Itens com Entrega em Atraso (Follow-up de Fornecedores)
              </h3>
            </div>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
              Itens cuja data prevista de entrega já expirou e ainda possuem saldo em aberto
            </p>
          </div>
          <span className="text-xs font-bold text-red-700 dark:text-red-300">
            {delayedItems.length} itens pendentes
          </span>
        </div>

        <div className="overflow-x-auto max-h-[440px]">
          {delayedItems.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Nenhum item em atraso encontrado no período filtrado!
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Todas as entregas estão no prazo acordado ou foram atendidas integralmente.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10 shadow-xs">
                <tr>
                  <th className="p-3">O.C. / Filial</th>
                  <th className="p-3">Fornecedor</th>
                  <th className="p-3">Item / Serviço</th>
                  <th className="p-3">Data Prevista</th>
                  <th
                    onClick={() => setDelaySortAsc(!delaySortAsc)}
                    className="p-3 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <div className="flex items-center justify-center gap-1 text-red-600">
                      <span>Dias de Atraso</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-3 text-right">Saldo Aberto (Qtd)</th>
                  <th className="p-3 text-right">Valor em Aberto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {delayedItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onApplyCrossFilter({ type: 'suppliers', value: item.supplier })}
                    className="hover:bg-red-50/40 dark:hover:bg-red-950/20 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      <div>{item.orderNumber}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{item.branch}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-900 dark:text-white">{item.supplier}</div>
                      <div className="text-[10px] text-slate-500">{item.buyer}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-900 dark:text-slate-200">{item.service}</div>
                      <div className="text-[10px] text-slate-400">{item.family}</div>
                    </td>
                    <td className="p-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {item.deliveryDateStr}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[11px] font-black bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                        {item.delayDays} dias
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {formatNumber(item.qtyOpen)} {item.unit}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(item.openValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
