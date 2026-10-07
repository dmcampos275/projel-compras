import React, { useState } from 'react';
import {
  X,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Info,
  DollarSign,
  Ban,
  Tag,
  ArrowRight,
  TrendingDown,
  Layers,
  FileSpreadsheet,
  Package,
  Briefcase,
  HelpCircle,
  Eye,
} from 'lucide-react';
import {
  MappingReport,
  PurchaseRecord,
  CalculationBasis,
  RecordOrigin,
} from '../types/purchases';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  comprasReport: MappingReport | null;
  servicosReport: MappingReport | null;
  comprasRecords: PurchaseRecord[];
  servicosRecords: PurchaseRecord[];
  currentBasis: CalculationBasis;
  currentExcludeCancelled: boolean;
  onApplyBasisChange: (basis: CalculationBasis, excludeCancelled: boolean) => void;
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  isOpen,
  onClose,
  comprasReport,
  servicosReport,
  comprasRecords,
  servicosRecords,
  currentBasis,
  currentExcludeCancelled,
  onApplyBasisChange,
}) => {
  const [selectedBase, setSelectedBase] = useState<RecordOrigin>('Compras');
  const [tempBasis, setTempBasis] = useState<CalculationBasis>(currentBasis);
  const [tempExcludeCancelled, setTempExcludeCancelled] = useState<boolean>(currentExcludeCancelled);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const currentReport = selectedBase === 'Serviços' ? servicosReport : comprasReport;
  const currentRecords = selectedBase === 'Serviços' ? servicosRecords : comprasRecords;

  const rec = currentReport?.reconciliation;

  // Linhas com divergência entre Valor do Item e Valor Líquido
  const divergentRows = currentRecords.filter(
    (r) => Math.abs(r.itemValue - r.netValue) > 0.01 || (r.statusGroup === 'Cancelada' && (r.netValue > 0 || r.itemValue > 0))
  );

  const filteredDivergent = divergentRows.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.orderNumber.toLowerCase().includes(term) ||
      r.supplier.toLowerCase().includes(term) ||
      r.service.toLowerCase().includes(term) ||
      r.branch.toLowerCase().includes(term) ||
      r.status.toLowerCase().includes(term)
    );
  });

  const handleApply = () => {
    onApplyBasisChange(tempBasis, tempExcludeCancelled);
    onClose();
  };

  const diffItemNet = rec ? rec.sumItemValue - rec.sumNetValue : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="p-6 bg-gradient-to-r from-[#0B2545] via-[#13315C] to-[#1E4E8C] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                  Conciliação & Auditoria
                </span>
                <span className="text-xs text-blue-200">Conferência com a Planilha Excel</span>
              </div>
              <h2 className="text-xl font-black tracking-tight mt-0.5">
                Painel de Conciliação Financeira de Valores
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seleção de Base (Compras x Serviços) */}
        {(comprasReport && servicosReport) && (
          <div className="px-6 pt-3 pb-0 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedBase('Compras')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                selectedBase === 'Compras'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Base de Compras (Produtos/Materiais)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedBase('Serviços')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                selectedBase === 'Serviços'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 dark:border-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Base de Serviços Realizados</span>
            </button>
          </div>
        )}

        {/* Conteúdo com Scroll */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* Card de Explicação do Analista */}
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-slate-700 dark:text-slate-300 text-xs">
              <strong className="text-slate-900 dark:text-white block font-bold">
                Por que os valores no Excel podem parecer diferentes?
              </strong>
              <p>
                No ERP Protheus/Totvs/SAP, uma planilha de compras possui colunas distintas:{' '}
                <strong>Valor do Item</strong> (valor bruto/mercadoria sem descontos),{' '}
                <strong>Valor Líquido</strong> (valor final da O.C. faturável com descontos e retenções) e{' '}
                <strong>Valor Cancelado</strong>.
              </p>
              <p>
                Se você somou uma coluna diferente no Excel ou se o seu relatório do ERP exclui as O.C.s Canceladas no rodapé, utilize o seletor abaixo para bater centavo por centavo com a sua conferência.
              </p>
            </div>
          </div>

          {/* Grid de Totais das Colunas da Planilha */}
          {rec && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Totais Exatos Extraídos da Planilha ({selectedBase})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Coluna Valor Líquido */}
                <div className={`p-4 rounded-2xl border transition-all ${tempBasis === 'net' ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-400 ring-2 ring-blue-500/20' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'}`}>
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="font-bold">Coluna "Valor Líquido"</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">Padrão ERP</span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                    {formatCurrency(rec.sumNetValue)}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    Soma exata da coluna de valor final líquido
                  </div>
                </div>

                {/* 2. Coluna Valor do Item */}
                <div className={`p-4 rounded-2xl border transition-all ${tempBasis === 'item' ? 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-400 ring-2 ring-amber-500/20' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'}`}>
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="font-bold">Coluna "Valor do Item"</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">Bruto</span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                    {formatCurrency(rec.sumItemValue)}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    Soma dos produtos/mercadorias sem descontos
                  </div>
                </div>

                {/* 3. Preço x Qtd Calculado */}
                <div className={`p-4 rounded-2xl border transition-all ${tempBasis === 'calc' ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-500/20' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'}`}>
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="font-bold">Preço Unit. × Qtd</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">Calculado</span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
                    {formatCurrency(rec.sumCalculatedPriceQty)}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    Soma da multiplicação linha a linha
                  </div>
                </div>

                {/* 4. Ordens Válidas (Sem Canceladas) */}
                <div className="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="font-bold">Total Válido (Ativo)</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">Sem Canceladas</span>
                  </div>
                  <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                    {formatCurrency(rec.sumActiveNetValue)}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    Exclui pedidos com situação "Cancelada"
                  </div>
                </div>
              </div>

              {/* Informações Complementares: Cancelado, Saldo Aberto e Descontos */}
              <div className="mt-3 p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <Ban className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-slate-600 dark:text-slate-400">Total Cancelado na Planilha:</span>
                  <strong className="text-rose-600 dark:text-rose-400">{formatCurrency(rec.sumCancelledValue)}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-slate-600 dark:text-slate-400">Descontos Concedidos:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(rec.sumDiscount)}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-600 dark:text-slate-400">Diferença Bruto vs Líquido:</span>
                  <strong className={diffItemNet !== 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600'}>
                    {formatCurrency(diffItemNet)} {diffItemNet !== 0 ? `(${formatPercent((diffItemNet / (rec.sumItemValue || 1)) * 100)})` : ''}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Controles Ativos: Escolha da Base do Dashboard */}
          <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-500" />
                  Selecione a Base de Cálculo que você deseja utilizar no Dashboard
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Essa opção altera instantaneamente o valor somado em todos os KPIs, gráficos de evolução e abas analíticas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                onClick={() => setTempBasis('net')}
                className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                  tempBasis === 'net'
                    ? 'bg-white dark:bg-slate-900 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100'
                }`}
              >
                <input
                  type="radio"
                  name="basis"
                  checked={tempBasis === 'net'}
                  onChange={() => setTempBasis('net')}
                  className="mt-1 text-amber-500"
                />
                <div>
                  <strong className="block text-slate-900 dark:text-white font-bold">Valor Líquido</strong>
                  <span className="text-[11px] text-slate-500">Padrão contábil e financeiro do ERP. Total real da O.C.</span>
                </div>
              </label>

              <label
                onClick={() => setTempBasis('item')}
                className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                  tempBasis === 'item'
                    ? 'bg-white dark:bg-slate-900 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100'
                }`}
              >
                <input
                  type="radio"
                  name="basis"
                  checked={tempBasis === 'item'}
                  onChange={() => setTempBasis('item')}
                  className="mt-1 text-amber-500"
                />
                <div>
                  <strong className="block text-slate-900 dark:text-white font-bold">Valor do Item (Bruto)</strong>
                  <span className="text-[11px] text-slate-500">Soma da coluna de valor das mercadorias/produtos sem deduções.</span>
                </div>
              </label>

              <label
                onClick={() => setTempBasis('calc')}
                className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                  tempBasis === 'calc'
                    ? 'bg-white dark:bg-slate-900 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100'
                }`}
              >
                <input
                  type="radio"
                  name="basis"
                  checked={tempBasis === 'calc'}
                  onChange={() => setTempBasis('calc')}
                  className="mt-1 text-amber-500"
                />
                <div>
                  <strong className="block text-slate-900 dark:text-white font-bold">Preço Unitário × Quantidade</strong>
                  <span className="text-[11px] text-slate-500">Recalcula multiplicando o preço e quantidade de cada item.</span>
                </div>
              </label>
            </div>

            {/* Checkbox de Excluir Canceladas */}
            <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={tempExcludeCancelled}
                  onChange={(e) => setTempExcludeCancelled(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                />
                <span>Excluir Ordens Canceladas da soma geral de Compras (Considerar apenas compras válidas/ativas)</span>
              </label>

              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 rounded-xl bg-[#0B2545] text-white hover:bg-[#13315C] text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <span>Aplicar no Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tabela de Linhas com Divergências para Auditoria Linha a Linha */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Auditoria Linha a Linha: Itens com Diferença entre Valor do Item e Valor Líquido ({divergentRows.length} itens)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Itens com descontos, retenções ou cancelamento que alteram o valor entre colunas no ERP.
                </p>
              </div>

              <input
                type="text"
                placeholder="Buscar O.C., fornecedor ou item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 w-full sm:w-64"
              />
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold sticky top-0">
                  <tr>
                    <th className="p-2.5">O.C.</th>
                    <th className="p-2.5">Filial</th>
                    <th className="p-2.5">Fornecedor</th>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5">Situação</th>
                    <th className="p-2.5 text-right">Valor Item (Bruto)</th>
                    <th className="p-2.5 text-right">Valor Líquido</th>
                    <th className="p-2.5 text-right">Diferença</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {filteredDivergent.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400 font-sans">
                        Nenhuma divergência encontrada entre Valor do Item e Valor Líquido.
                      </td>
                    </tr>
                  ) : (
                    filteredDivergent.slice(0, 100).map((r, i) => {
                      const diff = r.itemValue - r.netValue;
                      return (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{r.orderNumber}</td>
                          <td className="p-2.5 truncate max-w-[120px]">{r.branch}</td>
                          <td className="p-2.5 truncate max-w-[160px]">{r.supplier}</td>
                          <td className="p-2.5 truncate max-w-[160px]">{r.service}</td>
                          <td className="p-2.5">
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              r.statusGroup === 'Cancelada' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-700 dark:text-slate-300">{formatCurrency(r.itemValue)}</td>
                          <td className="p-2.5 text-right font-bold text-blue-600 dark:text-blue-400">{formatCurrency(r.netValue)}</td>
                          <td className={`p-2.5 text-right font-bold ${diff > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>
                            {formatCurrency(diff)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Base ativa selecionada no momento: <strong>{currentBasis === 'net' ? 'Valor Líquido' : currentBasis === 'item' ? 'Valor do Item' : 'Preço x Qtd'}</strong>
            {currentExcludeCancelled && ' (excluindo canceladas)'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-300"
            >
              Fechar
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-black text-xs shadow-md"
            >
              Confirmar & Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
