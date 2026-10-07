import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  TrendingUp,
  Clock,
  AlertTriangle,
  Receipt,
  Layers,
  Building2,
  Table,
  Download,
  Search,
  CheckCircle2,
  Calendar,
  Percent,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { PurchaseRecord, CrossFilterAction } from '../../types/purchases';
import { formatCurrency, formatNumber, formatDateBR } from '../../utils/formatters';
import { exportToExcel, exportToCSV } from '../../utils/excelParser';

interface ServicesTabProps {
  records: PurchaseRecord[];
  onApplyCrossFilter: (action: CrossFilterAction) => void;
}

const COLORS = ['#F28C28', '#E06D10', '#D97706', '#B45309', '#92400E', '#78350F', '#0B2545', '#13315C', '#134074'];

export const ServicesTab: React.FC<ServicesTabProps> = ({ records, onApplyCrossFilter }) => {
  // Apenas registros com origem 'Serviços'
  const servicosRecords = useMemo(() => {
    return records.filter((r) => r.origin === 'Serviços');
  }, [records]);

  // Estados locais para busca e paginação da tabela detalhada
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<'orderNumber' | 'supplier' | 'service' | 'netValue' | 'openValue' | 'delayDays'>('netValue');
  const [sortAsc, setSortAsc] = useState(false);

  // 1. KPIs Específicos de Serviços
  const kpis = useMemo(() => {
    if (servicosRecords.length === 0) {
      return {
        totalContracted: 0,
        uniqueOrdersCount: 0,
        activeSuppliersCount: 0,
        openValue: 0,
        cancelledValue: 0,
        averageTicket: 0,
        averageLeadTime: 0,
        totalRetentions: 0,
        totalISS: 0,
        totalINSS: 0,
        totalIRRF: 0,
        totalPIS: 0,
        totalCOFINS: 0,
        totalCSLL: 0,
      };
    }

    let totalContracted = 0;
    let openValue = 0;
    let cancelledValue = 0;
    let totalLeadTime = 0;
    let leadTimeCount = 0;

    let totalISS = 0;
    let totalINSS = 0;
    let totalIRRF = 0;
    let totalPIS = 0;
    let totalCOFINS = 0;
    let totalCSLL = 0;

    const uniqueOrders = new Set<string>();
    const uniqueSuppliers = new Set<string>();

    servicosRecords.forEach((r) => {
      const val = r.netValue || r.itemValue || 0;
      totalContracted += val;
      openValue += r.openValue || 0;
      cancelledValue += r.cancelledValue || 0;

      totalISS += r.issValue || 0;
      totalINSS += r.inssValue || 0;
      totalIRRF += r.irrfValue || 0;
      totalPIS += r.pisValue || 0;
      totalCOFINS += r.cofinsValue || 0;
      totalCSLL += r.csllValue || 0;

      uniqueOrders.add(`${r.branch}:::${r.orderNumber}`);
      if (r.supplier && r.supplier !== 'Prestador não informado') {
        uniqueSuppliers.add(r.supplier);
      }

      if (r.leadTimeDays && r.leadTimeDays > 0) {
        totalLeadTime += r.leadTimeDays;
        leadTimeCount++;
      }
    });

    const totalRet = totalISS + totalINSS + totalIRRF + totalPIS + totalCOFINS + totalCSLL;

    return {
      totalContracted,
      uniqueOrdersCount: uniqueOrders.size,
      activeSuppliersCount: uniqueSuppliers.size,
      openValue,
      cancelledValue,
      averageTicket: uniqueOrders.size > 0 ? totalContracted / uniqueOrders.size : 0,
      averageLeadTime: leadTimeCount > 0 ? Math.round(totalLeadTime / leadTimeCount) : 0,
      totalRetentions: totalRet,
      totalISS,
      totalINSS,
      totalIRRF,
      totalPIS,
      totalCOFINS,
      totalCSLL,
    };
  }, [servicosRecords]);

  // 2. Evolução Mensal do Valor (Área) e Quantidade de O.C. (Barras)
  const monthlyEvolution = useMemo(() => {
    const monthMap = new Map<string, { month: string; label: string; value: number; ocs: Set<string>; sortKey: number }>();
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let i = 0; i < 12; i++) {
      monthMap.set(`${i}`, {
        month: `${i}`,
        label: monthNames[i],
        value: 0,
        ocs: new Set(),
        sortKey: i,
      });
    }

    servicosRecords.forEach((r) => {
      if (!r.issueDate) return;
      const m = r.issueDate.getMonth();
      const entry = monthMap.get(`${m}`);
      if (entry) {
        entry.value += r.netValue || r.itemValue || 0;
        entry.ocs.add(`${r.branch}:::${r.orderNumber}`);
      }
    });

    return Array.from(monthMap.values()).map((e) => ({
      label: e.label,
      value: e.value,
      ordersCount: e.ocs.size,
    }));
  }, [servicosRecords]);

  // 3. Top 10 Prestadores por Valor + Curva ABC
  const topSuppliersData = useMemo(() => {
    const map = new Map<string, { supplier: string; value: number; ocs: Set<string> }>();

    servicosRecords.forEach((r) => {
      const sup = r.supplier || 'Prestador não informado';
      const cur = map.get(sup) || { supplier: sup, value: 0, ocs: new Set() };
      cur.value += r.netValue || r.itemValue || 0;
      cur.ocs.add(r.orderNumber);
      map.set(sup, cur);
    });

    const sorted = Array.from(map.values()).sort((a, b) => b.value - a.value);
    const totalAll = sorted.reduce((sum, s) => sum + s.value, 0);

    let accumulated = 0;
    const withABC = sorted.map((s) => {
      accumulated += s.value;
      const accumPercent = totalAll > 0 ? (accumulated / totalAll) * 100 : 0;
      let curve = 'C';
      if (accumPercent <= 70) curve = 'A';
      else if (accumPercent <= 90) curve = 'B';

      return {
        supplier: s.supplier,
        value: s.value,
        ordersCount: s.ocs.size,
        percent: totalAll > 0 ? (s.value / totalAll) * 100 : 0,
        accumPercent,
        curve,
      };
    });

    // Top 5 concentração
    const top5Sum = withABC.slice(0, 5).reduce((sum, s) => sum + s.value, 0);
    const top5Percent = totalAll > 0 ? (top5Sum / totalAll) * 100 : 0;

    return {
      all: withABC,
      top10: withABC.slice(0, 10),
      top5Percent,
      totalAll,
    };
  }, [servicosRecords]);

  // 4. Valor por Tipo de Serviço e Família
  const serviceFamilyData = useMemo(() => {
    const famMap = new Map<string, number>();
    servicosRecords.forEach((r) => {
      const fam = r.family || 'Geral';
      famMap.set(fam, (famMap.get(fam) || 0) + (r.netValue || r.itemValue || 0));
    });

    return Array.from(famMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [servicosRecords]);

  // 5. Valor por Centro de Custo e por Conta Financeira
  const costCenterData = useMemo(() => {
    const map = new Map<string, number>();
    servicosRecords.forEach((r) => {
      const cc = r.costCenter || 'Não Informado';
      map.set(cc, (map.get(cc) || 0) + (r.netValue || r.itemValue || 0));
    });

    return Array.from(map.entries())
      .map(([costCenter, value]) => ({ costCenter, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [servicosRecords]);

  // 6. Serviços em Aberto e em Atraso (Tabela de Gestão de Riscos)
  const openAndDelayedList = useMemo(() => {
    const openRecords = servicosRecords.filter((r) => (r.openValue && r.openValue > 0) || r.isDelayed);

    return openRecords.map((r) => ({
      id: r.id,
      orderNumber: r.orderNumber,
      supplier: r.supplier,
      service: r.service,
      deliveryDateStr: r.deliveryDateStr,
      delayDays: r.delayDays || 0,
      isDelayed: r.isDelayed,
      openValue: r.openValue || 0,
      branch: r.branch,
      status: r.status,
    })).sort((a, b) => (b.isDelayed ? 1 : 0) - (a.isDelayed ? 1 : 0) || b.delayDays - a.delayDays);
  }, [servicosRecords]);

  // 7. Execução: Qtd Pedida x Recebida x Aberta x Cancelada
  const executionStats = useMemo(() => {
    let requested = 0;
    let received = 0;
    let open = 0;
    let cancelled = 0;

    servicosRecords.forEach((r) => {
      requested += r.qtyRequested || 0;
      received += r.qtyReceived || 0;
      open += r.qtyOpen || 0;
      cancelled += r.qtyCancelled || 0;
    });

    const executionRate = requested > 0 ? (received / requested) * 100 : 0;

    return {
      requested,
      received,
      open,
      cancelled,
      executionRate,
    };
  }, [servicosRecords]);

  // 8. Retenções por Mês e por Prestador
  const retentionsByMonth = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const map = new Map<number, { month: string; iss: number; inss: number; irrf: number; pis: number; cofins: number; csll: number; total: number }>();

    for (let i = 0; i < 12; i++) {
      map.set(i, {
        month: monthNames[i],
        iss: 0,
        inss: 0,
        irrf: 0,
        pis: 0,
        cofins: 0,
        csll: 0,
        total: 0,
      });
    }

    servicosRecords.forEach((r) => {
      if (!r.issueDate) return;
      const m = r.issueDate.getMonth();
      const item = map.get(m);
      if (item) {
        item.iss += r.issValue || 0;
        item.inss += r.inssValue || 0;
        item.irrf += r.irrfValue || 0;
        item.pis += r.pisValue || 0;
        item.cofins += r.cofinsValue || 0;
        item.csll += r.csllValue || 0;
        item.total += (r.issValue || 0) + (r.inssValue || 0) + (r.irrfValue || 0) + (r.pisValue || 0) + (r.cofinsValue || 0) + (r.csllValue || 0);
      }
    });

    return Array.from(map.values()).filter((m) => m.total > 0 || true);
  }, [servicosRecords]);

  // Tabela Detalhada com busca, ordenação e paginação
  const filteredTableRecords = useMemo(() => {
    let result = servicosRecords;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.orderNumber.toLowerCase().includes(q) ||
          r.supplier.toLowerCase().includes(q) ||
          r.service.toLowerCase().includes(q) ||
          r.costCenter.toLowerCase().includes(q) ||
          r.branch.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => {
      let va: any = a[sortField];
      let vb: any = b[sortField];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();

      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [servicosRecords, searchTerm, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredTableRecords.length / pageSize) || 1;
  const paginatedRecords = filteredTableRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportServicesExcel = () => {
    exportToExcel(servicosRecords, `servicos_realizados_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportServicesCSV = () => {
    exportToCSV(servicosRecords, `servicos_realizados_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (servicosRecords.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs">
        <Briefcase className="w-12 h-12 text-[#F28C28] mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Nenhum dado na base de Serviços Realizados
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Para visualizar a análise especializada de Serviços, faça o upload da planilha de Serviços Realizados na Central de Upload ou carregue os dados de demonstração.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header da Aba com Tag e Ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-linear-to-r from-amber-50 to-orange-50/50 dark:from-slate-900 dark:to-slate-850 p-5 rounded-2xl border border-amber-200/60 dark:border-amber-900/30">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#F28C28] text-white rounded-xl shadow-md">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Painel Analítico de Serviços Realizados
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#F28C28] text-white">
                Base Serviços
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Gestão de contratos de prestação de serviços, medições de obras, retenções tributárias na fonte e performance de prestadores.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportServicesExcel}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#F28C28]" />
            Excel
          </button>
          <button
            onClick={handleExportServicesCSV}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            CSV
          </button>
        </div>
      </div>

      {/* 2. Grid de KPIs Exclusivos de Serviços */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
            Total Contratado
          </span>
          <div className="text-base font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {formatCurrency(kpis.totalContracted)}
          </div>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            Valor Líquido de Serviços
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
            Nº O.C. de Serviço
          </span>
          <div className="text-base font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {formatNumber(kpis.uniqueOrdersCount)}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            Ordens de Compra únicas
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
            Prestadores Ativos
          </span>
          <div className="text-base font-black text-[#F28C28] mt-1 tabular-nums">
            {formatNumber(kpis.activeSuppliersCount)}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            Fornecedores de Serviços
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
            Valor em Aberto
          </span>
          <div className="text-base font-black text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
            {formatCurrency(kpis.openValue)}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            A executar / medir
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
            Valor Cancelado
          </span>
          <div className="text-base font-black text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
            {formatCurrency(kpis.cancelledValue)}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            Contratos rescindidos
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
            Ticket Médio / O.C.
          </span>
          <div className="text-base font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {formatCurrency(kpis.averageTicket)}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            Média por contratação
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block truncate">
            Prazo Médio Execução
          </span>
          <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {kpis.averageLeadTime} dias
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            Entrega – Emissão
          </span>
        </div>
      </div>

      {/* 3. Gráficos Principais: Evolução Mensal e Curva ABC Top Prestadores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Evolução Mensal (Valor + Quantidade O.C.) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Evolução Mensal de Serviços
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Valor líquido faturado (Área Laranja) x Nº de Ordens (Barras)
              </p>
            </div>
          </div>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: any, name: any) =>
                    name === 'Valor' ? [formatCurrency(Number(val)), 'Valor Contratado'] : [val, 'O.C. Emitidas']
                  }
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem', color: '#fff', fontSize: '12px' }}
                />
                <Legend />
                <Bar yAxisId="right" dataKey="ordersCount" name="Nº O.C." fill="#0B2545" radius={[4, 4, 0, 0]} barSize={20} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="value"
                  name="Valor"
                  stroke="#F28C28"
                  fill="#F28C28"
                  fillOpacity={0.25}
                  strokeWidth={2.5}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Top 10 Prestadores & Curva ABC */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Top 10 Prestadores & Curva ABC
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Top 5 = {topSuppliersData.top5Percent.toFixed(1)}% do Total
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Concentração de gastos nos maiores prestadores de serviço
              </p>
            </div>
          </div>

          <div className="space-y-3 mt-4 max-h-72 overflow-y-auto pr-1">
            {topSuppliersData.top10.map((item, idx) => (
              <div
                key={item.supplier}
                onClick={() => onApplyCrossFilter({ type: 'suppliers', value: item.supplier })}
                className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[200px] sm:max-w-[280px]">
                      {item.supplier}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                        item.curve === 'A'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : item.curve === 'B'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      Classe {item.curve}
                    </span>
                  </div>
                  <div className="font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(item.value)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#F28C28] h-full rounded-full"
                      style={{ width: `${Math.min(100, item.percent)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium tabular-nums w-12 text-right">
                    {item.percent.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Linha 2: Tipo de Serviço (Família) + Centro de Custo + Execução */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Distribuição por Tipo de Serviço */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Valor por Tipo de Serviço
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Famílias e especialidades de serviço
              </p>
            </div>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-2.5 mt-4">
            {serviceFamilyData.map((f, i) => {
              const maxVal = serviceFamilyData[0]?.value || 1;
              const pct = (f.value / maxVal) * 100;
              return (
                <div
                  key={f.name}
                  onClick={() => onApplyCrossFilter({ type: 'families', value: f.name })}
                  className="cursor-pointer group"
                >
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-amber-500 truncate max-w-[200px]">
                      {f.name}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(f.value)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribuição por Centro de Custo (Obras e Projetos) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Serviços por Centro de Custo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Alocação financeira em obras e setores
              </p>
            </div>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-2.5 mt-4">
            {costCenterData.map((cc, i) => {
              const maxVal = costCenterData[0]?.value || 1;
              const pct = (cc.value / maxVal) * 100;
              return (
                <div
                  key={cc.costCenter}
                  onClick={() => onApplyCrossFilter({ type: 'costCenters', value: cc.costCenter })}
                  className="cursor-pointer group"
                >
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-500 truncate max-w-[200px]">
                      {cc.costCenter}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(cc.value)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#0B2545]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Medição Física & Execução de Serviços */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Status de Execução dos Serviços
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Medição de quantidades pedidas x realizadas
                </p>
              </div>
              <Percent className="w-4 h-4 text-emerald-500" />
            </div>

            <div className="mt-5 text-center">
              <span className="text-3xl font-black text-slate-900 dark:text-white tabular-nums">
                {executionStats.executionRate.toFixed(1)}%
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Taxa Geral de Execução e Medição
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <span className="text-[10px] text-slate-500 font-bold block">Qtd. Pedida</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {formatNumber(executionStats.requested)}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block">Qtd. Medida/Recebida</span>
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                  {formatNumber(executionStats.received)}
                </span>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                <span className="text-[10px] text-blue-700 dark:text-blue-400 font-bold block">Qtd. Aberta</span>
                <span className="text-xs font-black text-blue-700 dark:text-blue-300">
                  {formatNumber(executionStats.open)}
                </span>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl">
                <span className="text-[10px] text-rose-700 dark:text-rose-400 font-bold block">Qtd. Cancelada</span>
                <span className="text-xs font-black text-rose-700 dark:text-rose-300">
                  {formatNumber(executionStats.cancelled)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Medições integradas ao ERP Protheus/Totvs</span>
          </div>
        </div>
      </div>

      {/* 5. Painel de Retenções Tributárias na Fonte de Serviços */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Retenções Tributárias na Fonte (Serviços e Obras)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Controle de impostos e contribuições retidos nos pagamentos a pessoas jurídicas
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Retido
            </span>
            <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
              {formatCurrency(kpis.totalRetentions)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase">ISS Retido</span>
            <div className="text-sm font-black text-slate-900 dark:text-white font-mono mt-1">
              {formatCurrency(kpis.totalISS)}
            </div>
            <span className="text-[9px] text-slate-400">Imposto Municipal</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase">INSS Retido</span>
            <div className="text-sm font-black text-slate-900 dark:text-white font-mono mt-1">
              {formatCurrency(kpis.totalINSS)}
            </div>
            <span className="text-[9px] text-slate-400">Previdência (11% / 3.5%)</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase">IRRF Retido</span>
            <div className="text-sm font-black text-slate-900 dark:text-white font-mono mt-1">
              {formatCurrency(kpis.totalIRRF)}
            </div>
            <span className="text-[9px] text-slate-400">Imposto de Renda</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase">PIS Retido</span>
            <div className="text-sm font-black text-slate-900 dark:text-white font-mono mt-1">
              {formatCurrency(kpis.totalPIS)}
            </div>
            <span className="text-[9px] text-slate-400">Federal (0.65%)</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase">COFINS Retido</span>
            <div className="text-sm font-black text-slate-900 dark:text-white font-mono mt-1">
              {formatCurrency(kpis.totalCOFINS)}
            </div>
            <span className="text-[9px] text-slate-400">Federal (3.00%)</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase">CSLL Retida</span>
            <div className="text-sm font-black text-slate-900 dark:text-white font-mono mt-1">
              {formatCurrency(kpis.totalCSLL)}
            </div>
            <span className="text-[9px] text-slate-400">Contribuição Social (1.00%)</span>
          </div>
        </div>
      </div>

      {/* 6. Tabela de Gestão de Riscos: Serviços em Aberto e em Atraso */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Contratos de Serviço em Aberto ou com Entrega Atrasada
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Acompanhamento de medições pendentes e prazos contratuais expirados
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            {openAndDelayedList.filter((x) => x.isDelayed).length} ordens em atraso
          </span>
        </div>

        <div className="mt-4 overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300">Filial</th>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300">Nº O.C.</th>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300">Prestador</th>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300">Serviço / Escopo</th>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 text-center">Data Entrega</th>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 text-center">Dias Atraso</th>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 text-right">Valor em Aberto</th>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 text-center">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {openAndDelayedList.slice(0, 8).map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-2.5 font-mono text-[11px]">{row.branch}</td>
                  <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">{row.orderNumber}</td>
                  <td className="p-2.5 font-medium max-w-[200px] truncate">{row.supplier}</td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400 max-w-[220px] truncate">{row.service}</td>
                  <td className="p-2.5 text-center font-mono text-[11px]">{row.deliveryDateStr || '-'}</td>
                  <td className="p-2.5 text-center">
                    {row.delayDays > 0 ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        {row.delayDays} d
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">No prazo</span>
                    )}
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(row.openValue)}
                  </td>
                  <td className="p-2.5 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Tabela Detalhada Paginada de Serviços Realizados */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Listagem Geral de Ordens de Serviço
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Exibindo {filteredTableRecords.length} lançamentos da base de Serviços Realizados
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por O.C., prestador, serviço..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300">O.C.</th>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300">Filial</th>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300">Prestador</th>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300">Serviço</th>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300">Centro de Custo</th>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 text-center">Emissão</th>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 text-center">Entrega</th>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 text-right">Valor Líquido</th>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 text-right">Valor em Aberto</th>
                <th className="p-2.5 font-bold text-slate-600 dark:text-slate-300 text-center">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">{r.orderNumber}</td>
                  <td className="p-2.5 font-mono text-[11px]">{r.branch}</td>
                  <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200 max-w-[200px] truncate">{r.supplier}</td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400 max-w-[220px] truncate">{r.service}</td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-400 max-w-[160px] truncate">{r.costCenter}</td>
                  <td className="p-2.5 text-center font-mono text-[11px]">{r.issueDateStr}</td>
                  <td className="p-2.5 text-center font-mono text-[11px]">{r.deliveryDateStr}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {formatCurrency(r.netValue || r.itemValue || 0)}
                  </td>
                  <td className="p-2.5 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(r.openValue)}
                  </td>
                  <td className="p-2.5 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-slate-500">
            Página {currentPage} de {totalPages} ({filteredTableRecords.length} registros)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
