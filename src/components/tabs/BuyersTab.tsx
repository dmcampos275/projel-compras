import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { UserCheck, Ban, Award, TrendingUp } from 'lucide-react';
import { PurchaseRecord, CrossFilterAction } from '../../types/purchases';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';

interface BuyersTabProps {
  records: PurchaseRecord[];
  onApplyCrossFilter: (action: CrossFilterAction) => void;
}

export const BuyersTab: React.FC<BuyersTabProps> = ({
  records,
  onApplyCrossFilter,
}) => {
  // --- 1. Análise e Produtividade por Comprador ---
  const buyersList = useMemo(() => {
    const map = new Map<
      string,
      {
        buyer: string;
        totalValue: number;
        totalDiscount: number;
        allOcs: Set<string>;
        cancelledOcs: Set<string>;
        itemsCount: number;
      }
    >();

    records.forEach((r) => {
      const b = r.buyer || 'Equipe de Compras';
      const cur = map.get(b) || {
        buyer: b,
        totalValue: 0,
        totalDiscount: 0,
        allOcs: new Set(),
        cancelledOcs: new Set(),
        itemsCount: 0,
      };

      const orderKey = `${r.branch}:::${r.orderNumber}`;
      cur.allOcs.add(orderKey);
      if (r.statusGroup === 'Cancelada') {
        cur.cancelledOcs.add(orderKey);
      }
      cur.totalValue += r.netValue;
      cur.totalDiscount += r.discountValue;
      cur.itemsCount++;
      map.set(b, cur);
    });

    return Array.from(map.values())
      .map((b) => {
        const ordersCount = b.allOcs.size;
        const cancelledCount = b.cancelledOcs.size;
        const averageTicket = ordersCount > 0 ? b.totalValue / ordersCount : 0;
        const cancelRate = ordersCount > 0 ? (cancelledCount / ordersCount) * 100 : 0;
        return {
          buyer: b.buyer,
          totalValue: b.totalValue,
          totalDiscount: b.totalDiscount,
          ordersCount,
          cancelledCount,
          averageTicket,
          cancelRate,
          itemsCount: b.itemsCount,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [records]);

  // Gráfico de Barras Duplas (Valor e Nº de O.C.)
  const buyerChartData = useMemo(() => {
    return buyersList.map((b) => ({
      name: b.buyer,
      valor: b.totalValue,
      pedidos: b.ordersCount,
    }));
  }, [buyersList]);

  // --- 2. Motivos de Cancelamento ---
  const cancellationReasonsData = useMemo(() => {
    const map = new Map<string, { reason: string; count: number; value: number }>();

    records.forEach((r) => {
      if (r.statusGroup === 'Cancelada' || r.cancelledValue > 0) {
        const reasonText = r.reasonDescription || r.reason || 'Sem justificativa informada no ERP';
        const cur = map.get(reasonText) || { reason: reasonText, count: 0, value: 0 };
        cur.count++;
        cur.value += r.cancelledValue > 0 ? r.cancelledValue : r.netValue;
        map.set(reasonText, cur);
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Linha 1: Gráfico de Produtividade do Comprador e Motivos de Cancelamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico: Volume Comprado e O.C.s por Comprador */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#1E4E8C] dark:text-[#8DA9C4]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Volume e Nº de O.C. por Comprador
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Valor líquido negociado (barras) e quantidade de pedidos atendidos (linha)
              </p>
            </div>
          </div>

          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={buyerChartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={11}
                  interval={0}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#F28C28"
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    name === 'Pedidos' ? formatNumber(Number(val) || 0) : formatCurrency(Number(val) || 0),
                    String(name),
                  ]}
                  contentStyle={{
                    backgroundColor: '#0B2545',
                    borderColor: '#13315C',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar
                  yAxisId="left"
                  dataKey="valor"
                  name="Valor Comprado"
                  fill="#0B2545"
                  radius={[4, 4, 0, 0]}
                  onClick={(entry: any) => onApplyCrossFilter({ type: 'buyers', value: String(entry?.name || entry?.payload?.name || '') })}
                  className="cursor-pointer"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="pedidos"
                  name="Pedidos"
                  stroke="#F28C28"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#F28C28' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico: Motivos de Cancelamento */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Motivos de Cancelamento de O.C.
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Classificação dos cancelamentos por justificativa do ERP
              </p>
            </div>
          </div>

          <div className="mt-4 h-80">
            {cancellationReasonsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Nenhum cancelamento com justificativa registrado no período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cancellationReasonsData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="reason"
                    stroke="#64748b"
                    fontSize={10}
                    tickLine={false}
                    width={150}
                    tickFormatter={(txt) => (txt.length > 20 ? `${txt.slice(0, 18)}...` : txt)}
                  />
                  <Tooltip
                    formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Valor Cancelado']}
                    labelFormatter={(name, payload) => {
                      const row = payload?.[0]?.payload;
                      return row ? `${row.reason} (${row.count} ocorrências)` : name;
                    }}
                    contentStyle={{
                      backgroundColor: '#0B2545',
                      borderColor: '#13315C',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" name="Valor Cancelado" fill="#DC2626" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Ranking e Métricas por Comprador */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Ranking de Compradores (Ticket Médio & Eficiência)
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Indicadores consolidados por profissional responsável pelas aquisições
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 shadow-xs">
              <tr>
                <th className="p-3">Comprador</th>
                <th className="p-3 text-right">O.C.s Emitidas</th>
                <th className="p-3 text-right">Itens Comprados</th>
                <th className="p-3 text-right">Valor Negociado</th>
                <th className="p-3 text-right">Ticket Médio / OC</th>
                <th className="p-3 text-right">Desconto Obtido</th>
                <th className="p-3 text-right">% O.C. Canceladas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {buyersList.map((b, idx) => (
                <tr
                  key={b.buyer}
                  onClick={() => onApplyCrossFilter({ type: 'buyers', value: b.buyer })}
                  className="hover:bg-amber-50/50 dark:hover:bg-amber-950/20 cursor-pointer transition-colors"
                >
                  <td className="p-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                      {idx + 1}
                    </span>
                    <span>{b.buyer}</span>
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">{b.ordersCount}</td>
                  <td className="p-3 text-right font-mono tabular-nums">{b.itemsCount}</td>
                  <td className="p-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                    {formatCurrency(b.totalValue)}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {formatCurrency(b.averageTicket)}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                    {formatCurrency(b.totalDiscount)}
                  </td>
                  <td className="p-3 text-right font-mono tabular-nums">
                    <span
                      className={`font-semibold ${
                        b.cancelRate > 10 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {formatPercent(b.cancelRate)} ({b.cancelledCount} OCs)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
