import React, { useState } from 'react';
import {
  Filter,
  RotateCcw,
  Calendar,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FilterState, PurchaseRecord, OriginFilter } from '../types/purchases';
import { MultiSelectDropdown } from './filters/MultiSelectDropdown';
import { formatDateISO } from '../utils/formatters';

interface GlobalFiltersProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onResetFilters: () => void;
  records: PurchaseRecord[];
  originFilter?: OriginFilter;
  onOriginChange?: (newOrigin: OriginFilter) => void;
  hasCompras?: boolean;
  hasServicos?: boolean;
}

export const GlobalFilters: React.FC<GlobalFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  records,
  originFilter,
  onOriginChange,
  hasCompras = true,
  hasServicos = true,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Calcula valores distintos para cada filtro a partir dos dados da planilha
  const branchOptions = Array.from(new Set(records.map((r) => r.branch).filter(Boolean))).sort();
  const supplierOptions = Array.from(new Set(records.map((r) => r.supplier).filter(Boolean))).sort();
  const familyOptions = Array.from(new Set(records.map((r) => r.family).filter(Boolean))).sort();
  const costCenterOptions = Array.from(new Set(records.map((r) => r.costCenter).filter(Boolean))).sort();
  const buyerOptions = Array.from(new Set(records.map((r) => r.buyer).filter(Boolean))).sort();
  const statusOptions = Array.from(new Set(records.map((r) => r.status).filter(Boolean))).sort();
  const ufOptions = Array.from(new Set(records.map((r) => r.supplierState).filter(Boolean))).sort();

  // Contagem de filtros ativos
  let activeFiltersCount = 0;
  if (filters.branches.length > 0) activeFiltersCount++;
  if (filters.suppliers.length > 0) activeFiltersCount++;
  if (filters.families.length > 0) activeFiltersCount++;
  if (filters.costCenters.length > 0) activeFiltersCount++;
  if (filters.buyers.length > 0) activeFiltersCount++;
  if (filters.statuses.length > 0) activeFiltersCount++;
  if (filters.supplierStates.length > 0) activeFiltersCount++;
  if (filters.dateRange.start || filters.dateRange.end) activeFiltersCount++;

  // Atalhos de Período
  const handleDatePreset = (preset: 'currentMonth' | 'last3Months' | 'currentYear' | 'all') => {
    const today = new Date();

    if (preset === 'all') {
      onFilterChange({
        ...filters,
        dateRange: { start: '', end: '' },
      });
      return;
    }

    if (preset === 'currentMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      onFilterChange({
        ...filters,
        dateRange: {
          start: formatDateISO(start),
          end: formatDateISO(end),
        },
      });
      return;
    }

    if (preset === 'last3Months') {
      const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      onFilterChange({
        ...filters,
        dateRange: {
          start: formatDateISO(start),
          end: formatDateISO(end),
        },
      });
      return;
    }

    if (preset === 'currentYear') {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      onFilterChange({
        ...filters,
        dateRange: {
          start: formatDateISO(start),
          end: formatDateISO(end),
        },
      });
      return;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs no-print">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        {/* Cabeçalho da Barra de Filtros */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#13315C] dark:text-[#8DA9C4]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Filtros Globais
            </span>
            {originFilter && onOriginChange && (
              <div className="hidden md:flex items-center gap-1 ml-2 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                <button
                  type="button"
                  disabled={!hasCompras}
                  onClick={() => onOriginChange('Compras')}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    originFilter === 'Compras'
                      ? 'bg-[#0B2545] text-white shadow-xs'
                      : hasCompras
                      ? 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  Compras
                </button>
                <button
                  type="button"
                  disabled={!hasServicos}
                  onClick={() => onOriginChange('Serviços')}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    originFilter === 'Serviços'
                      ? 'bg-[#F28C28] text-slate-950 font-black shadow-xs'
                      : hasServicos
                      ? 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  Serviços
                </button>
                <button
                  type="button"
                  disabled={!(hasCompras && hasServicos)}
                  onClick={() => onOriginChange('Consolidado')}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    originFilter === 'Consolidado'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : (hasCompras && hasServicos)
                      ? 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  Consolidado
                </button>
              </div>
            )}
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                {activeFiltersCount} ativo{activeFiltersCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={onResetFilters}
                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar filtros
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <span>{isCollapsed ? 'Expandir' : 'Recolher'}</span>
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Grade de Controles de Filtro */}
        {!isCollapsed && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            {/* Linha 1: Período e Atalhos Rápidos */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Calendar className="w-4 h-4 text-[#13315C] dark:text-amber-400" />
                <span>Período de Emissão:</span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      dateRange: { ...filters.dateRange, start: e.target.value },
                    })
                  }
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1E4E8C]"
                  title="Data Inicial"
                />
                <span className="text-slate-400">até</span>
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      dateRange: { ...filters.dateRange, end: e.target.value },
                    })
                  }
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#1E4E8C]"
                  title="Data Final"
                />
              </div>

              {/* Atalhos */}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[11px] text-slate-400 hidden sm:inline">Atalhos:</span>
                <button
                  type="button"
                  onClick={() => handleDatePreset('currentMonth')}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Mês atual
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePreset('last3Months')}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Últimos 3 meses
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePreset('currentYear')}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Ano atual
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePreset('all')}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Tudo
                </button>
              </div>
            </div>

            {/* Linha 2: Dropdowns Dinâmicos com Busca */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              <MultiSelectDropdown
                label="Filial"
                options={branchOptions}
                selected={filters.branches}
                onChange={(branches) => onFilterChange({ ...filters, branches })}
              />

              <MultiSelectDropdown
                label="Fornecedor"
                options={supplierOptions}
                selected={filters.suppliers}
                onChange={(suppliers) => onFilterChange({ ...filters, suppliers })}
              />

              <MultiSelectDropdown
                label="Família"
                options={familyOptions}
                selected={filters.families}
                onChange={(families) => onFilterChange({ ...filters, families })}
              />

              <MultiSelectDropdown
                label="Centro de Custo"
                options={costCenterOptions}
                selected={filters.costCenters}
                onChange={(costCenters) => onFilterChange({ ...filters, costCenters })}
              />

              <MultiSelectDropdown
                label="Comprador"
                options={buyerOptions}
                selected={filters.buyers}
                onChange={(buyers) => onFilterChange({ ...filters, buyers })}
              />

              <MultiSelectDropdown
                label="Situação"
                options={statusOptions}
                selected={filters.statuses}
                onChange={(statuses) => onFilterChange({ ...filters, statuses })}
              />

              <MultiSelectDropdown
                label="UF Fornecedor"
                options={ufOptions}
                selected={filters.supplierStates}
                onChange={(supplierStates) => onFilterChange({ ...filters, supplierStates })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
