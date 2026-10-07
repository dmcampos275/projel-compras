import React from 'react';
import {
  FileSpreadsheet,
  Upload,
  Printer,
  Download,
  Sun,
  Moon,
  Info,
  Building2,
  Calendar,
  Layers,
  CheckCircle2,
  Briefcase,
  Package,
  Calculator,
  Database,
  RefreshCw,
} from 'lucide-react';
import { MappingReport, OriginFilter, RecordOrigin, CalculationBasis } from '../types/purchases';

interface HeaderProps {
  comprasReport: MappingReport | null;
  servicosReport: MappingReport | null;
  originFilter: OriginFilter;
  onOriginChange: (origin: OriginFilter) => void;
  calculationBasis: CalculationBasis;
  onCalculationBasisChange: (basis: CalculationBasis) => void;
  excludeCancelled: boolean;
  onToggleExcludeCancelled: () => void;
  comprasCount: number;
  servicosCount: number;
  totalCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenUpload: () => void;
  onOpenMappingReport: (origin?: RecordOrigin) => void;
  onOpenReconciliation: () => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
  onPrintDashboard: () => void;
  isFirestoreConnected?: boolean;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  comprasReport,
  servicosReport,
  originFilter,
  onOriginChange,
  calculationBasis,
  onCalculationBasisChange,
  excludeCancelled,
  onToggleExcludeCancelled,
  comprasCount,
  servicosCount,
  totalCount,
  theme,
  onToggleTheme,
  onOpenUpload,
  onOpenMappingReport,
  onOpenReconciliation,
  onExportExcel,
  onExportCSV,
  onPrintDashboard,
  isFirestoreConnected = true,
  isSyncing = false,
}) => {
  const hasCompras = comprasCount > 0;
  const hasServicos = servicosCount > 0;
  const hasBoth = hasCompras && hasServicos;
  const hasAny = hasCompras || hasServicos;

  return (
    <header className="bg-[#0B2545] text-white border-b border-[#13315C] sticky top-0 z-30 shadow-md">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Lado Esquerdo: Marca Projel Engenharia + Indicador de Conexão Firestore */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E4E8C] to-[#F28C28] flex items-center justify-center shadow-inner">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white">
                Projel Engenharia
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#13315C] text-[#8DA9C4] font-semibold border border-[#1E4E8C]/40">
                Compras & Serviços
              </span>
              <div
                className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#07182C] text-[10px] font-bold border border-slate-700/60"
                title="Google Cloud Firestore conectado (ai-studio-dashboarddecompr-0453bac4-33e2-4b5d-bab9-d48dca6e632a)"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                    <span className="text-amber-300">Sincronizando Nuvem...</span>
                  </>
                ) : isFirestoreConnected ? (
                  <>
                    <Database className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-300">Firestore Ativo</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-400">Off-line</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-300 hidden sm:block">
              Gestão de Suprimentos, Contratos e Subempreitadas
            </p>
          </div>
        </div>

        {/* Centro: Seletor Global de Origem [Compras] [Serviços] [Consolidado] + Base de Cálculo */}
        {hasAny && (
          <div className="flex flex-col md:flex-row items-center gap-2 shrink-0">
            {/* Seletor de Origem */}
            <div className="bg-[#13315C] p-1 rounded-xl border border-slate-700/60 flex items-center shadow-inner">
              <button
                type="button"
                disabled={!hasCompras}
                onClick={() => onOriginChange('Compras')}
                title={hasCompras ? 'Visualizar apenas base de Compras (materiais)' : 'Carregue a Planilha de Compras para habilitar'}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  originFilter === 'Compras'
                    ? 'bg-[#1E4E8C] text-white shadow-xs border border-blue-400/40'
                    : hasCompras
                    ? 'text-slate-300 hover:text-white hover:bg-white/5'
                    : 'text-slate-500 opacity-40 cursor-not-allowed'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-blue-300" />
                <span>Compras</span>
                {hasCompras && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-900/80 text-blue-200 tabular-nums font-mono">
                    {comprasCount.toLocaleString('pt-BR')}
                  </span>
                )}
              </button>

              <button
                type="button"
                disabled={!hasServicos}
                onClick={() => onOriginChange('Serviços')}
                title={hasServicos ? 'Visualizar apenas base de Serviços Realizados (contratos/subempreitadas)' : 'Carregue a Planilha de Serviços para habilitar'}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  originFilter === 'Serviços'
                    ? 'bg-[#F28C28] text-slate-950 shadow-xs font-black'
                    : hasServicos
                    ? 'text-slate-300 hover:text-white hover:bg-white/5'
                    : 'text-slate-500 opacity-40 cursor-not-allowed'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-amber-300" />
                <span>Serviços</span>
                {hasServicos && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/80 text-amber-200 tabular-nums font-mono">
                    {servicosCount.toLocaleString('pt-BR')}
                  </span>
                )}
              </button>

              <button
                type="button"
                disabled={!hasBoth}
                onClick={() => onOriginChange('Consolidado')}
                title={hasBoth ? 'Consolidar ambas as bases (Compras + Serviços)' : 'Requer que ambas as bases (Compras e Serviços) estejam carregadas'}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  originFilter === 'Consolidado'
                    ? 'bg-emerald-600 text-white shadow-xs border border-emerald-400/40'
                    : hasBoth
                    ? 'text-slate-300 hover:text-white hover:bg-white/5'
                    : 'text-slate-500 opacity-40 cursor-not-allowed'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-emerald-300" />
                <span>Consolidado</span>
                {hasBoth && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-emerald-200 tabular-nums font-mono">
                    {totalCount.toLocaleString('pt-BR')}
                  </span>
                )}
              </button>
            </div>

            {/* Seletor Rápido de Base de Cálculo */}
            <div className="bg-[#13315C] p-1 rounded-xl border border-slate-700/60 flex items-center shadow-inner text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 hidden lg:inline">
                Base:
              </span>
              <button
                type="button"
                onClick={() => onCalculationBasisChange('net')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  calculationBasis === 'net'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Soma pela coluna Valor Líquido (padrão ERP com descontos/impostos)"
              >
                Líquido
              </button>
              <button
                type="button"
                onClick={() => onCalculationBasisChange('item')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  calculationBasis === 'item'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Soma pela coluna Valor do Item (bruto das mercadorias sem deduções)"
              >
                Item (Bruto)
              </button>
              <button
                type="button"
                onClick={() => onCalculationBasisChange('calc')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  calculationBasis === 'calc'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Soma multiplicando Preço Unitário x Quantidade Pedida"
              >
                Preço × Qtd
              </button>
            </div>

            {/* Botão de Conciliação e Auditoria Financeira */}
            <button
              type="button"
              onClick={onOpenReconciliation}
              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Abrir painel de conciliação de totais com a planilha Excel"
            >
              <Calculator className="w-3.5 h-3.5 text-amber-400" />
              <span>Conciliar Planilha</span>
            </button>
          </div>
        )}

        {/* Lado Direito: Ações Principais e Tema */}
        <div className="flex items-center gap-2 shrink-0 no-print">
          {/* Botão de Upload / Substituir */}
          <button
            onClick={onOpenUpload}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Planilhas ERP</span>
            <span className="md:hidden">Bases</span>
          </button>

          {/* Exportações */}
          {hasAny && (
            <div className="relative group">
              <button
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-[#13315C] text-slate-200 hover:text-white hover:bg-[#1E4E8C] transition-colors flex items-center gap-1.5 border border-slate-700/50"
                title="Exportar dados filtrados"
              >
                <Download className="w-3.5 h-3.5 text-[#8DA9C4]" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1 hidden group-hover:block z-50">
                <button
                  onClick={onExportExcel}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Exportar Excel (.xlsx)
                </button>
                <button
                  onClick={onExportCSV}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  Exportar CSV (.csv)
                </button>
              </div>
            </div>
          )}

          {/* Botão Imprimir / PDF */}
          {hasAny && (
            <button
              onClick={onPrintDashboard}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-[#13315C] text-slate-200 hover:text-white hover:bg-[#1E4E8C] transition-colors flex items-center gap-1.5 border border-slate-700/50"
              title="Exportar ou Imprimir Dashboard em PDF"
            >
              <Printer className="w-3.5 h-3.5 text-[#8DA9C4]" />
              <span className="hidden xl:inline">PDF</span>
            </button>
          )}

          {/* Alternar Tema */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-[#13315C] text-[#8DA9C4] hover:text-white hover:bg-[#1E4E8C] transition-colors border border-slate-700/50"
            title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
