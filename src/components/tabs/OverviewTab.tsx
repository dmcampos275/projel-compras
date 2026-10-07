import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Table, BarChart3, TrendingUp, PieChart as PieIcon, MapPin, Building } from 'lucide-react';
import { PurchaseRecord, CrossFilterAction, CalculationBasis } from '../../types/purchases';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';

interface OverviewTabProps {
  records: PurchaseRecord[];
  onApplyCrossFilter: (action: CrossFilterAction) => void;
  calculationBasis?: CalculationBasis;
  excludeCancelled?: boolean;
}

const PALETTE = ['#0B2545', '#13315C', '#1E4E8C', '#8DA9C4', '#F28C28', '#10B981', '#6366F1', '#EC4899'];

export const OverviewTab: React.FC<OverviewTabProps> = ({
  records,
  onApplyCrossFilter,
  calculationBasis = 'net',
  excludeCancelled = false,
}) => {
  const getRecordValue = (r: PurchaseRecord) => {
    if (excludeCancelled && r.statusGroup === 'Cancelada') return 0;
    if (calculationBasis === 'item') return r.itemValue || r.netValue;
    if (calculationBasis === 'calc') return r.grossCalculatedValue || (r.unitPrice * r.qtyRequested) || r.netValue;
    return r.netValue || r.itemValue;
  };

  // Estados para alternar exibição de gráfico ou tabela para cada seção
  const [viewMonthlyValue, setViewMonthlyValue] = useState<'chart' | 'table'>('chart');
  const [viewMonthlyCount, setViewMonthlyCount] = useState<'chart' | 'table'>('chart');
  const [viewStatus, setViewStatus] = useState<'chart' | 'table'>('chart');
  const [viewBranch, setViewBranch] = useState<'chart' | 'table'>('chart');
  const [viewUF, setViewUF] = useState<'chart' | 'table'>('chart');

  // --- 1. Evolução Mensal do Valor Comprado (com Comparativo YoY se houver) ---
  const monthlyValueData = useMemo(() => {
    const monthMap = new Map<string, { monthKey: string; label: string; currentYear: number; previousYear: number; total: number; year: number; monthNum: number }>();

    // Descobre anos presentes
    const years = Array.from(new Set(records.map((r) => r.issueDate?.getFullYear()).filter(Boolean) as number[])).sort();
    const latestYear = years.length > 0 ? years[years.length - 1] : new Date().getFullYear();
    const prevYear = latestYear - 1;

    for (let m = 0; m < 12; m++) {
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const key = `${m}`;
      monthMap.set(key, {
        monthKey: key,
        label: monthNames[m],
        currentYear: 0,
        previousYear: 0,
        total: 0,
        year: latestYear,
        monthNum: m,
      });
    }

    records.forEach((r) => {
      if (!r.issueDate) return;
      const yr = r.issueDate.getFullYear();
      const m = r.issueDate.getMonth();
      const item = monthMap.get(`${m}`);
      if (item) {
        const val = getRecordValue(r);
        if (yr === latestYear) {
          item.currentYear += val;
          item.total += val;
        } else if (yr === prevYear) {
          item.previousYear += val;
          item.total += val;
        } else {
          item.total += val;
        }
      }
    });

    return Array.from(monthMap.values()).map((d) => ({
      ...d,
      currentYearFormatted: formatCurrency(d.currentYear),
      previousYearFormatted: formatCurrency(d.previousYear),
    }));
  }, [records, calculationBasis, excludeCancelled]);

  // --- 2. Evolução Mensal da Quantidade de O.C. Únicas ---
  const monthlyCountData = useMemo(() => {
    const monthMap = new Map<string, { label: string; ocs: Set<string>; itemsCount: number; monthNum: number }>();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let m = 0; m < 12; m++) {
      monthMap.set(monthNames[m], { label: monthNames[m], ocs: new Set(), itemsCount: 0, monthNum: m });
    }

    records.forEach((r) => {
      if (!r.issueDate) return;
      const m = r.issueDate.getMonth();
      const name = monthNames[m];
      const entry = monthMap.get(name);
      if (entry) {
        entry.ocs.add(`${r.branch}:::${r.orderNumber}`);
        entry.itemsCount++;
      }
    });

    return Array.from(monthMap.values()).map((e) => ({
      label: e.label,
      ocCount: e.ocs.size,
      itemsCount: e.itemsCount,
    }));
  }, [records]);

  // --- 3. Distribuição por Situação ---
  const statusData = useMemo(() => {
    const map = new Map<string, { name: string; count: number; value: number }>();
    let grandTotal = 0;

    records.forEach((r) => {
      const st = r.status || 'Não informado';
      const current = map.get(st) || { name: st, count: 0, value: 0 };
      const val = getRecordValue(r);
      current.count++;
      current.value += val;
      grandTotal += val;
      map.set(st, current);
    });

    return Array.from(map.values())
      .sort((a, b) => b.value - a.value)
      .map((item, idx) => ({
        ...item,
        percent: grandTotal > 0 ? (item.value / grandTotal) * 100 : 0,
        color: PALETTE[idx % PALETTE.length],
      }));
  }, [records, calculationBasis, excludeCancelled]);

  // --- 4. Valor por Filial ---
  const branchData = useMemo(() => {
    const map = new Map<string, { branch: string; value: number; ocs: Set<string> }>();
    records.forEach((r) => {
      const br = r.branch || 'Matriz';
      const current = map.get(br) || { branch: br, value: 0, ocs: new Set() };
      current.value += getRecordValue(r);
      current.ocs.add(r.orderNumber);
      map.set(br, current);
    });

    return Array.from(map.values())
      .map((b) => ({
        branch: b.branch,
        value: b.value,
        ordersCount: b.ocs.size,
      }))
      .sort((a, b) => b.value - a.value);
  }, [records, calculationBasis, excludeCancelled]);

  // --- 5. Distribuição por UF do Fornecedor ---
  const ufData = useMemo(() => {
    const map = new Map<string, { uf: string; value: number; count: number }>();
    records.forEach((r) => {
      const uf = r.supplierState || 'SP';
      const cur = map.get(uf) || { uf, value: 0, count: 0 };
      cur.value += getRecordValue(r);
      cur.count++;
      map.set(uf, cur);
    });

    return Array.from(map.values())
      .sort((a, b) => b.value - a.value);
  }, [records, calculationBasis, excludeCancelled]);

  return (
    <div className="space-y-6">
      {/* Linha 1: Evolução Mensal do Valor (Área) & Quantidade de O.C. (Barras) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Evolução do Valor Comprado */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#1E4E8C] dark:text-[#8DA9C4]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Evolução Mensal do Valor Comprado
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comparativo anual do volume financeiro líquido contratado
              </p>
            </div>
            <button
              onClick={() => setViewMonthlyValue(viewMonthlyValue === 'chart' ? 'table' : 'chart')}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              title={viewMonthlyValue === 'chart' ? 'Exibir dados em tabela' : 'Exibir gráfico'}
            >
              {viewMonthlyValue === 'chart' ? <Table className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
            </button>
          </div>

          <div className="mt-4 h-72">
            {viewMonthlyValue === 'chart' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyValueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValCurrent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1E4E8C" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#1E4E8C" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorValPrev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8DA9C4" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8DA9C4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Valor']}
                    contentStyle={{
                      backgroundColor: '#0B2545',
                      borderColor: '#13315C',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="currentYear"
                    name="Ano Atual"
                    stroke="#1E4E8C"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorValCurrent)"
                  />
                  <Area
                    type="monotone"
                    dataKey="previousYear"
                    name="Ano Anterior"
                    stroke="#8DA9C4"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#colorValPrev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full overflow-y-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2">Mês</th>
                      <th className="p-2 text-right">Ano Atual</th>
                      <th className="p-2 text-right">Ano Anterior</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {monthlyValueData.map((d) => (
                      <tr key={d.monthKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="p-2 font-medium">{d.label}</td>
                        <td className="p-2 text-right font-mono tabular-nums">{d.currentYearFormatted}</td>
                        <td className="p-2 text-right font-mono tabular-nums text-slate-400">{d.previousYearFormatted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Card: Quantidade de O.C. Emitidas */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#13315C] dark:text-[#8DA9C4]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Volume de Ordens de Compra por Mês
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Quantidade de pedidos de compra formalizados e itens requisitados
              </p>
            </div>
            <button
              onClick={() => setViewMonthlyCount(viewMonthlyCount === 'chart' ? 'table' : 'chart')}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              {viewMonthlyCount === 'chart' ? <Table className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
            </button>
          </div>

          <div className="mt-4 h-72">
            {viewMonthlyCount === 'chart' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyCountData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0B2545',
                      borderColor: '#13315C',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="ocCount" name="O.C. Emitidas" fill="#0B2545" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="itemsCount" name="Itens / Linhas" fill="#F28C28" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full overflow-y-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2">Mês</th>
                      <th className="p-2 text-right">O.C.s Emitidas</th>
                      <th className="p-2 text-right">Itens / Linhas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {monthlyCountData.map((d) => (
                      <tr key={d.label} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="p-2 font-medium">{d.label}</td>
                        <td className="p-2 text-right font-mono tabular-nums">{d.ocCount}</td>
                        <td className="p-2 text-right font-mono tabular-nums text-amber-600">{d.itemsCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Linha 2: Distribuição por Situação (Donut) & Filial & UF */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut: Situação da O.C. com Cross-Filtering */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Distribuição por Situação
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Clique na fatia para filtrar por situação
              </p>
            </div>
            <button
              onClick={() => setViewStatus(viewStatus === 'chart' ? 'table' : 'chart')}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              {viewStatus === 'chart' ? <Table className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
            </button>
          </div>

          <div className="mt-4 h-72">
            {viewStatus === 'chart' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    onClick={(entry: any) => onApplyCrossFilter({ type: 'statuses', value: String(entry?.name || entry?.payload?.name || '') })}
                    className="cursor-pointer"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Valor']}
                    contentStyle={{
                      backgroundColor: '#0B2545',
                      borderColor: '#13315C',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full overflow-y-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2">Situação</th>
                      <th className="p-2 text-right">Itens</th>
                      <th className="p-2 text-right">Valor Líquido</th>
                      <th className="p-2 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {statusData.map((d) => (
                      <tr
                        key={d.name}
                        onClick={() => onApplyCrossFilter({ type: 'statuses', value: d.name })}
                        className="hover:bg-amber-50/50 dark:hover:bg-amber-950/20 cursor-pointer"
                      >
                        <td className="p-2 font-medium flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }}></span>
                          <span className="truncate">{d.name}</span>
                        </td>
                        <td className="p-2 text-right font-mono tabular-nums">{d.count}</td>
                        <td className="p-2 text-right font-mono tabular-nums font-semibold">{formatCurrency(d.value)}</td>
                        <td className="p-2 text-right font-mono tabular-nums text-slate-500">{formatPercent(d.percent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Barras: Compras por Filial */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[#1E4E8C] dark:text-[#8DA9C4]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Valor Comprado por Filial
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Clique na barra para filtrar pela filial
              </p>
            </div>
            <button
              onClick={() => setViewBranch(viewBranch === 'chart' ? 'table' : 'chart')}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              {viewBranch === 'chart' ? <Table className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
            </button>
          </div>

          <div className="mt-4 h-72">
            {viewBranch === 'chart' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
                    dataKey="branch"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    width={110}
                    tickFormatter={(name) => name.length > 15 ? `${name.slice(0, 15)}...` : name}
                  />
                  <Tooltip
                    formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Total Líquido']}
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
                    fill="#13315C"
                    radius={[0, 4, 4, 0]}
                    onClick={(entry: any) => onApplyCrossFilter({ type: 'branches', value: String(entry?.branch || entry?.payload?.branch || '') })}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full overflow-y-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2">Filial</th>
                      <th className="p-2 text-right">O.C.s</th>
                      <th className="p-2 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {branchData.map((d) => (
                      <tr
                        key={d.branch}
                        onClick={() => onApplyCrossFilter({ type: 'branches', value: d.branch })}
                        className="hover:bg-amber-50/50 dark:hover:bg-amber-950/20 cursor-pointer"
                      >
                        <td className="p-2 font-medium truncate max-w-[130px]">{d.branch}</td>
                        <td className="p-2 text-right font-mono tabular-nums">{d.ordersCount}</td>
                        <td className="p-2 text-right font-mono tabular-nums font-semibold">{formatCurrency(d.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Barras: Valor por UF do Fornecedor */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Origem por UF do Fornecedor
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Distribuição regional do fornecimento (clique para filtrar)
              </p>
            </div>
            <button
              onClick={() => setViewUF(viewUF === 'chart' ? 'table' : 'chart')}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              {viewUF === 'chart' ? <Table className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
            </button>
          </div>

          <div className="mt-4 h-72">
            {viewUF === 'chart' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ufData} margin={{ top: 10, right: 10, left: 5, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="uf" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Valor Líquido']}
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
                    name="Valor (R$)"
                    fill="#F28C28"
                    radius={[4, 4, 0, 0]}
                    onClick={(entry: any) => onApplyCrossFilter({ type: 'supplierStates', value: String(entry?.uf || entry?.payload?.uf || '') })}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full overflow-y-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold sticky top-0">
                    <tr>
                      <th className="p-2">UF</th>
                      <th className="p-2 text-right">Itens</th>
                      <th className="p-2 text-right">Valor Líquido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {ufData.map((d) => (
                      <tr
                        key={d.uf}
                        onClick={() => onApplyCrossFilter({ type: 'supplierStates', value: d.uf })}
                        className="hover:bg-amber-50/50 dark:hover:bg-amber-950/20 cursor-pointer"
                      >
                        <td className="p-2 font-bold text-amber-600">{d.uf}</td>
                        <td className="p-2 text-right font-mono tabular-nums">{d.count}</td>
                        <td className="p-2 text-right font-mono tabular-nums font-semibold">{formatCurrency(d.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
