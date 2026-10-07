import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Building2, Landmark, Grid3X3 } from 'lucide-react';
import { PurchaseRecord, CrossFilterAction } from '../../types/purchases';
import { formatCurrency } from '../../utils/formatters';

interface CostCenterTabProps {
  records: PurchaseRecord[];
  onApplyCrossFilter: (action: CrossFilterAction) => void;
}

export const CostCenterTab: React.FC<CostCenterTabProps> = ({
  records,
  onApplyCrossFilter,
}) => {
  const [accountViewMode, setAccountViewMode] = useState<'financial' | 'accounting'>('financial');

  // --- 1. Valor por Centro de Custo ---
  const costCenterData = useMemo(() => {
    const map = new Map<string, { costCenter: string; value: number; count: number; ocs: Set<string> }>();

    records.forEach((r) => {
      const cc = r.costCenter || 'Geral / Adm';
      const cur = map.get(cc) || { costCenter: cc, value: 0, count: 0, ocs: new Set() };
      cur.value += r.netValue;
      cur.count++;
      cur.ocs.add(r.orderNumber);
      map.set(cc, cur);
    });

    return Array.from(map.values())
      .map((c) => ({
        ...c,
        ordersCount: c.ocs.size,
        shortName: c.costCenter.length > 22 ? `${c.costCenter.slice(0, 20)}...` : c.costCenter,
      }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  // --- 2. Valor por Conta Financeira e Conta Contábil ---
  const accountData = useMemo(() => {
    const map = new Map<string, { account: string; value: number; count: number }>();

    records.forEach((r) => {
      const acc =
        accountViewMode === 'financial'
          ? r.financialAccount || 'Não informada'
          : r.accountingAccount || 'Não informada';

      const cur = map.get(acc) || { account: acc, value: 0, count: 0 };
      cur.value += r.netValue;
      cur.count++;
      map.set(acc, cur);
    });

    return Array.from(map.values())
      .map((a) => ({
        ...a,
        shortName: a.account.length > 25 ? `${a.account.slice(0, 23)}...` : a.account,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [records, accountViewMode]);

  // --- 3. Matriz Heatmap: Centro de Custo x Família ---
  const { matrixRows, topFamilies, maxCellValue } = useMemo(() => {
    // 5 principais centros de custo e 6 principais famílias
    const ccSums = new Map<string, number>();
    const famSums = new Map<string, number>();

    records.forEach((r) => {
      const cc = r.costCenter || 'Geral';
      const fam = r.family || 'Outros';
      ccSums.set(cc, (ccSums.get(cc) || 0) + r.netValue);
      famSums.set(fam, (famSums.get(fam) || 0) + r.netValue);
    });

    const orderedCCs = Array.from(ccSums.entries())
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0])
      .slice(0, 6);

    const orderedFams = Array.from(famSums.entries())
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0])
      .slice(0, 6);

    // Constrói células da matriz
    const grid = new Map<string, Map<string, number>>();
    let maxVal = 1;

    orderedCCs.forEach((cc) => {
      grid.set(cc, new Map<string, number>());
      orderedFams.forEach((fam) => {
        grid.get(cc)!.set(fam, 0);
      });
    });

    records.forEach((r) => {
      const cc = r.costCenter || 'Geral';
      const fam = r.family || 'Outros';
      if (grid.has(cc) && grid.get(cc)!.has(fam)) {
        const current = grid.get(cc)!.get(fam)!;
        const updated = current + r.netValue;
        grid.get(cc)!.set(fam, updated);
        if (updated > maxVal) maxVal = updated;
      }
    });

    const rows = orderedCCs.map((cc) => {
      const cells = orderedFams.map((fam) => ({
        family: fam,
        value: grid.get(cc)!.get(fam) || 0,
      }));
      const rowTotal = cells.reduce((acc, c) => acc + c.value, 0);
      return { costCenter: cc, cells, rowTotal };
    });

    return { matrixRows: rows, topFamilies: orderedFams, maxCellValue: maxVal };
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Linha 1: Valor por Centro de Custo e por Conta Financeira/Contábil */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Centro de Custo */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1E4E8C] dark:text-[#8DA9C4]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Valor por Centro de Custo / Obra
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Alocação orçamentária por projeto e sede (clique para filtrar)
              </p>
            </div>
          </div>

          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costCenterData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
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
                  dataKey="shortName"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  width={140}
                />
                <Tooltip
                  formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Valor Líquido']}
                  labelFormatter={(name, payload) => {
                    const row = payload?.[0]?.payload;
                    return row ? `${row.costCenter} (${row.ordersCount} O.C.s)` : name;
                  }}
                  contentStyle={{
                    backgroundColor: '#0B2545',
                    borderColor: '#13315C',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="value"
                  name="Valor Comprado"
                  fill="#0B2545"
                  radius={[0, 4, 4, 0]}
                  onClick={(entry: any) => onApplyCrossFilter({ type: 'costCenters', value: String(entry?.costCenter || entry?.payload?.costCenter || '') })}
                  className="cursor-pointer hover:opacity-85 transition-opacity"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conta Financeira e Contábil */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Contas Financeiras e Contábeis
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Classificação contábil das despesas de compras
              </p>
            </div>

            {/* Alternador Conta Financeira vs Contábil */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setAccountViewMode('financial')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                  accountViewMode === 'financial'
                    ? 'bg-white dark:bg-slate-900 text-[#0B2545] dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Cta. Financeira
              </button>
              <button
                onClick={() => setAccountViewMode('accounting')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                  accountViewMode === 'accounting'
                    ? 'bg-white dark:bg-slate-900 text-[#0B2545] dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Cta. Contábil
              </button>
            </div>
          </div>

          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accountData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
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
                  dataKey="shortName"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  width={140}
                />
                <Tooltip
                  formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Total Líquido']}
                  labelFormatter={(name, payload) => {
                    const row = payload?.[0]?.payload;
                    return row ? row.account : name;
                  }}
                  contentStyle={{
                    backgroundColor: '#0B2545',
                    borderColor: '#13315C',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="value"
                  name="Valor Líquido"
                  fill="#10B981"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Linha 2: Matriz Heatmap Centro de Custo x Família */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Matriz de Calor: Centro de Custo × Família de Insumos
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cores mais intensas indicam maiores concentrações financeiras no cruzamento entre Obra e Categoria
            </p>
          </div>
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 rounded-l-lg border-b border-slate-200 dark:border-slate-800 min-w-[180px]">
                  Centro de Custo / Obra
                </th>
                {topFamilies.map((fam) => (
                  <th
                    key={fam}
                    className="p-3 text-right font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 min-w-[120px]"
                  >
                    <span className="truncate block" title={fam}>
                      {fam}
                    </span>
                  </th>
                ))}
                <th className="p-3 text-right font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 rounded-r-lg border-b border-slate-200 dark:border-slate-800 min-w-[120px]">
                  Total Obra
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {matrixRows.map((row) => (
                <tr key={row.costCenter} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-slate-900 dark:text-white truncate">
                    {row.costCenter}
                  </td>
                  {row.cells.map((cell) => {
                    const ratio = maxCellValue > 0 ? cell.value / maxCellValue : 0;
                    // Gradiente de cor com base no valor da célula
                    let bgStyle = 'transparent';
                    let textClass = 'text-slate-400 dark:text-slate-600';
                    if (cell.value > 0) {
                      textClass = 'text-slate-900 dark:text-slate-100 font-medium';
                      if (ratio > 0.6) {
                        bgStyle = 'rgba(242, 140, 40, 0.45)'; // Laranja intenso
                      } else if (ratio > 0.3) {
                        bgStyle = 'rgba(30, 78, 140, 0.25)'; // Azul Projel
                      } else {
                        bgStyle = 'rgba(141, 169, 196, 0.15)'; // Azul suave
                      }
                    }

                    return (
                      <td
                        key={cell.family}
                        className={`p-3 text-right font-mono tabular-nums ${textClass}`}
                        style={{ backgroundColor: bgStyle }}
                        title={`${row.costCenter} x ${cell.family}: ${formatCurrency(cell.value)}`}
                      >
                        {cell.value > 0 ? formatCurrency(cell.value) : '-'}
                      </td>
                    );
                  })}
                  <td className="p-3 text-right font-mono tabular-nums font-bold text-[#1E4E8C] dark:text-amber-400 bg-slate-50/40 dark:bg-slate-800/40">
                    {formatCurrency(row.rowTotal)}
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
