import React from 'react';
import { X, Filter } from 'lucide-react';
import { FilterState } from '../types/purchases';

interface ActiveFilterChipsProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearAll: () => void;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  filters,
  onFilterChange,
  onClearAll,
}) => {
  interface ChipItem {
    id: string;
    type: keyof FilterState;
    label: string;
    val: string;
  }

  const chips: ChipItem[] = [];

  filters.branches.forEach((b) => chips.push({ id: `branch-${b}`, type: 'branches', label: 'Filial', val: b }));
  filters.suppliers.forEach((s) => chips.push({ id: `sup-${s}`, type: 'suppliers', label: 'Fornecedor', val: s }));
  filters.families.forEach((f) => chips.push({ id: `fam-${f}`, type: 'families', label: 'Família', val: f }));
  filters.costCenters.forEach((c) => chips.push({ id: `cc-${c}`, type: 'costCenters', label: 'Centro de Custo', val: c }));
  filters.buyers.forEach((b) => chips.push({ id: `buyer-${b}`, type: 'buyers', label: 'Comprador', val: b }));
  filters.statuses.forEach((s) => chips.push({ id: `st-${s}`, type: 'statuses', label: 'Situação', val: s }));
  filters.supplierStates.forEach((u) => chips.push({ id: `uf-${u}`, type: 'supplierStates', label: 'UF', val: u }));

  if (filters.dateRange.start || filters.dateRange.end) {
    const startStr = filters.dateRange.start ? filters.dateRange.start.split('-').reverse().join('/') : 'Início';
    const endStr = filters.dateRange.end ? filters.dateRange.end.split('-').reverse().join('/') : 'Hoje';
    chips.push({
      id: 'date-range',
      type: 'dateRange',
      label: 'Período',
      val: `${startStr} até ${endStr}`,
    });
  }

  if (chips.length === 0) return null;

  const removeChip = (chip: ChipItem) => {
    if (chip.type === 'dateRange') {
      onFilterChange({
        ...filters,
        dateRange: { start: '', end: '' },
      });
      return;
    }

    const currentList = (filters[chip.type] as string[]) || [];
    const updated = currentList.filter((item) => item !== chip.val);
    onFilterChange({
      ...filters,
      [chip.type]: updated,
    });
  };

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pt-3 no-print">
      <div className="flex flex-wrap items-center gap-2 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 p-2.5 rounded-xl">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300 mr-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Filtros ativos ({chips.length}):</span>
        </div>

        {chips.map((chip) => (
          <span
            key={chip.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-amber-300 dark:border-amber-700/60 shadow-xs"
          >
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
              {chip.label}:
            </span>
            <span className="font-semibold text-slate-900 dark:text-amber-200 max-w-[200px] truncate" title={chip.val}>
              {chip.val}
            </span>
            <button
              onClick={() => removeChip(chip)}
              className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors"
              title="Remover filtro"
              aria-label={`Remover filtro ${chip.val}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <button
          onClick={onClearAll}
          className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 ml-auto underline"
        >
          Limpar todos
        </button>
      </div>
    </div>
  );
};
