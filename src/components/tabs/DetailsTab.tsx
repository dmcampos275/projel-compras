import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  Columns3,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
} from 'lucide-react';
import { PurchaseRecord } from '../../types/purchases';
import { formatCurrency, formatNumber } from '../../utils/formatters';

interface DetailsTabProps {
  records: PurchaseRecord[];
  onExportExcel: () => void;
  onExportCSV: () => void;
}

interface ColumnDef {
  key: keyof PurchaseRecord | string;
  label: string;
  defaultVisible: boolean;
  align?: 'left' | 'right' | 'center';
}

const AVAILABLE_COLUMNS: ColumnDef[] = [
  { key: 'origin', label: 'Origem', defaultVisible: true, align: 'center' },
  { key: 'orderNumber', label: 'Nº O.C.', defaultVisible: true },
  { key: 'branch', label: 'Filial', defaultVisible: true },
  { key: 'status', label: 'Situação', defaultVisible: true },
  { key: 'service', label: 'Item / Serviço', defaultVisible: true },
  { key: 'family', label: 'Família', defaultVisible: true },
  { key: 'supplier', label: 'Fornecedor / Prestador', defaultVisible: true },
  { key: 'supplierState', label: 'UF', defaultVisible: false, align: 'center' },
  { key: 'buyer', label: 'Comprador / Gestor', defaultVisible: true },
  { key: 'costCenter', label: 'Centro de Custo', defaultVisible: true },
  { key: 'issueDateStr', label: 'Emissão', defaultVisible: true, align: 'center' },
  { key: 'deliveryDateStr', label: 'Entrega', defaultVisible: true, align: 'center' },
  { key: 'leadTimeDays', label: 'Prazo (dias)', defaultVisible: false, align: 'right' },
  { key: 'qtyRequested', label: 'Qtd Pedida', defaultVisible: true, align: 'right' },
  { key: 'qtyOpen', label: 'Qtd Aberto', defaultVisible: false, align: 'right' },
  { key: 'unit', label: 'U.M.', defaultVisible: false, align: 'center' },
  { key: 'unitPrice', label: 'Preço Unit.', defaultVisible: true, align: 'right' },
  { key: 'netValue', label: 'Valor Líquido', defaultVisible: true, align: 'right' },
  { key: 'itemValue', label: 'Valor do Item', defaultVisible: false, align: 'right' },
  { key: 'openValue', label: 'Valor em Aberto', defaultVisible: true, align: 'right' },
  { key: 'discountValue', label: 'Desconto (R$)', defaultVisible: false, align: 'right' },
  { key: 'issValue', label: 'Valor ISS', defaultVisible: false, align: 'right' },
  { key: 'inssValue', label: 'Valor INSS', defaultVisible: false, align: 'right' },
  { key: 'irrfValue', label: 'Vlr. IRRF', defaultVisible: false, align: 'right' },
  { key: 'pisValue', label: 'Vlr. PIS Ret.', defaultVisible: false, align: 'right' },
  { key: 'cofinsValue', label: 'Vlr. COFINS Ret.', defaultVisible: false, align: 'right' },
  { key: 'csllValue', label: 'Valor CSLL Ret.', defaultVisible: false, align: 'right' },
  { key: 'financialAccount', label: 'Cta Financeira', defaultVisible: false },
  { key: 'accountingAccount', label: 'Cta Contábil', defaultVisible: false },
  { key: 'reasonDescription', label: 'Motivo Cancelamento', defaultVisible: false },
];

export const DetailsTab: React.FC<DetailsTabProps> = ({
  records,
  onExportExcel,
  onExportCSV,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('orderNumber');
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)
  );
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

  // Filtro de busca textual
  const searchedRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.toLowerCase();

    return records.filter((r) => {
      return (
        r.orderNumber.toLowerCase().includes(term) ||
        r.supplier.toLowerCase().includes(term) ||
        r.service.toLowerCase().includes(term) ||
        r.family.toLowerCase().includes(term) ||
        r.buyer.toLowerCase().includes(term) ||
        r.costCenter.toLowerCase().includes(term) ||
        r.branch.toLowerCase().includes(term) ||
        r.status.toLowerCase().includes(term)
      );
    });
  }, [records, searchTerm]);

  // Ordenação
  const sortedRecords = useMemo(() => {
    return [...searchedRecords].sort((a, b) => {
      let valA = a[sortField as keyof PurchaseRecord];
      let valB = b[sortField as keyof PurchaseRecord];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string') {
        valA = (valA as string).toLowerCase();
        valB = ((valB as string) || '').toLowerCase();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [searchedRecords, sortField, sortAsc]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const currentRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
    setCurrentPage(1);
  };

  const toggleColumnVisibility = (colKey: string) => {
    if (visibleColumns.includes(colKey)) {
      if (visibleColumns.length > 2) {
        setVisibleColumns(visibleColumns.filter((k) => k !== colKey));
      }
    } else {
      setVisibleColumns([...visibleColumns, colKey]);
    }
  };

  const activeColumnsDefs = AVAILABLE_COLUMNS.filter((c) => visibleColumns.includes(c.key));

  return (
    <div className="space-y-4">
      {/* Barra de Controles: Busca, Seletor de Colunas e Botões de Exportação */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Campo de Busca em Tempo Real */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por O.C., fornecedor, item, comprador..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[#1E4E8C]"
          />
        </div>

        {/* Ações da Tabela */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Seletor de Colunas Visíveis */}
          <div className="relative">
            <button
              onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
              className="px-3 py-2 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Colunas ({visibleColumns.length})</span>
            </button>

            {isColumnPickerOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in duration-100">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Colunas Visíveis
                  </span>
                  <button
                    onClick={() => setIsColumnPickerOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Fechar
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {AVAILABLE_COLUMNS.map((col) => {
                    const isChecked = visibleColumns.includes(col.key);
                    return (
                      <button
                        key={col.key}
                        onClick={() => toggleColumnVisibility(col.key)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          isChecked
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-medium'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{col.label}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Exportar Excel */}
          <button
            onClick={onExportExcel}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          {/* Exportar CSV */}
          <button
            onClick={onExportCSV}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#13315C] text-white hover:bg-[#1E4E8C] flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Tabela de Dados Detalhados */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[580px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold sticky top-0 z-10 shadow-xs">
              <tr>
                {activeColumnsDefs.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className={`p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    <div
                      className={`inline-flex items-center gap-1 ${
                        col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                      }`}
                    >
                      <span>{col.label}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentRecords.length === 0 ? (
                <tr>
                  <td colSpan={activeColumnsDefs.length} className="p-8 text-center text-slate-400">
                    Nenhum registro encontrado para a busca ou filtros selecionados.
                  </td>
                </tr>
              ) : (
                currentRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {activeColumnsDefs.map((col) => {
                      let cellContent: React.ReactNode = '-';

                      if (
                        col.key === 'netValue' ||
                        col.key === 'openValue' ||
                        col.key === 'unitPrice' ||
                        col.key === 'discountValue' ||
                        col.key === 'itemValue' ||
                        col.key === 'issValue' ||
                        col.key === 'inssValue' ||
                        col.key === 'irrfValue' ||
                        col.key === 'pisValue' ||
                        col.key === 'cofinsValue' ||
                        col.key === 'csllValue'
                      ) {
                        const val = r[col.key as keyof PurchaseRecord] as number;
                        cellContent = <span className="font-mono tabular-nums font-semibold">{formatCurrency(val || 0)}</span>;
                      } else if (col.key === 'origin') {
                        const isCompras = r.origin === 'Compras';
                        cellContent = (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCompras
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {r.origin || 'Compras'}
                          </span>
                        );
                      } else if (col.key === 'qtyRequested' || col.key === 'qtyOpen') {
                        const val = r[col.key as keyof PurchaseRecord] as number;
                        cellContent = <span className="font-mono tabular-nums">{formatNumber(val)}</span>;
                      } else if (col.key === 'status') {
                        cellContent = (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.statusGroup === 'Atendida/Encerrada'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : r.statusGroup === 'Cancelada'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : r.statusGroup === 'Parcialmente Atendida'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {r.status}
                          </span>
                        );
                      } else {
                        const rawVal = r[col.key as keyof PurchaseRecord];
                        cellContent = rawVal ? String(rawVal) : '-';
                      }

                      return (
                        <td
                          key={col.key}
                          className={`p-3 whitespace-nowrap ${
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                          }`}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da Paginação */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Linhas por página:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="text-slate-400">|</span>
            <span>
              Mostrando <strong className="text-slate-900 dark:text-white tabular-nums">{sortedRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> a{' '}
              <strong className="text-slate-900 dark:text-white tabular-nums">{Math.min(currentPage * pageSize, sortedRecords.length)}</strong> de{' '}
              <strong className="text-slate-900 dark:text-white tabular-nums">{sortedRecords.length}</strong> registros filtrados
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40"
              title="Primeira página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium tabular-nums">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40"
              title="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40"
              title="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
