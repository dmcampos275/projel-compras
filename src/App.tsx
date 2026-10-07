/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  Users,
  Layers,
  Building2,
  Clock,
  UserCheck,
  Table,
  Upload,
  AlertCircle,
  Briefcase,
  GitCompare,
} from 'lucide-react';
import {
  PurchaseRecord,
  MappingReport,
  FilterState,
  ActiveTab,
  CrossFilterAction,
  RecordOrigin,
  OriginFilter,
  CalculationBasis,
} from './types/purchases';
import { parsePurchasesFile, exportToExcel, exportToCSV } from './utils/excelParser';
import {
  generateComprasDemoData,
  generateServicosDemoData,
} from './utils/demoData';
import { calculateKPIs } from './utils/kpiCalculator';
import {
  saveBaseData,
  loadBaseData,
  loadBaseDataAsync,
  saveBaseDataToFirestore,
  clearAllSavedData,
  saveThemePreference,
  loadThemePreference,
} from './utils/storage';
import { testConnection } from './firebase/config';

// Componentes
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { GlobalFilters } from './components/GlobalFilters';
import { ActiveFilterChips } from './components/ActiveFilterChips';
import { KPICards } from './components/KPICards';
import { MappingModal } from './components/MappingModal';
import { ReconciliationModal } from './components/ReconciliationModal';

// Abas Analíticas
import { OverviewTab } from './components/tabs/OverviewTab';
import { SuppliersTab } from './components/tabs/SuppliersTab';
import { FamiliesItemsTab } from './components/tabs/FamiliesItemsTab';
import { CostCenterTab } from './components/tabs/CostCenterTab';
import { LeadTimesTab } from './components/tabs/LeadTimesTab';
import { BuyersTab } from './components/tabs/BuyersTab';
import { DetailsTab } from './components/tabs/DetailsTab';
import { ServicesTab } from './components/tabs/ServicesTab';
import { ComparisonTab } from './components/tabs/ComparisonTab';

const INITIAL_FILTERS: FilterState = {
  dateRange: { start: '', end: '' },
  branches: [],
  suppliers: [],
  families: [],
  costCenters: [],
  buyers: [],
  statuses: [],
  supplierStates: [],
};

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadThemePreference());

  // Bases de Dados Independentes: Compras e Serviços Realizados
  const [comprasRecords, setComprasRecords] = useState<PurchaseRecord[]>([]);
  const [comprasReport, setComprasReport] = useState<MappingReport | null>(null);

  const [servicosRecords, setServicosRecords] = useState<PurchaseRecord[]>([]);
  const [servicosReport, setServicosReport] = useState<MappingReport | null>(null);

  // Filtro Global de Origem: 'Compras' | 'Serviços' | 'Consolidado'
  const [originFilter, setOriginFilter] = useState<OriginFilter>('Consolidado');

  // Base de Cálculo Global e Exclusão de Ordens Canceladas da Soma
  const [calculationBasis, setCalculationBasis] = useState<CalculationBasis>('net');
  const [excludeCancelled, setExcludeCancelled] = useState<boolean>(false);

  // Status de conexão e sincronização com o Cloud Firestore
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);
  const [isSyncingWithFirestore, setIsSyncingWithFirestore] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [showUploadView, setShowUploadView] = useState(false);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);
  const [mappingModalOrigin, setMappingModalOrigin] = useState<RecordOrigin>('Compras');

  // Inicializa tema no HTML element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveThemePreference(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Carrega do Cloud Firestore na inicialização (com fallback para cache local)
  useEffect(() => {
    let isMounted = true;

    async function initializeFromFirestore() {
      // 1. Testa conectividade com Firestore
      const isOnline = await testConnection();
      if (isMounted) setIsFirestoreConnected(isOnline);

      setIsSyncingWithFirestore(true);
      try {
        const [cloudCompras, cloudServicos] = await Promise.all([
          loadBaseDataAsync('Compras'),
          loadBaseDataAsync('Serviços'),
        ]);

        if (!isMounted) return;

        let loadedAny = false;

        if (cloudCompras && cloudCompras.records.length > 0) {
          setComprasRecords(cloudCompras.records);
          setComprasReport(cloudCompras.report);
          loadedAny = true;
        }

        if (cloudServicos && cloudServicos.records.length > 0) {
          setServicosRecords(cloudServicos.records);
          setServicosReport(cloudServicos.report);
          loadedAny = true;
        }

        if (!loadedAny) {
          // Inicia com o conjunto completo de demonstração da Projel (Compras + Serviços)
          const demoCompras = generateComprasDemoData();
          const demoServicos = generateServicosDemoData();

          setComprasRecords(demoCompras.records);
          setComprasReport(demoCompras.report);
          setServicosRecords(demoServicos.records);
          setServicosReport(demoServicos.report);
          setOriginFilter('Consolidado');

          // Persiste os dados iniciais no Firestore
          await Promise.all([
            saveBaseDataToFirestore('Compras', demoCompras.records, demoCompras.report),
            saveBaseDataToFirestore('Serviços', demoServicos.records, demoServicos.report),
          ]);
        } else {
          if (cloudCompras && cloudServicos) {
            setOriginFilter('Consolidado');
          } else if (cloudCompras) {
            setOriginFilter('Compras');
          } else if (cloudServicos) {
            setOriginFilter('Serviços');
          }
        }
      } catch (err) {
        console.warn('Erro ao sincronizar bases com Firestore:', err);
      } finally {
        if (isMounted) setIsSyncingWithFirestore(false);
      }
    }

    initializeFromFirestore();

    return () => {
      isMounted = false;
    };
  }, []);

  // Processamento do upload independente por Origem
  const handleFileSelected = async (file: File, origin: RecordOrigin) => {
    setIsLoading(true);
    setError(null);
    try {
      const otherReport = origin === 'Compras' ? servicosReport : comprasReport;
      const otherHeaders = otherReport ? otherReport.recognizedColumns.map((c) => c.matchedHeader) : undefined;

      const result = await parsePurchasesFile(file, file.name, origin, undefined, otherHeaders);

      if (result.records.length === 0) {
        throw new Error(`Nenhuma linha válida foi encontrada na planilha de ${origin}.`);
      }

      setIsSyncingWithFirestore(true);
      if (origin === 'Compras') {
        setComprasRecords(result.records);
        setComprasReport(result.report);
        await saveBaseDataToFirestore('Compras', result.records, result.report);
        if (servicosRecords.length > 0) {
          setOriginFilter('Consolidado');
        } else {
          setOriginFilter('Compras');
        }
      } else {
        setServicosRecords(result.records);
        setServicosReport(result.report);
        await saveBaseDataToFirestore('Serviços', result.records, result.report);
        if (comprasRecords.length > 0) {
          setOriginFilter('Consolidado');
        } else {
          setOriginFilter('Serviços');
        }
      }

      setFilters(INITIAL_FILTERS);
      setShowUploadView(false);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : `Erro ao processar a planilha de ${origin}.`;
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsSyncingWithFirestore(false);
    }
  };

  // Carrega demonstração sob demanda
  const handleLoadDemo = async (target: 'both' | 'compras' | 'servicos' = 'both') => {
    setIsLoading(true);
    setIsSyncingWithFirestore(true);
    setError(null);
    try {
      const promises: Promise<any>[] = [];

      if (target === 'both' || target === 'compras') {
        const demo = generateComprasDemoData();
        setComprasRecords(demo.records);
        setComprasReport(demo.report);
        promises.push(saveBaseDataToFirestore('Compras', demo.records, demo.report));
      }

      if (target === 'both' || target === 'servicos') {
        const demo = generateServicosDemoData();
        setServicosRecords(demo.records);
        setServicosReport(demo.report);
        promises.push(saveBaseDataToFirestore('Serviços', demo.records, demo.report));
      }

      await Promise.all(promises);

      if (target === 'both') {
        setOriginFilter('Consolidado');
      } else if (target === 'compras') {
        setOriginFilter('Compras');
      } else {
        setOriginFilter('Serviços');
      }

      setFilters(INITIAL_FILTERS);
      setShowUploadView(false);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar dados de demonstração.');
    } finally {
      setIsLoading(false);
      setIsSyncingWithFirestore(false);
    }
  };

  // Limpa todos os dados salvos
  const handleClearAllData = () => {
    clearAllSavedData();
    setComprasRecords([]);
    setComprasReport(null);
    setServicosRecords([]);
    setServicosReport(null);
    setFilters(INITIAL_FILTERS);
    setShowUploadView(true);
  };

  // Ajuste automático do filtro de origem caso uma base seja removida ou apenas uma esteja disponível
  useEffect(() => {
    const hasCompras = comprasRecords.length > 0;
    const hasServicos = servicosRecords.length > 0;

    if (hasCompras && hasServicos) {
      if (!originFilter) setOriginFilter('Consolidado');
    } else if (hasCompras && !hasServicos) {
      if (originFilter !== 'Compras') setOriginFilter('Compras');
    } else if (!hasCompras && hasServicos) {
      if (originFilter !== 'Serviços') setOriginFilter('Serviços');
    }
  }, [comprasRecords.length, servicosRecords.length, originFilter]);

  // Deduplicação no modo Consolidado por Filial + Nº Ordem Compra + Seq. (Prioridade: Compras)
  const { activeBaseRecords, duplicateRowsCount } = useMemo(() => {
    if (originFilter === 'Compras') {
      return { activeBaseRecords: comprasRecords, duplicateRowsCount: 0 };
    }
    if (originFilter === 'Serviços') {
      return { activeBaseRecords: servicosRecords, duplicateRowsCount: 0 };
    }

    // Modo Consolidado: Se a mesma linha aparecer nas duas planilhas (Filial + O.C. + Seq.),
    // manter a primeira ocorrência (prioridade: Compras) e contar as duplicatas.
    const seenKeys = new Set<string>();
    const consolidatedList: PurchaseRecord[] = [];
    let duplicates = 0;

    // 1. Prioridade Compras
    for (const rec of comprasRecords) {
      const key = `${rec.branch}:::${rec.orderNumber}:::${rec.seq}`;
      seenKeys.add(key);
      consolidatedList.push(rec);
    }

    // 2. Serviços adicionados apenas se não duplicados
    for (const rec of servicosRecords) {
      const key = `${rec.branch}:::${rec.orderNumber}:::${rec.seq}`;
      if (seenKeys.has(key)) {
        duplicates++;
      } else {
        seenKeys.add(key);
        consolidatedList.push(rec);
      }
    }

    return { activeBaseRecords: consolidatedList, duplicateRowsCount: duplicates };
  }, [originFilter, comprasRecords, servicosRecords]);

  // Filtragem global reativa e memoizada para alta performance
  const filteredRecords = useMemo(() => {
    if (activeBaseRecords.length === 0) return [];

    const { dateRange, branches, suppliers, families, costCenters, buyers, statuses, supplierStates } = filters;

    const startDate = dateRange.start ? new Date(dateRange.start + 'T00:00:00') : null;
    const endDate = dateRange.end ? new Date(dateRange.end + 'T23:59:59') : null;

    return activeBaseRecords.filter((r) => {
      // Filtro de Data de Emissão
      if (r.issueDate) {
        if (startDate && r.issueDate < startDate) return false;
        if (endDate && r.issueDate > endDate) return false;
      }

      // Filtro de Filial
      if (branches.length > 0 && !branches.includes(r.branch)) return false;

      // Filtro de Fornecedor
      if (suppliers.length > 0 && !suppliers.includes(r.supplier)) return false;

      // Filtro de Família
      if (families.length > 0 && !families.includes(r.family)) return false;

      // Filtro de Centro de Custo
      if (costCenters.length > 0 && !costCenters.includes(r.costCenter)) return false;

      // Filtro de Comprador
      if (buyers.length > 0 && !buyers.includes(r.buyer)) return false;

      // Filtro de Situação
      if (statuses.length > 0 && !statuses.includes(r.status)) return false;

      // Filtro de UF do Fornecedor
      if (supplierStates.length > 0 && !supplierStates.includes(r.supplierState)) return false;

      return true;
    });
  }, [activeBaseRecords, filters]);

  // Cálculo memoizado dos 10 KPIs e Retenções com base parametrizada e controle de canceladas
  const kpis = useMemo(() => {
    return calculateKPIs(filteredRecords, calculationBasis, excludeCancelled);
  }, [filteredRecords, calculationBasis, excludeCancelled]);

  // Aplicação de Cross-Filtering a partir de cliques em gráficos
  const handleApplyCrossFilter = useCallback((action: CrossFilterAction) => {
    setFilters((prev) => {
      const currentList = (prev[action.type] as string[]) || [];
      if (currentList.includes(action.value)) {
        return prev;
      }
      return {
        ...prev,
        [action.type]: [...currentList, action.value],
      };
    });
  }, []);

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  // Exportações
  const handleExportExcel = () => {
    const suffix = originFilter.toLowerCase();
    exportToExcel(filteredRecords, `projel_${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportCSV = () => {
    const suffix = originFilter.toLowerCase();
    exportToCSV(filteredRecords, `projel_${suffix}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handlePrintDashboard = () => {
    window.print();
  };

  const tabsConfig = [
    { id: 'overview' as ActiveTab, label: 'Visão Geral', icon: BarChart3 },
    { id: 'suppliers' as ActiveTab, label: 'Fornecedores & Prestadores', icon: Users },
    { id: 'families' as ActiveTab, label: 'Famílias & Itens', icon: Layers },
    { id: 'costCenters' as ActiveTab, label: 'Centro de Custo', icon: Building2 },
    {
      id: 'leadTimes' as ActiveTab,
      label: 'Prazos & Entregas',
      icon: Clock,
      badge: kpis.delayedCount > 0 ? `${kpis.delayedCount}` : undefined,
      badgeColor: 'bg-red-500 text-white',
    },
    { id: 'buyers' as ActiveTab, label: 'Compradores & Gestores', icon: UserCheck },
    {
      id: 'services' as ActiveTab,
      label: 'Serviços Realizados',
      icon: Briefcase,
      badge: servicosRecords.length > 0 ? `${servicosRecords.length}` : undefined,
      badgeColor: 'bg-[#F28C28] text-white',
    },
    {
      id: 'comparison' as ActiveTab,
      label: 'Comparativo Compras x Serviços',
      icon: GitCompare,
      badge: comprasRecords.length > 0 && servicosRecords.length > 0 ? 'Misto' : undefined,
      badgeColor: 'bg-[#0B2545] text-white',
    },
    {
      id: 'details' as ActiveTab,
      label: 'Dados Detalhados',
      icon: Table,
      badge: `${filteredRecords.length.toLocaleString('pt-BR')}`,
      badgeColor: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
  ];

  const hasAnyLoaded = comprasRecords.length > 0 || servicosRecords.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Cabeçalho Fixo Corporativo com Seletor Global de Origem e Base de Cálculo */}
      <Header
        comprasReport={comprasReport}
        servicosReport={servicosReport}
        originFilter={originFilter}
        onOriginChange={setOriginFilter}
        calculationBasis={calculationBasis}
        onCalculationBasisChange={setCalculationBasis}
        excludeCancelled={excludeCancelled}
        onToggleExcludeCancelled={() => setExcludeCancelled((prev) => !prev)}
        comprasCount={comprasRecords.length}
        servicosCount={servicosRecords.length}
        totalCount={comprasRecords.length + servicosRecords.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenUpload={() => setShowUploadView(true)}
        onOpenMappingReport={(orig) => {
          setMappingModalOrigin(orig || (originFilter === 'Serviços' ? 'Serviços' : 'Compras'));
          setIsMappingModalOpen(true);
        }}
        onOpenReconciliation={() => setIsReconciliationModalOpen(true)}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        onPrintDashboard={handlePrintDashboard}
        isFirestoreConnected={isFirestoreConnected}
        isSyncing={isSyncingWithFirestore}
      />

      {/* Modal/Visão de Upload Independente de Compras e Serviços */}
      {showUploadView && (
        <div className="no-print">
          <FileUpload
            onFileSelected={handleFileSelected}
            onLoadDemoData={handleLoadDemo}
            onClearAllData={handleClearAllData}
            isLoading={isLoading}
            error={error}
            comprasReport={comprasReport}
            servicosReport={servicosReport}
            onContinueToDashboard={() => setShowUploadView(false)}
          />
        </div>
      )}

      {/* Visão Principal do Dashboard */}
      {!showUploadView && (
        <main className="flex-1 pb-16">
          {/* Barra de Filtros Globais */}
          <GlobalFilters
            filters={filters}
            onFilterChange={setFilters}
            onResetFilters={handleResetFilters}
            records={activeBaseRecords}
            originFilter={originFilter}
            onOriginChange={setOriginFilter}
            hasCompras={comprasRecords.length > 0}
            hasServicos={servicosRecords.length > 0}
          />

          {/* Chips de Cross-Filtering Ativos */}
          <ActiveFilterChips
            filters={filters}
            onFilterChange={setFilters}
            onClearAll={handleResetFilters}
          />

          {/* Grid de 10 Cards de KPI Executivos + Retenções */}
          <KPICards kpis={kpis} />

          {/* Alerta discreto de deduplicação no modo Consolidado (Requisito 4) */}
          {originFilter === 'Consolidado' && duplicateRowsCount > 0 && (
            <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 mt-2 no-print">
              <div className="px-3.5 py-1.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-700 dark:text-blue-300 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <strong>Deduplicação Ativa:</strong> {duplicateRowsCount} linhas duplicadas entre as bases (mesma Filial + Nº Ordem + Seq.). Mantida a ocorrência prioritária da base de Compras.
                </span>
                <span className="text-[10px] text-blue-500 font-semibold">Integridade garantida</span>
              </div>
            </div>
          )}

          {/* Navegação por Abas Analíticas */}
          <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 mt-2 no-print">
            <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
              {tabsConfig.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3 px-4 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
                      isActive
                        ? 'border-amber-500 text-slate-950 dark:text-white bg-white dark:bg-slate-900 shadow-xs'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${tab.badgeColor}`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conteúdo da Aba Selecionada */}
          <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
            {!hasAnyLoaded ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs my-6">
                <Upload className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Nenhuma planilha foi carregada ainda
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Carregue a planilha de Compras e/ou Serviços Realizados ou utilize os dados de demonstração.
                </p>
                <button
                  onClick={() => setShowUploadView(true)}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-bold shadow-md"
                >
                  Abrir Central de Upload
                </button>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs my-6">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Nenhum registro coincide com os filtros aplicados na base de {originFilter}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Tente alterar as datas ou limpar alguns dos filtros selecionados para visualizar os dados.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#0B2545] text-white hover:bg-[#13315C] text-xs font-semibold"
                >
                  Limpar todos os filtros
                </button>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <OverviewTab
                    records={filteredRecords}
                    onApplyCrossFilter={handleApplyCrossFilter}
                    calculationBasis={calculationBasis}
                    excludeCancelled={excludeCancelled}
                  />
                )}
                {activeTab === 'suppliers' && (
                  <SuppliersTab
                    records={filteredRecords}
                    onApplyCrossFilter={handleApplyCrossFilter}
                    globalBasis={calculationBasis}
                    globalExcludeCancelled={excludeCancelled}
                  />
                )}
                {activeTab === 'families' && (
                  <FamiliesItemsTab records={filteredRecords} onApplyCrossFilter={handleApplyCrossFilter} />
                )}
                {activeTab === 'costCenters' && (
                  <CostCenterTab records={filteredRecords} onApplyCrossFilter={handleApplyCrossFilter} />
                )}
                {activeTab === 'leadTimes' && (
                  <LeadTimesTab records={filteredRecords} onApplyCrossFilter={handleApplyCrossFilter} />
                )}
                {activeTab === 'buyers' && (
                  <BuyersTab records={filteredRecords} onApplyCrossFilter={handleApplyCrossFilter} />
                )}
                {activeTab === 'services' && (
                  <ServicesTab
                    records={servicosRecords}
                    onApplyCrossFilter={handleApplyCrossFilter}
                  />
                )}
                {activeTab === 'comparison' && (
                  <ComparisonTab
                    comprasRecords={comprasRecords}
                    servicosRecords={servicosRecords}
                    onApplyCrossFilter={handleApplyCrossFilter}
                    onOpenUpload={() => setShowUploadView(true)}
                  />
                )}
                {activeTab === 'details' && (
                  <DetailsTab
                    records={filteredRecords}
                    onExportExcel={handleExportExcel}
                    onExportCSV={handleExportCSV}
                  />
                )}
              </>
            )}
          </div>
        </main>
      )}

      {/* Modal de Auditoria de Mapeamento de Colunas */}
      <MappingModal
        comprasReport={comprasReport}
        servicosReport={servicosReport}
        initialOrigin={mappingModalOrigin}
        isOpen={isMappingModalOpen}
        onClose={() => setIsMappingModalOpen(false)}
      />

      {/* Modal de Conciliação Financeira de Valores e Auditoria da Planilha */}
      <ReconciliationModal
        isOpen={isReconciliationModalOpen}
        onClose={() => setIsReconciliationModalOpen(false)}
        comprasReport={comprasReport}
        servicosReport={servicosReport}
        comprasRecords={comprasRecords}
        servicosRecords={servicosRecords}
        currentBasis={calculationBasis}
        currentExcludeCancelled={excludeCancelled}
        onApplyBasisChange={(b, exc) => {
          setCalculationBasis(b);
          setExcludeCancelled(exc);
        }}
      />
    </div>
  );
}
