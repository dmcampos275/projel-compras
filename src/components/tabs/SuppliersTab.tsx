import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  BarChart,
} from 'recharts';
import {
  Users,
  Award,
  ShieldAlert,
  ArrowUpDown,
  Search,
  Eye,
  X,
  FileSpreadsheet,
  Building,
  DollarSign,
  Building2,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calculator,
  ChevronRight,
  ChevronDown,
  Layers,
  MapPin,
  TrendingUp,
  Info,
  Sparkles,
} from 'lucide-react';
import { PurchaseRecord, CrossFilterAction } from '../../types/purchases';
import { formatCurrency, formatNumber, formatPercent } from '../../utils/formatters';
import { exportToExcel } from '../../utils/excelParser';
import { CalculationBasis } from '../../types/purchases';

interface SuppliersTabProps {
  records: PurchaseRecord[];
  onApplyCrossFilter: (action: CrossFilterAction) => void;
  globalBasis?: CalculationBasis;
  globalExcludeCancelled?: boolean;
}

export const SuppliersTab: React.FC<SuppliersTabProps> = ({
  records,
  onApplyCrossFilter,
  globalBasis = 'net',
  globalExcludeCancelled = false,
}) => {
  // Navegação de Sub-Abas na tela de Fornecedores
  const [activeSubTab, setActiveSubTab] = useState<'ranking' | 'byBranch' | 'diagnostic'>('ranking');

  // Filtro de filial local para a aba de fornecedores
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');

  const [topLimit, setTopLimit] = useState<5 | 10 | 20>(10);
  const [sortField, setSortField] = useState<string>('totalValue');
  const [sortAsc, setSortAsc] = useState(false);
  const [searchTable, setSearchTable] = useState('');

  // Seletor de Agrupamento: Nome Unificado (higienizado), Razão Social ou Nome Fantasia
  const [groupingMode, setGroupingMode] = useState<'unified' | 'supplier' | 'tradeName'>('unified');

  // Seletor de Base de Valor: Valor Líquido, Valor do Item (Bruto), Maior Valor ou Preço x Qtd
  const [valueBasis, setValueBasis] = useState<'net' | 'item' | 'max' | 'calc'>(globalBasis);

  // Sincroniza se a base global mudar no Header
  React.useEffect(() => {
    if (globalBasis) {
      setValueBasis(globalBasis);
    }
  }, [globalBasis]);

  // Fornecedor selecionado para modal de auditoria / detalhamento linha a linha
  const [inspectSupplier, setInspectSupplier] = useState<string | null>(null);

  // Linha expandida na tabela principal para visualização rápida das filiais
  const [expandedSupplierKey, setExpandedSupplierKey] = useState<string | null>(null);

  // Fornecedor selecionado no Painel de Diagnóstico & Conciliação
  const [diagnosticSupplierKey, setDiagnosticSupplierKey] = useState<string>('');

  // Lista de filiais distintas presentes nos dados
  const availableBranches = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.branch).filter(Boolean))).sort();
  }, [records]);

  // Registros aplicados ao filtro de filial local
  const scopedRecords = useMemo(() => {
    if (selectedBranchFilter === 'all') return records;
    return records.filter((r) => r.branch === selectedBranchFilter);
  }, [records, selectedBranchFilter]);

  // Função auxiliar para obter o valor baseado no seletor
  const getRecordValue = (r: PurchaseRecord, basis: 'net' | 'item' | 'max' | 'calc') => {
    if (basis === 'item') return r.itemValue || r.netValue;
    if (basis === 'max') return Math.max(r.netValue, r.itemValue, r.grossCalculatedValue || 0);
    if (basis === 'calc') return r.grossCalculatedValue || (r.unitPrice * r.qtyRequested) || r.netValue;
    return r.netValue || r.itemValue; // padrão 'net'
  };

  // Agregação por fornecedor com normalização de chaves e filiais atendidas
  const { suppliersList, grandTotal, top5Concentration, branchSupplierMatrix } = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        supplier: string;
        cleanSupplier: string;
        tradeName: string;
        state: string;
        totalValue: number;
        totalNetValue: number;
        totalItemValue: number;
        totalGrossCalculated: number;
        totalOpenValue: number;
        totalCancelledValue: number;
        ocs: Set<string>;
        itemsCount: number;
        totalDiscount: number;
        leadTimeSum: number;
        leadTimeCount: number;
        delayedCount: number;
        allRecords: PurchaseRecord[];
        variantsSet: Set<string>;
        branchesMap: Map<
          string,
          {
            branch: string;
            ocs: Set<string>;
            itemsCount: number;
            netValue: number;
            itemValue: number;
            openValue: number;
            cancelledValue: number;
            activeValue: number;
          }
        >;
      }
    >();

    // Matriz completa de Fornecedor x Filial
    const matrixList: {
      id: string;
      supplierKey: string;
      supplierName: string;
      tradeName: string;
      branch: string;
      state: string;
      ordersCount: number;
      itemsCount: number;
      netValue: number;
      itemValue: number;
      openValue: number;
      cancelledValue: number;
      activeValue: number;
      percentOfSupplier: number;
    }[] = [];

    let totalVal = 0;

    scopedRecords.forEach((r) => {
      // Determina nome de agrupamento
      let chosenName = (r.supplier || 'Não informado').trim();
      if (groupingMode === 'unified') {
        chosenName = (r.cleanSupplier || r.supplierTradeName || r.supplier || 'Não informado').trim();
      } else if (groupingMode === 'tradeName') {
        chosenName = (r.supplierTradeName || r.supplier || 'Não informado').trim();
      }

      // Normaliza chave para evitar duplicação por espaços ou maiúsculas/minúsculas
      const normKey = chosenName.replace(/\s+/g, ' ').toUpperCase();

      const curVal = getRecordValue(r, valueBasis);

      const cur = map.get(normKey) || {
        key: normKey,
        supplier: chosenName,
        cleanSupplier: r.cleanSupplier || chosenName,
        tradeName: r.supplierTradeName || chosenName,
        state: r.supplierState || 'SP',
        totalValue: 0,
        totalNetValue: 0,
        totalItemValue: 0,
        totalGrossCalculated: 0,
        totalOpenValue: 0,
        totalCancelledValue: 0,
        ocs: new Set<string>(),
        itemsCount: 0,
        totalDiscount: 0,
        leadTimeSum: 0,
        leadTimeCount: 0,
        delayedCount: 0,
        allRecords: [] as PurchaseRecord[],
        variantsSet: new Set<string>(),
        branchesMap: new Map(),
      };

      cur.totalValue += curVal;
      cur.totalNetValue += r.netValue;
      cur.totalItemValue += r.itemValue;
      cur.totalGrossCalculated += r.grossCalculatedValue || r.itemValue || r.netValue;
      cur.totalOpenValue += r.openValue;
      cur.totalCancelledValue += r.cancelledValue;
      cur.ocs.add(`${r.branch}:::${r.orderNumber}`);
      cur.itemsCount++;
      cur.totalDiscount += r.discountValue;
      cur.allRecords.push(r);
      if (r.supplier) cur.variantsSet.add(r.supplier);

      // Agregação de filiais atendidas
      const branchName = r.branch || 'Matriz';
      const br = cur.branchesMap.get(branchName) || {
        branch: branchName,
        ocs: new Set<string>(),
        itemsCount: 0,
        netValue: 0,
        itemValue: 0,
        openValue: 0,
        cancelledValue: 0,
        activeValue: 0,
      };
      br.ocs.add(r.orderNumber);
      br.itemsCount++;
      br.netValue += r.netValue;
      br.itemValue += r.itemValue;
      br.openValue += r.openValue;
      br.cancelledValue += r.cancelledValue;
      br.activeValue += curVal;
      cur.branchesMap.set(branchName, br);

      if (r.leadTimeDays > 0) {
        cur.leadTimeSum += r.leadTimeDays;
        cur.leadTimeCount++;
      }
      if (r.isDelayed) {
        cur.delayedCount++;
      }

      totalVal += curVal;
      map.set(normKey, cur);
    });

    // Ordenação decrescente por valor para Curva ABC e Top N
    const sorted = Array.from(map.values()).sort((a, b) => b.totalValue - a.totalValue);

    // Cálculo da Curva ABC e percentual acumulado
    let runningSum = 0;
    const withPareto = sorted.map((s) => {
      runningSum += s.totalValue;
      const cumPct = totalVal > 0 ? (runningSum / totalVal) * 100 : 0;
      let abcClass: 'A' | 'B' | 'C' = 'C';
      if (cumPct <= 80 || (totalVal > 0 && s.totalValue / totalVal >= 0.2)) {
        abcClass = 'A';
      } else if (cumPct <= 95) {
        abcClass = 'B';
      } else {
        abcClass = 'C';
      }

      const ordersCount = s.ocs.size;
      const averageTicket = ordersCount > 0 ? s.totalValue / ordersCount : 0;
      const averageLeadTime = s.leadTimeCount > 0 ? Math.round(s.leadTimeSum / s.leadTimeCount) : 0;
      const delayedRate = s.itemsCount > 0 ? (s.delayedCount / s.itemsCount) * 100 : 0;
      const discountRate = s.totalValue > 0 ? (s.totalDiscount / (s.totalValue + s.totalDiscount)) * 100 : 0;

      // Lista estruturada de filiais atendidas
      const branchesBreakdown = Array.from(s.branchesMap.values())
        .map((b) => {
          const pct = s.totalValue > 0 ? (b.activeValue / s.totalValue) * 100 : 0;
          matrixList.push({
            id: `${s.key}:::${b.branch}`,
            supplierKey: s.key,
            supplierName: s.supplier,
            tradeName: s.tradeName,
            branch: b.branch,
            state: s.state,
            ordersCount: b.ocs.size,
            itemsCount: b.itemsCount,
            netValue: b.netValue,
            itemValue: b.itemValue,
            openValue: b.openValue,
            cancelledValue: b.cancelledValue,
            activeValue: b.activeValue,
            percentOfSupplier: pct,
          });

          return {
            branch: b.branch,
            ordersCount: b.ocs.size,
            itemsCount: b.itemsCount,
            netValue: b.netValue,
            itemValue: b.itemValue,
            openValue: b.openValue,
            cancelledValue: b.cancelledValue,
            activeValue: b.activeValue,
            percent: pct,
          };
        })
        .sort((a, b) => b.activeValue - a.activeValue);

      const branchesCount = branchesBreakdown.length;
      const branchesNames = branchesBreakdown.map((b) => b.branch).join(', ');

      return {
        ...s,
        ordersCount,
        averageTicket,
        averageLeadTime,
        delayedRate,
        discountRate,
        cumulativePercent: Math.min(100, Math.round(cumPct * 10) / 10),
        abcClass,
        branchesBreakdown,
        branchesCount,
        branchesNames,
        variantsCount: s.variantsSet.size,
        variantsList: Array.from(s.variantsSet),
      };
    });

    // Concentração dos Top 5
    const top5Sum = sorted.slice(0, 5).reduce((acc, curr) => acc + curr.totalValue, 0);
    const concentration = totalVal > 0 ? (top5Sum / totalVal) * 100 : 0;

    // Ordena a matriz Fornecedor x Filial por valor decrescente
    matrixList.sort((a, b) => b.activeValue - a.activeValue);

    return {
      suppliersList: withPareto,
      grandTotal: totalVal,
      top5Concentration: concentration,
      branchSupplierMatrix: matrixList,
    };
  }, [scopedRecords, groupingMode, valueBasis]);

  // Lista para o gráfico Top N
  const topSuppliersData = useMemo(() => {
    return suppliersList.slice(0, topLimit).map((s) => {
      const displayName = s.supplier;
      return {
        name: displayName.length > 20 ? `${displayName.slice(0, 18)}...` : displayName,
        fullName: displayName,
        value: s.totalValue,
        orders: s.ordersCount,
        state: s.state,
      };
    });
  }, [suppliersList, topLimit]);

  // Lista para o gráfico de Pareto
  const paretoData = useMemo(() => {
    return suppliersList.slice(0, 20).map((s) => {
      const displayName = s.supplier;
      return {
        name: displayName.length > 15 ? `${displayName.slice(0, 13)}...` : displayName,
        fullName: displayName,
        valor: s.totalValue,
        acumulado: s.cumulativePercent,
        abcClass: s.abcClass,
      };
    });
  }, [suppliersList]);

  // Tabela de fornecedores com busca
  const filteredTableData = useMemo(() => {
    if (!searchTable.trim()) return suppliersList;
    const term = searchTable.toLowerCase();
    return suppliersList.filter(
      (s) =>
        s.supplier.toLowerCase().includes(term) ||
        s.tradeName.toLowerCase().includes(term) ||
        s.state.toLowerCase().includes(term) ||
        s.branchesNames.toLowerCase().includes(term) ||
        s.variantsList.some((v) => v.toLowerCase().includes(term))
    );
  }, [suppliersList, searchTable]);

  const sortedTableData = useMemo(() => {
    return [...filteredTableData].sort((a, b) => {
      let valA = a[sortField as keyof typeof a];
      let valB = b[sortField as keyof typeof b];
      if (typeof valA === 'string') {
        valA = (valA as string).toLowerCase();
        valB = ((valB as string) || '').toLowerCase();
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredTableData, sortField, sortAsc]);

  // Tabela da Matriz Fornecedor x Filial filtrada
  const filteredMatrixData = useMemo(() => {
    if (!searchTable.trim()) return branchSupplierMatrix;
    const term = searchTable.toLowerCase();
    return branchSupplierMatrix.filter(
      (m) =>
        m.supplierName.toLowerCase().includes(term) ||
        m.branch.toLowerCase().includes(term) ||
        m.tradeName.toLowerCase().includes(term)
    );
  }, [branchSupplierMatrix, searchTable]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Dados do fornecedor inspecionado no modal
  const inspectedData = useMemo(() => {
    if (!inspectSupplier) return null;
    return suppliersList.find((s) => s.key === inspectSupplier) || null;
  }, [suppliersList, inspectSupplier]);

  // Dados do fornecedor selecionado no Painel de Diagnóstico
  const diagnosticData = useMemo(() => {
    if (!diagnosticSupplierKey && suppliersList.length > 0) {
      return suppliersList[0];
    }
    return suppliersList.find((s) => s.key === diagnosticSupplierKey) || suppliersList[0] || null;
  }, [suppliersList, diagnosticSupplierKey]);

  return (
    <div className="space-y-6">
      {/* Barra de Sub-Navegação e Modos de Visão */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setActiveSubTab('ranking')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'ranking'
                ? 'bg-white dark:bg-slate-900 text-[#0B2545] dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Visão Geral & Ranking</span>
          </button>

          <button
            onClick={() => setActiveSubTab('byBranch')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'byBranch'
                ? 'bg-white dark:bg-slate-900 text-[#0B2545] dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Fornecedores por Filial Atendida</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              {branchSupplierMatrix.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('diagnostic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'diagnostic'
                ? 'bg-white dark:bg-slate-900 text-[#0B2545] dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Diagnóstico & Conciliação com o Excel</span>
          </button>
        </div>

        {/* Filtro Rápido de Filial na própria aba */}
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Filtrar Filial:
          </span>
          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-[#1E4E8C]"
          >
            <option value="all">Todas as Filiais da Projel ({availableBranches.length})</option>
            {availableBranches.map((br) => (
              <option key={br} value={br}>
                {br}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Controles de Configuração de Cálculo e Agrupamento */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Agrupamento */}
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-[#1E4E8C] dark:text-[#8DA9C4]" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Agrupar por:
          </span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setGroupingMode('unified')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                groupingMode === 'unified'
                  ? 'bg-white dark:bg-slate-900 text-[#0B2545] dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Reúne variações de razão social e códigos ERP do mesmo fornecedor para que o valor total apareça somado"
            >
              Nome Unificado (Recomendado)
            </button>
            <button
              onClick={() => setGroupingMode('supplier')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                groupingMode === 'supplier'
                  ? 'bg-white dark:bg-slate-900 text-[#0B2545] dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Mantém a Razão Social exatamente como foi exportada pelo ERP"
            >
              Razão Social Original
            </button>
            <button
              onClick={() => setGroupingMode('tradeName')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                groupingMode === 'tradeName'
                  ? 'bg-white dark:bg-slate-900 text-[#0B2545] dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Agrupa pelo Nome Fantasia comercial"
            >
              Nome Fantasia
            </button>
          </div>
        </div>

        {/* Base de Valor */}
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Base de Valor:
          </span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setValueBasis('net')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                valueBasis === 'net'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Utiliza a coluna 'Valor Líquido' da planilha do ERP"
            >
              Valor Líquido (Padrão)
            </button>
            <button
              onClick={() => setValueBasis('item')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                valueBasis === 'item'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Utiliza a coluna 'Valor do Item' (ou Valor Bruto) da planilha"
            >
              Valor do Item (Bruto)
            </button>
            <button
              onClick={() => setValueBasis('max')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                valueBasis === 'max'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Considera o maior valor entre Líquido e Item para evitar linhas zeradas"
            >
              Maior Valor (Líq/Item)
            </button>
            <button
              onClick={() => setValueBasis('calc')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                valueBasis === 'calc'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Calcula rigorosamente Quantidade Pedida × Preço Unitário"
            >
              Qtd × Preço Unitário
            </button>
          </div>
        </div>

        {/* Resumo do Total */}
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Total Faturado no Período:{' '}
          <strong className="text-slate-900 dark:text-white tabular-nums font-bold">
            {formatCurrency(grandTotal)}
          </strong>
        </div>
      </div>

      {/* SUB-ABA 1: VISÃO GERAL E RANKING (CURVA ABC & TOP N) */}
      {activeSubTab === 'ranking' && (
        <>
          {/* Banner de Concentração e Resumo da Curva ABC */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Card Concentração Top 5 */}
            <div className="bg-gradient-to-br from-[#0B2545] to-[#13315C] text-white rounded-2xl p-5 shadow-xs border border-[#1E4E8C]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#8DA9C4] uppercase">
                  Concentração Top 5
                </span>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black tabular-nums text-white">
                  {formatPercent(top5Concentration)}
                </span>
                <span className="text-xs text-slate-300">do total faturado</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-2">
                Os 5 maiores fornecedores representam {formatPercent(top5Concentration)} do orçamento de compras.
              </p>
            </div>

            {/* Classe A (80%) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Classe A (Até 80% do valor)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  CLASSE A
                </span>
              </div>
              <div className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {suppliersList.filter((s) => s.abcClass === 'A').length} parceiros
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Fornecedores estratégicos com gestão de risco prioritária.
              </p>
            </div>

            {/* Classe B (15%) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Classe B (15% intermediários)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  CLASSE B
                </span>
              </div>
              <div className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {suppliersList.filter((s) => s.abcClass === 'B').length} parceiros
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Volume intermediário com oportunidades de padronização.
              </p>
            </div>

            {/* Classe C (5%) */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs border-l-4 border-l-blue-400">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Classe C (Cauda longa 5%)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  CLASSE C
                </span>
              </div>
              <div className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {suppliersList.filter((s) => s.abcClass === 'C').length} parceiros
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Pequenos fornecedores pontuais para otimização cadastral.
              </p>
            </div>
          </div>

          {/* Gráficos: Top Fornecedores + Curva ABC de Pareto */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top N Fornecedores por Valor */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Ranking de Maiores Fornecedores
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Fornecedores com maior faturamento
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                  {[5, 10, 20].map((num) => (
                    <button
                      key={num}
                      onClick={() => setTopLimit(num as 5 | 10 | 20)}
                      className={`px-2 py-0.5 rounded font-bold transition-colors ${
                        topLimit === num
                          ? 'bg-white dark:bg-slate-700 text-[#0B2545] dark:text-amber-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      Top {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topSuppliersData}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal stroke="#e2e8f0" opacity={0.5} />
                    <XAxis
                      type="number"
                      stroke="#64748b"
                      fontSize={11}
                      tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#64748b"
                      fontSize={11}
                      width={120}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Valor Faturado']}
                      labelFormatter={(name, payload) => {
                        const row = payload?.[0]?.payload;
                        return row ? `${row.fullName} (${row.state}) · ${row.orders} O.C.s` : name;
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
                      fill="#1E4E8C"
                      radius={[0, 4, 4, 0]}
                      onClick={(entry: any) =>
                        onApplyCrossFilter({
                          type: 'suppliers',
                          value: String(entry?.fullName || entry?.payload?.fullName || ''),
                        })
                      }
                      className="cursor-pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Curva ABC de Pareto */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#F28C28]" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Curva ABC (Diagrama de Pareto)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Valor faturado (barras) e percentual acumulado (linha)
                  </p>
                </div>
              </div>

              <div className="h-80 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={paretoData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={10}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                      height={45}
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
                      domain={[0, 100]}
                      tickFormatter={(val) => `${val}%`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val: unknown, name: unknown) => {
                        if (name === '% Acumulado') return [`${val}%`, name];
                        return [formatCurrency(Number(val) || 0), 'Faturamento'];
                      }}
                      labelFormatter={(name, payload) => {
                        const row = payload?.[0]?.payload;
                        return row ? `${row.fullName} [Classe ${row.abcClass}]` : name;
                      }}
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
                      name="Valor Faturado"
                      fill="#0B2545"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="acumulado"
                      name="% Acumulado"
                      stroke="#F28C28"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#F28C28' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tabela de Desempenho por Fornecedor com Filiais Atendidas */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Tabela de Desempenho e Indicadores por Fornecedor</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {sortedTableData.length} fornecedores
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Veja as filiais atendidas e clique em <strong className="text-blue-600 dark:text-blue-400">"Filiais"</strong> ou <strong className="text-amber-600 dark:text-amber-400">"Auditar"</strong> para conferir item a item
                </p>
              </div>

              {/* Busca interna na tabela */}
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar fornecedor, fantasia ou filial..."
                  value={searchTable}
                  onChange={(e) => setSearchTable(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#1E4E8C]"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[550px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th
                      onClick={() => toggleSort('supplier')}
                      className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <div className="flex items-center gap-1">
                        <span>Fornecedor</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="p-3 text-center">Classe</th>
                    <th
                      onClick={() => toggleSort('branchesCount')}
                      className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <div className="flex items-center gap-1 text-[#1E4E8C] dark:text-[#8DA9C4]">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Filiais Atendidas</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('ordersCount')}
                      className="p-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Nº O.C.s</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('totalValue')}
                      className="p-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 bg-amber-50/50 dark:bg-amber-950/20"
                    >
                      <div className="flex items-center justify-end gap-1 text-slate-900 dark:text-amber-300">
                        <span>Valor Base ({valueBasis === 'net' ? 'Líquido' : valueBasis === 'item' ? 'Item' : valueBasis === 'max' ? 'Maior' : 'Calculado'})</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('totalNetValue')}
                      className="p-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Vlr. Líquido (R$)</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('totalItemValue')}
                      className="p-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Vlr. Item (Bruto)</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('totalOpenValue')}
                      className="p-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <div className="flex items-center justify-end gap-1 text-amber-600 dark:text-amber-400">
                        <span>Saldo Aberto</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('totalCancelledValue')}
                      className="p-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <div className="flex items-center justify-end gap-1 text-rose-500">
                        <span>Cancelado</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('averageTicket')}
                      className="p-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Ticket Médio</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedTableData.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-6 text-center text-slate-400">
                        Nenhum fornecedor encontrado com os termos de busca.
                      </td>
                    </tr>
                  ) : (
                    sortedTableData.map((s) => {
                      const isExpanded = expandedSupplierKey === s.key;
                      return (
                        <React.Fragment key={s.key}>
                          <tr
                            className="hover:bg-amber-50/60 dark:hover:bg-amber-950/20 transition-colors"
                          >
                            <td className="p-3">
                              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{s.supplier}</span>
                                {s.variantsCount > 1 && (
                                  <span
                                    className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                    title={`Reúne ${s.variantsCount} variações cadastrais do ERP:\n${s.variantsList.join('\n')}`}
                                  >
                                    {s.variantsCount} cadastros unificados
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Fantasia: {s.tradeName} · UF: {s.state} ·{' '}
                                <strong className="text-slate-700 dark:text-slate-300 font-mono">
                                  {s.itemsCount} itens
                                </strong>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  s.abcClass === 'A'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : s.abcClass === 'B'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {s.abcClass}
                              </span>
                            </td>

                            {/* Coluna: Filiais Atendidas com Botão Expansor */}
                            <td className="p-3">
                              <div className="flex flex-col gap-1 max-w-[240px]">
                                <button
                                  type="button"
                                  onClick={() => setExpandedSupplierKey(isExpanded ? null : s.key)}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 w-fit transition-colors"
                                  title="Clique para ver o valor que o fornecedor entregou em cada filial"
                                >
                                  <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                  <span>{s.branchesCount} filial(is) atendida(s)</span>
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                                  )}
                                </button>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]" title={s.branchesNames}>
                                  {s.branchesNames}
                                </span>
                              </div>
                            </td>

                            <td className="p-3 text-right font-mono tabular-nums">{s.ordersCount}</td>
                            <td className="p-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white bg-amber-50/30 dark:bg-amber-950/10">
                              {formatCurrency(s.totalValue)}
                            </td>
                            <td className="p-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 font-semibold">
                              {formatCurrency(s.totalNetValue)}
                            </td>
                            <td className="p-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                              {formatCurrency(s.totalItemValue)}
                            </td>
                            <td className="p-3 text-right font-mono tabular-nums text-amber-600 dark:text-amber-400">
                              {formatCurrency(s.totalOpenValue)}
                            </td>
                            <td className="p-3 text-right font-mono tabular-nums text-rose-500">
                              {formatCurrency(s.totalCancelledValue)}
                            </td>
                            <td className="p-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                              {formatCurrency(s.averageTicket)}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setInspectSupplier(s.key)}
                                  className="px-2 py-1 rounded bg-[#13315C] text-white hover:bg-[#1E4E8C] text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                                  title="Auditar todas as linhas, O.C.s e filiais deste fornecedor"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Auditar</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setDiagnosticSupplierKey(s.key);
                                    setActiveSubTab('diagnostic');
                                  }}
                                  className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800"
                                  title="Conferir memória de cálculo e conciliação com o Excel"
                                >
                                  <Calculator className="w-3 h-3" />
                                  <span>Conciliar</span>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* GAVETA EXPANSÍVEL: DETALHAMENTO DE FILIAIS ATENDIDAS */}
                          {isExpanded && (
                            <tr className="bg-blue-50/50 dark:bg-blue-950/20">
                              <td colSpan={11} className="p-4 border-y border-blue-100 dark:border-blue-900/60">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Building2 className="w-4 h-4 text-[#1E4E8C] dark:text-amber-400" />
                                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                        Filiais da Projel atendidas por: {s.supplier}
                                      </h4>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                      Total do fornecedor: <strong>{formatCurrency(s.totalValue)}</strong> ({s.ordersCount} O.C.s)
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {s.branchesBreakdown.map((b) => (
                                      <div
                                        key={b.branch}
                                        className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-200 dark:border-blue-900 shadow-xs flex flex-col justify-between"
                                      >
                                        <div>
                                          <div className="flex items-start justify-between gap-1">
                                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate" title={b.branch}>
                                              {b.branch}
                                            </span>
                                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                              {formatPercent(b.percent)}
                                            </span>
                                          </div>

                                          <div className="mt-2 space-y-1 text-xs">
                                            <div className="flex items-baseline justify-between text-slate-600 dark:text-slate-300">
                                              <span>Valor Líquido:</span>
                                              <strong className="font-mono text-[#1E4E8C] dark:text-amber-400">
                                                {formatCurrency(b.netValue)}
                                              </strong>
                                            </div>
                                            <div className="flex items-baseline justify-between text-[11px] text-slate-500">
                                              <span>Valor Item (Bruto):</span>
                                              <span className="font-mono">
                                                {formatCurrency(b.itemValue)}
                                              </span>
                                            </div>
                                            <div className="flex items-baseline justify-between text-[11px] text-slate-500">
                                              <span>Pedidos / Itens:</span>
                                              <span className="font-mono font-semibold">
                                                {b.ordersCount} O.C.s · {b.itemsCount} itens
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <button
                                          onClick={() => {
                                            onApplyCrossFilter({ type: 'branches', value: b.branch });
                                            onApplyCrossFilter({ type: 'suppliers', value: s.supplier });
                                          }}
                                          className="mt-3 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 self-start"
                                          title="Filtra todo o dashboard para este fornecedor nesta filial"
                                        >
                                          <Filter className="w-3 h-3" />
                                          Filtrar nesta filial
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SUB-ABA 2: FORNECEDORES POR FILIAL ATENDIDA (MATRIZ FORNECEDOR X FILIAL) */}
      {activeSubTab === 'byBranch' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#1E4E8C] dark:text-amber-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Matriz de Fornecedores por Filial Atendida
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Visualize exatamente para quais filiais da Projel Engenharia cada fornecedor forneceu insumos e serviços.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar fornecedor ou filial..."
                  value={searchTable}
                  onChange={(e) => setSearchTable(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#1E4E8C]"
                />
              </div>

              <button
                onClick={() =>
                  exportToExcel(
                    scopedRecords,
                    `fornecedores_filiais_${new Date().toISOString().slice(0, 10)}.xlsx`
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold flex items-center gap-1.5 shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="p-3">Fornecedor</th>
                    <th className="p-3 bg-blue-50/70 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200">
                      Filial Atendida
                    </th>
                    <th className="p-3 text-right">Nº O.C.s</th>
                    <th className="p-3 text-right">Itens</th>
                    <th className="p-3 text-right font-bold text-slate-900 dark:text-white bg-amber-50/40 dark:bg-amber-950/20">
                      Valor Base (R$)
                    </th>
                    <th className="p-3 text-right">Valor Líquido (R$)</th>
                    <th className="p-3 text-right">Valor Item (Bruto)</th>
                    <th className="p-3 text-right text-amber-600">Saldo Aberto</th>
                    <th className="p-3 text-right text-rose-500">Cancelado</th>
                    <th className="p-3 text-right">% do Fornecedor</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMatrixData.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-6 text-center text-slate-400">
                        Nenhuma relação Fornecedor x Filial encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredMatrixData.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {row.supplierName}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Fantasia: {row.tradeName} · UF: {row.state}
                          </div>
                        </td>
                        <td className="p-3 font-bold text-blue-900 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-950/20">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-xs">
                            <Building2 className="w-3.5 h-3.5" />
                            {row.branch}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums">{row.ordersCount}</td>
                        <td className="p-3 text-right font-mono tabular-nums">{row.itemsCount}</td>
                        <td className="p-3 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white bg-amber-50/20 dark:bg-amber-950/10">
                          {formatCurrency(row.activeValue)}
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 font-semibold">
                          {formatCurrency(row.netValue)}
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {formatCurrency(row.itemValue)}
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums text-amber-600">
                          {formatCurrency(row.openValue)}
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums text-rose-500">
                          {formatCurrency(row.cancelledValue)}
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                          {formatPercent(row.percentOfSupplier)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setInspectSupplier(row.supplierKey)}
                              className="px-2 py-1 rounded bg-[#13315C] text-white hover:bg-[#1E4E8C] text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                              title="Auditar todas as linhas deste fornecedor"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Auditar</span>
                            </button>
                            <button
                              onClick={() => {
                                onApplyCrossFilter({ type: 'branches', value: row.branch });
                                onApplyCrossFilter({ type: 'suppliers', value: row.supplierName });
                              }}
                              className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 hover:bg-blue-100 text-[11px] font-semibold border border-blue-200 dark:border-blue-900"
                              title="Filtrar por esta Filial e Fornecedor"
                            >
                              <Filter className="w-3 h-3" />
                              <span>Filtrar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ABA 3: DIAGNÓSTICO & CONCILIAÇÃO DE CÁLCULOS DO FORNECEDOR */}
      {activeSubTab === 'diagnostic' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Auditor & Memória de Cálculo do Fornecedor
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Conferência direta com a planilha do Excel: veja exatamente como cada coluna foi somada, as filiais atendidas e se há itens cancelados.
              </p>
            </div>

            {/* Seletor do fornecedor a auditar */}
            <div className="w-full sm:w-80">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                Selecione o Fornecedor para Auditar:
              </label>
              <select
                value={diagnosticData?.key || ''}
                onChange={(e) => setDiagnosticSupplierKey(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#1E4E8C]"
              >
                {suppliersList.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.supplier} ({formatCurrency(s.totalValue)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {diagnosticData && (
            <div className="space-y-4">
              {/* Alerta de Auditoria Explicativo */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-sm">
                    Por que a soma no Excel pode parecer diferente à primeira vista?
                  </div>
                  <p>
                    <strong>1. Filtro de Filial:</strong> Este fornecedor atendeu a{' '}
                    <strong>{diagnosticData.branchesBreakdown.length} filial(is)</strong>. Se no Excel você filtrou ou somou todas as filiais juntas, confira o total consolidado abaixo.
                  </p>
                  <p>
                    <strong>2. Valor Líquido vs Valor do Item (Bruto):</strong> Algumas linhas possuem descontos ou impostos. Abaixo você pode comparar a soma da coluna "Valor Líquido" (<strong>{formatCurrency(diagnosticData.totalNetValue)}</strong>) com a coluna "Valor do Item" (<strong>{formatCurrency(diagnosticData.totalItemValue)}</strong>).
                  </p>
                  <p>
                    <strong>3. Pedidos Cancelados:</strong> Há{' '}
                    <strong>{formatCurrency(diagnosticData.totalCancelledValue)}</strong> em pedidos cancelados. Se a sua fórmula do Excel somou a coluna inteira sem filtrar a coluna Situação, os valores cancelados estavam somados no Excel.
                  </p>
                </div>
              </div>

              {/* Grid de Métricas Conciliadas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] text-slate-500 font-semibold uppercase">
                    Soma Valor Líquido
                  </span>
                  <div className="text-lg font-black text-[#1E4E8C] dark:text-amber-400 tabular-nums mt-1">
                    {formatCurrency(diagnosticData.totalNetValue)}
                  </div>
                  <span className="text-[10px] text-slate-400">Coluna 'Valor Líquido'</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] text-slate-500 font-semibold uppercase">
                    Soma Valor do Item
                  </span>
                  <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums mt-1">
                    {formatCurrency(diagnosticData.totalItemValue)}
                  </div>
                  <span className="text-[10px] text-slate-400">Coluna 'Valor do Item'</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] text-slate-500 font-semibold uppercase">
                    Qtd × Preço Unitário
                  </span>
                  <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums mt-1">
                    {formatCurrency(diagnosticData.totalGrossCalculated)}
                  </div>
                  <span className="text-[10px] text-slate-400">Calculado linha a linha</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] text-slate-500 font-semibold uppercase">
                    Saldo em Aberto
                  </span>
                  <div className="text-lg font-black text-amber-600 dark:text-amber-400 tabular-nums mt-1">
                    {formatCurrency(diagnosticData.totalOpenValue)}
                  </div>
                  <span className="text-[10px] text-slate-400">Ainda não entregue</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] text-slate-500 font-semibold uppercase">
                    Valor Cancelado
                  </span>
                  <div className="text-lg font-black text-rose-600 tabular-nums mt-1">
                    {formatCurrency(diagnosticData.totalCancelledValue)}
                  </div>
                  <span className="text-[10px] text-slate-400">O.C.s canceladas</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                  <span className="text-[11px] text-slate-500 font-semibold uppercase">
                    Total de Itens Lidos
                  </span>
                  <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 tabular-nums mt-1">
                    {diagnosticData.allRecords.length} linhas
                  </div>
                  <span className="text-[10px] text-slate-400">{diagnosticData.ordersCount} O.C.s distintas</span>
                </div>
              </div>

              {/* Detalhamento por Filial do Fornecedor */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#1E4E8C] dark:text-amber-400" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Filiais Atendidas por este Fornecedor ({diagnosticData.branchesBreakdown.length} filiais)
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500">
                    Confira quanto foi faturado em cada obra/filial da Projel
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {diagnosticData.branchesBreakdown.map((b) => (
                    <div
                      key={b.branch}
                      className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {b.branch}
                          </span>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {formatPercent(b.percent)}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Valor Líquido:</span>
                            <strong className="font-mono text-[#1E4E8C] dark:text-amber-400">
                              {formatCurrency(b.netValue)}
                            </strong>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Valor Item:</span>
                            <span className="font-mono">{formatCurrency(b.itemValue)}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500">
                            <span>Pedidos:</span>
                            <span className="font-mono font-semibold">
                              {b.ordersCount} O.C.s ({b.itemsCount} itens)
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onApplyCrossFilter({ type: 'branches', value: b.branch });
                          onApplyCrossFilter({ type: 'suppliers', value: diagnosticData.supplier });
                        }}
                        className="mt-3 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 self-start"
                      >
                        <Filter className="w-3 h-3" />
                        Filtrar dashboard nesta filial
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ações e Exportação */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Total de {diagnosticData.allRecords.length} linhas lidas da planilha original para este fornecedor.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      exportToExcel(
                        diagnosticData.allRecords,
                        `conciliacao_${diagnosticData.supplier.slice(0, 20)}.xlsx`
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Exportar Linhas deste Fornecedor (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => setInspectSupplier(diagnosticData.key)}
                    className="px-3 py-1.5 rounded-lg bg-[#0B2545] text-white hover:bg-[#13315C] text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Abrir Tabela Linha a Linha</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE AUDITORIA E DRILL-DOWN DO FORNECEDOR */}
      {inspectedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Cabeçalho do Modal */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950 uppercase">
                    Auditoria de Fornecedor
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {inspectedData.supplier}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Fantasia: <strong>{inspectedData.tradeName}</strong> · Estado: {inspectedData.state} ·{' '}
                  <strong className="text-slate-900 dark:text-white tabular-nums">
                    {inspectedData.allRecords.length}
                  </strong>{' '}
                  linhas / itens lidos na planilha
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    exportToExcel(
                      inspectedData.allRecords,
                      `auditoria_${inspectedData.supplier.slice(0, 20)}.xlsx`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold flex items-center gap-1.5"
                  title="Exportar apenas as linhas deste fornecedor para Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Exportar Linhas (.xlsx)</span>
                </button>
                <button
                  onClick={() => setInspectSupplier(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Cards de Totais Calculados */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs">
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 font-semibold uppercase">
                  Soma Valor Líquido
                </span>
                <div className="text-base font-extrabold text-[#1E4E8C] dark:text-amber-400 tabular-nums mt-0.5">
                  {formatCurrency(inspectedData.totalNetValue)}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 font-semibold uppercase">
                  Soma Valor do Item (Bruto)
                </span>
                <div className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums mt-0.5">
                  {formatCurrency(inspectedData.totalItemValue)}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 font-semibold uppercase">
                  Filiais Atendidas
                </span>
                <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums mt-0.5">
                  {inspectedData.branchesBreakdown.length} filial(is)
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 font-semibold uppercase">
                  Saldo em Aberto
                </span>
                <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
                  {formatCurrency(inspectedData.totalOpenValue)}
                </div>
              </div>
            </div>

            {/* SEÇÃO ESPECIAL: Detalhamento por Filial Atendida */}
            <div className="p-4 bg-blue-50/40 dark:bg-blue-950/20 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-[#1E4E8C] dark:text-amber-400" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Filiais da Projel Atendidas por {inspectedData.supplier}
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {inspectedData.branchesBreakdown.map((b) => (
                  <div
                    key={b.branch}
                    className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-200/80 dark:border-blue-900/60 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {b.branch}
                        </span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {formatPercent(b.percent)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between text-xs">
                        <span className="text-slate-500 text-[11px]">Valor Líquido:</span>
                        <span className="font-bold font-mono text-[#1E4E8C] dark:text-amber-400">
                          {formatCurrency(b.netValue)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between text-[11px] text-slate-500">
                        <span>Pedidos / Itens:</span>
                        <span className="font-mono">
                          {b.ordersCount} O.C.s · {b.itemsCount} itens
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onApplyCrossFilter({ type: 'branches', value: b.branch });
                        setInspectSupplier(null);
                      }}
                      className="mt-2 text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 self-start"
                    >
                      <Filter className="w-3 h-3" />
                      Filtrar dashboard por esta filial
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabela Linha a Linha */}
            <div className="overflow-x-auto p-4 flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 shadow-xs">
                  <tr>
                    <th className="p-2.5">Nº O.C.</th>
                    <th className="p-2.5">Seq.</th>
                    <th className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200">
                      Filial
                    </th>
                    <th className="p-2.5">Emissão</th>
                    <th className="p-2.5">Situação</th>
                    <th className="p-2.5">Item / Serviço</th>
                    <th className="p-2.5 text-right">Qtd Pedida</th>
                    <th className="p-2.5 text-right">Preço Unit.</th>
                    <th className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                      Valor Líquido
                    </th>
                    <th className="p-2.5 text-right">Valor Item</th>
                    <th className="p-2.5 text-right">Saldo Aberto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {inspectedData.allRecords.map((item, idx) => (
                    <tr
                      key={item.id || idx}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white font-mono">
                        {item.orderNumber}
                      </td>
                      <td className="p-2.5 font-mono">{item.seq}</td>
                      <td className="p-2.5 truncate max-w-[130px] font-semibold text-blue-900 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-950/20" title={item.branch}>
                        {item.branch}
                      </td>
                      <td className="p-2.5 font-mono tabular-nums text-slate-500">
                        {item.issueDateStr}
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            item.statusGroup === 'Cancelada'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : item.statusGroup === 'Atendida/Encerrada'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-2.5 truncate max-w-[200px]" title={item.service}>
                        {item.service}
                      </td>
                      <td className="p-2.5 text-right font-mono tabular-nums">
                        {formatNumber(item.qtyRequested)} {item.unit}
                      </td>
                      <td className="p-2.5 text-right font-mono tabular-nums">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="p-2.5 text-right font-mono tabular-nums font-bold text-[#1E4E8C] dark:text-amber-400">
                        {formatCurrency(item.netValue)}
                      </td>
                      <td className="p-2.5 text-right font-mono tabular-nums text-slate-500">
                        {formatCurrency(item.itemValue)}
                      </td>
                      <td className="p-2.5 text-right font-mono tabular-nums text-amber-600">
                        {formatCurrency(item.openValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/40">
              <button
                onClick={() => setInspectSupplier(null)}
                className="px-4 py-2 rounded-xl bg-[#0B2545] text-white hover:bg-[#13315C] text-xs font-semibold"
              >
                Fechar Auditoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
