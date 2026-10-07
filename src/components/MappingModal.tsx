import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, HelpCircle, FileSpreadsheet, Package, Briefcase, Info } from 'lucide-react';
import { MappingReport, RecordOrigin } from '../types/purchases';

interface MappingModalProps {
  comprasReport: MappingReport | null;
  servicosReport: MappingReport | null;
  initialOrigin?: RecordOrigin;
  isOpen: boolean;
  onClose: () => void;
}

export const MappingModal: React.FC<MappingModalProps> = ({
  comprasReport,
  servicosReport,
  initialOrigin = 'Compras',
  isOpen,
  onClose,
}) => {
  const [selectedBase, setSelectedBase] = useState<RecordOrigin>(initialOrigin);

  useEffect(() => {
    if (initialOrigin) {
      setSelectedBase(initialOrigin);
    } else if (comprasReport) {
      setSelectedBase('Compras');
    } else if (servicosReport) {
      setSelectedBase('Serviços');
    }
  }, [initialOrigin, comprasReport, servicosReport, isOpen]);

  if (!isOpen) return null;

  const currentReport = selectedBase === 'Serviços' ? (servicosReport || comprasReport) : (comprasReport || servicosReport);
  if (!currentReport) return null;

  const isCompras = currentReport.baseName === 'Compras';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header do Modal */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCompras ? 'bg-[#0B2545] text-amber-400' : 'bg-[#F28C28] text-slate-950 font-black'}`}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Relatório de Mapeamento de Colunas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Arquivo: <strong>{currentReport.fileName}</strong> ({currentReport.totalRows.toLocaleString('pt-BR')} linhas lidas em {currentReport.loadTimestamp})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alternância de Base se ambas existirem */}
        {(comprasReport && servicosReport) && (
          <div className="px-6 pt-3 pb-0 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex gap-2">
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
              <span>Base de Compras ({comprasReport.totalRows} lin)</span>
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
              <span>Base de Serviços Realizados ({servicosReport.totalRows} lin)</span>
            </button>
          </div>
        )}

        {/* Conteúdo com Scroll */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Aviso de Ordem de Colunas */}
          {currentReport.columnOrderNotice && (
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-start gap-2.5 text-blue-800 dark:text-blue-300">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span className="text-[11px] leading-relaxed">{currentReport.columnOrderNotice}</span>
            </div>
          )}

          {/* Status Geral */}
          <div className="flex flex-wrap items-center gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{currentReport.recognizedColumns.length} colunas mapeadas com sucesso</span>
            </div>
            {currentReport.missingEssentialColumns.length > 0 ? (
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span>{currentReport.missingEssentialColumns.length} coluna(s) essenciais não encontradas</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Todas as colunas essenciais foram encontradas</span>
              </div>
            )}
          </div>

          {/* Tabela de Colunas Reconhecidas */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-xs uppercase tracking-wider">
              Colunas Reconhecidas na Planilha de {currentReport.baseName}
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="p-2.5">Campo no Dashboard</th>
                    <th className="p-2.5">Cabeçalho Encontrado na Planilha</th>
                    <th className="p-2.5 text-center">Obrigatória?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentReport.recognizedColumns.map((col) => (
                    <tr key={col.canonical} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        {col.label}
                      </td>
                      <td className="p-2.5 font-mono text-emerald-700 dark:text-emerald-400">
                        "{col.matchedHeader}"
                      </td>
                      <td className="p-2.5 text-center">
                        {col.required ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Sim
                          </span>
                        ) : (
                          <span className="text-slate-400">Opcional</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Colunas Essenciais Ausentes */}
          {currentReport.missingEssentialColumns.length > 0 && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
              <h4 className="font-bold text-red-900 dark:text-red-300 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Colunas Essenciais Faltantes na base de {currentReport.baseName}
              </h4>
              <p className="text-[11px] text-red-700 dark:text-red-400 mb-2">
                As seguintes colunas não foram identificadas com nenhum dos sinônimos cadastrados:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-red-800 dark:text-red-300 font-medium font-mono text-[11px]">
                {currentReport.missingEssentialColumns.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Cabeçalhos Extras Não Mapeados */}
          {currentReport.unmatchedHeaders.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-1">
                Outros Cabeçalhos na Planilha (Informativo / Não Utilizados)
              </h4>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                {currentReport.unmatchedHeaders.map((h) => (
                  <span
                    key={h}
                    className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px]"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dica técnica */}
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-2.5 text-slate-600 dark:text-slate-300">
            <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Como adicionar novos nomes de coluna do ERP:</strong> O mapeamento busca por correspondência exata e aproximada sem acentos e sem diferenciação de maiúsculas/minúsculas. Você pode estender os sinônimos em <code className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/80 font-mono text-blue-900 dark:text-blue-200">src/utils/columnMapping.ts</code>.
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/40">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#0B2545] text-white hover:bg-[#13315C] font-bold text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
