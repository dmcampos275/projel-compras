import React, { useMemo } from 'react';
import {
  GitCompare,
  TrendingUp,
  Building2,
  Users,
  Percent,
  Clock,
  AlertCircle,
  Package,
  Briefcase,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { PurchaseRecord, CrossFilterAction } from '../../types/purchases';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';

interface ComparisonTabProps {
  comprasRecords: PurchaseRecord[];
  servicosRecords: PurchaseRecord[];
  onApplyCrossFilter: (action: CrossFilterAction) => void;
  onOpenUpload: () => void;
}

const COLOR_COMPRAS = '#0B2545'; // Azul-marinho
const COLOR_SERVICOS = '#F28C28'; // Laranja

export const ComparisonTab: React.FC<ComparisonTabProps> = ({
  comprasRecords,
  servicosRecords,
  onApplyCrossFilter,
  onOpenUpload,
}) => {
  const hasBoth = comprasRecords.length > 0 && servicosRecords.length > 0;

  // Se não tiver ambas as bases carregadas
  if (!hasBoth) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs">
        <GitCompare className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Esta aba exige o carregamento simultâneo das duas bases
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Para comparar Compras (Materiais) x Serviços Realizados, é necessário que ambas as planilhas estejam carregadas no sistema.
        </p>
        <div className="mt-4 flex items-center justify-center gap-4 text-xs font-semibold">
          <span className={comprasRecords.length > 0 ? 'text-emerald-600' : 'text-slate-400'}>
            {comprasRecords.length > 0 ? '✓' : '✗'} Compras ({comprasRecords.length} linhas)
          </span>
          <span className={servicosRecords.length > 0 ? 'text-emerald-600' : 'text-slate-400'}>
            {servicosRecords.length > 0 ? '✓' : '✗'} Serviços ({servicosRecords.length} linhas)
          </span>
        </div>
        <button
          onClick={onOpenUpload}
          className="mt-6 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-bold shadow-md"
        >
          Carregar Segunda Planilha
        </button>
      </div>
    );
  }

  // 1. Totais e Participação no Gasto Total
  const { totalCompras, totalServicos, totalGeral, shareCompras, shareServicos } = useMemo(() => {
    const cTotal = comprasRecords.reduce((sum, r) => sum + (r.netValue || r.itemValue || 0), 0);
    const sTotal = servicosRecords.reduce((sum, r) => sum + (r.netValue || r.itemValue || 0), 0);
    const gTotal = cTotal + sTotal;
    return {
      totalCompras: cTotal,
      totalServicos: sTotal,
      totalGeral: gTotal,
      shareCompras: gTotal > 0 ? (cTotal / gTotal) * 100 : 0,
      shareServicos: gTotal > 0 ? (sTotal / gTotal) * 100 : 0,
    };
  }, [comprasRecords, servicosRecords]);

  const sharePieData = [
    { name: 'Compras (Materiais)', value: totalCompras, color: COLOR_COMPRAS, share: shareCompras },
    { name: 'Serviços Realizados', value: totalServicos, color: COLOR_SERVICOS, share: shareServicos },
  ];

  // 2. Evolução Mensal Comparada (Barras Agrupadas / Empilhadas)
  const monthlyComparison = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const map = new Map<number, { label: string; compras: number; servicos: number; total: number }>();

    for (let i = 0; i < 12; i++) {
      map.set(i, { label: monthNames[i], compras: 0, servicos: 0, total: 0 });
    }

    comprasRecords.forEach((r) => {
      if (!r.issueDate) return;
      const m = r.issueDate.getMonth();
      const item = map.get(m);
      if (item) {
        const val = r.netValue || r.itemValue || 0;
        item.compras += val;
        item.total += val;
      }
    });

    servicosRecords.forEach((r) => {
      if (!r.issueDate) return;
      const m = r.issueDate.getMonth();
      const item = map.get(m);
      if (item) {
        const val = r.netValue || r.itemValue || 0;
        item.servicos += val;
        item.total += val;
      }
    });

    return Array.from(map.values());
  }, [comprasRecords, servicosRecords]);

  // 3. Gasto por Centro de Custo dividido em Materiais x Serviços (Barras Empilhadas)
  const costCenterBreakdown = useMemo(() => {
    const map = new Map<string, { costCenter: string; compras: number; servicos: number; total: number }>();

    comprasRecords.forEach((r) => {
      const cc = r.costCenter || 'Não Informado';
      const cur = map.get(cc) || { costCenter: cc, compras: 0, servicos: 0, total: 0 };
      const val = r.netValue || r.itemValue || 0;
      cur.compras += val;
      cur.total += val;
      map.set(cc, cur);
    });

    servicosRecords.forEach((r) => {
      const cc = r.costCenter || 'Não Informado';
      const cur = map.get(cc) || { costCenter: cc, compras: 0, servicos: 0, total: 0 };
      const val = r.netValue || r.itemValue || 0;
      cur.servicos += val;
      cur.total += val;
      map.set(cc, cur);
    });

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [comprasRecords, servicosRecords]);

  // 4. Fornecedores Presentes em Ambas as Bases (Interseção)
  const crossSuppliers = useMemo(() => {
    const comprasMap = new Map<string, number>();
    const servicosMap = new Map<string, number>();

    comprasRecords.forEach((r) => {
      if (r.supplier && r.supplier !== 'Fornecedor não informado') {
        comprasMap.set(r.supplier, (comprasMap.get(r.supplier) || 0) + (r.netValue || r.itemValue || 0));
      }
    });

    servicosRecords.forEach((r) => {
      if (r.supplier && r.supplier !== 'Prestador não informado') {
        servicosMap.set(r.supplier, (servicosMap.get(r.supplier) || 0) + (r.netValue || r.itemValue || 0));
      }
    });

    const common: { supplier: string; comprasVal: number; servicosVal: number; total: number }[] = [];

    comprasMap.forEach((cVal, sup) => {
      if (servicosMap.has(sup)) {
        const sVal = servicosMap.get(sup) || 0;
        common.push({
          supplier: sup,
          comprasVal: cVal,
          servicosVal: sVal,
          total: cVal + sVal,
        });
      }
    });

    return common.sort((a, b) => b.total - a.total);
  }, [comprasRecords, servicosRecords]);

  // 5. Comparativo de Indicadores Operacionais
  const operationalComparison = useMemo(() => {
    // Prazo Médio
    const calcLeadTime = (recs: PurchaseRecord[]) => {
      let sum = 0;
      let count = 0;
      recs.forEach((r) => {
        if (r.leadTimeDays && r.leadTimeDays > 0) {
          sum += r.leadTimeDays;
          count++;
        }
      });
      return count > 0 ? Math.round(sum / count) : 0;
    };

    // % Atraso
    const calcDelayed = (recs: PurchaseRecord[]) => {
      let delayed = 0;
      recs.forEach((r) => {
        if (r.isDelayed) delayed++;
      });
      return recs.length > 0 ? (delayed / recs.length) * 100 : 0;
    };

    // Descontos
    const sumDiscount = (recs: PurchaseRecord[]) => recs.reduce((sum, r) => sum + (r.discountValue || 0), 0);

    // Cancelados
    const sumCancelled = (recs: PurchaseRecord[]) => recs.reduce((sum, r) => sum + (r.cancelledValue || 0), 0);

    return {
      comprasLeadTime: calcLeadTime(comprasRecords),
      servicosLeadTime: calcLeadTime(servicosRecords),
      comprasDelayedPct: calcDelayed(comprasRecords),
      servicosDelayedPct: calcDelayed(servicosRecords),
      comprasDiscount: sumDiscount(comprasRecords),
      servicosDiscount: sumDiscount(servicosRecords),
      comprasCancelled: sumCancelled(comprasRecords),
      servicosCancelled: sumCancelled(servicosRecords),
    };
  }, [comprasRecords, servicosRecords]);

  return (
    <div className="space-y-6">
      {/* Banner Superior Explicativo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-linear-to-r from-slate-100 to-amber-50/50 dark:from-slate-900 dark:to-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#0B2545] text-white rounded-xl shadow-md">
            <GitCompare className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Comparativo Consolidado: Compras vs Serviços Realizados
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Análise cruzada da matriz de suprimentos da Projel: balanço financeiro, centros de custos mistos e fornecedores híbridos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <span className="w-3 h-3 rounded-full bg-[#0B2545]" />
            Compras (Materiais)
          </div>
          <div className="flex items-center gap-1.5 font-bold text-[#F28C28]">
            <span className="w-3 h-3 rounded-full bg-[#F28C28]" />
            Serviços Realizados
          </div>
        </div>
      </div>

      {/* Grid de 4 Cards Comparativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Gasto Geral */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Volume Total Combinado</span>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {formatCurrency(totalGeral)}
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-[#0B2545] dark:text-[#8DA9C4] font-semibold">Compras:</span>
              <span className="font-mono font-bold">{formatCurrency(totalCompras)} ({shareCompras.toFixed(1)}%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#F28C28] font-semibold">Serviços:</span>
              <span className="font-mono font-bold">{formatCurrency(totalServicos)} ({shareServicos.toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Prazo Médio */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Prazo Médio de Execução</span>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {Math.round((operationalComparison.comprasLeadTime + operationalComparison.servicosLeadTime) / 2)} dias
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Materiais:</span>
              <span className="font-bold">{operationalComparison.comprasLeadTime} dias</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Serviços:</span>
              <span className="font-bold">{operationalComparison.servicosLeadTime} dias</span>
            </div>
          </div>
        </div>

        {/* Card 3: % de Atraso */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Pontualidade & Atraso</span>
          <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
            {Math.max(operationalComparison.comprasDelayedPct, operationalComparison.servicosDelayedPct).toFixed(1)}% máx
          </div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Atraso Materiais:</span>
              <span className="font-bold">{operationalComparison.comprasDelayedPct.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Atraso Serviços:</span>
              <span className="font-bold">{operationalComparison.servicosDelayedPct.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Card 4: Fornecedores Mútuos */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Fornecedores Híbridos</span>
          <div className="text-lg font-black text-amber-500 mt-1 tabular-nums">
            {crossSuppliers.length} parceiros
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Fornecem materiais e também prestam serviços na mesma operação.
          </p>
        </div>
      </div>

      {/* Linha 1: Participação no Gasto (Donut) & Evolução Mensal Comparada (Barras) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut: Compras x Serviços */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Participação no Gasto Geral
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Divisão percentual entre Materiais e Serviços
          </p>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sharePieData}
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {sharePieData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any) => [formatCurrency(Number(v)), 'Valor']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {sharePieData.map((item) => (
              <div key={item.name} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                <span className="text-[10px] font-bold text-slate-500 block truncate">{item.name}</span>
                <span className="text-xs font-black font-mono text-slate-900 dark:text-white">
                  {item.share.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Barras Agrupadas: Evolução Mensal Materiais x Serviços */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Evolução Mensal Comparada: Materiais vs Serviços
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Volume financeiro contratado mês a mês por categoria de suprimento
          </p>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: any, name: any) => [formatCurrency(Number(v)), name === 'compras' ? 'Materiais' : 'Serviços']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                />
                <Legend formatter={(val) => (val === 'compras' ? 'Compras (Materiais)' : 'Serviços Realizados')} />
                <Bar dataKey="compras" name="compras" fill={COLOR_COMPRAS} radius={[4, 4, 0, 0]} />
                <Bar dataKey="servicos" name="servicos" fill={COLOR_SERVICOS} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Linha 2: Centros de Custo Mistos (Barras Empilhadas) e Fornecedores Híbridos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gasto por Centro de Custo dividido em Materiais x Serviços */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Gasto por Centro de Custo (Obras & Projetos)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Custo total por obra dividido em Materiais (Azul) + Serviços (Laranja)
          </p>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costCenterBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b8" opacity={0.2} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="costCenter" type="category" width={110} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: any, name: any) => [formatCurrency(Number(v)), name === 'compras' ? 'Materiais' : 'Serviços']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                />
                <Legend formatter={(val) => (val === 'compras' ? 'Materiais' : 'Serviços')} />
                <Bar dataKey="compras" stackId="a" fill={COLOR_COMPRAS} />
                <Bar dataKey="servicos" stackId="a" fill={COLOR_SERVICOS} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela de Fornecedores Presentes em Ambas as Bases */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Fornecedores Híbridos (Materiais + Serviços)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Empresas parceiras com fornecimento duplo na Projel
            </p>

            <div className="mt-4 overflow-x-auto max-h-64">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300">Fornecedor</th>
                    <th className="p-2.5 font-bold text-[#0B2545] dark:text-[#8DA9C4] text-right">Materiais</th>
                    <th className="p-2.5 font-bold text-[#F28C28] text-right">Serviços</th>
                    <th className="p-2.5 font-bold text-slate-900 dark:text-white text-right">Total Geral</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {crossSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">
                        Nenhum fornecedor compartilhado entre as duas bases.
                      </td>
                    </tr>
                  ) : (
                    crossSuppliers.slice(0, 7).map((item) => (
                      <tr key={item.supplier} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200 max-w-[170px] truncate">
                          {item.supplier}
                        </td>
                        <td className="p-2.5 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                          {formatCurrency(item.comprasVal)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-medium text-[#F28C28]">
                          {formatCurrency(item.servicosVal)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            Dica: Clique no fornecedor na aba Fornecedores para ver detalhes de todas as ordens vinculadas.
          </div>
        </div>
      </div>
    </div>
  );
};
