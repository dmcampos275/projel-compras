import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Loader2,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  Info,
  Check,
  X,
  Database,
} from 'lucide-react';
import { MappingReport, RecordOrigin } from '../types/purchases';

interface FileUploadProps {
  onFileSelected: (file: File, origin: RecordOrigin) => Promise<void>;
  onLoadDemoData: (target?: 'both' | 'compras' | 'servicos') => void;
  onClearAllData: () => void;
  isLoading: boolean;
  error: string | null;
  comprasReport: MappingReport | null;
  servicosReport: MappingReport | null;
  onContinueToDashboard?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelected,
  onLoadDemoData,
  onClearAllData,
  isLoading,
  error,
  comprasReport,
  servicosReport,
  onContinueToDashboard,
}) => {
  const [draggingTarget, setDraggingTarget] = useState<RecordOrigin | null>(null);
  const [showVerificationCompras, setShowVerificationCompras] = useState(false);
  const [showVerificationServicos, setShowVerificationServicos] = useState(false);

  const comprasInputRef = useRef<HTMLInputElement>(null);
  const servicosInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (e: React.DragEvent, origin: RecordOrigin) => {
    e.preventDefault();
    setDraggingTarget(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await onFileSelected(file, origin);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, origin: RecordOrigin) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await onFileSelected(file, origin);
      e.target.value = '';
    }
  };

  const hasAnyLoaded = Boolean(comprasReport || servicosReport);
  const hasBothLoaded = Boolean(comprasReport && servicosReport);

  return (
    <div className="max-w-6xl mx-auto my-6 px-4">
      {/* Card Principal de Upload */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Banner do Topo */}
        <div className="bg-gradient-to-r from-[#0B2545] via-[#13315C] to-[#1E4E8C] px-8 py-7 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                  Projel Engenharia
                </span>
                <span className="text-xs text-[#8DA9C4]">Gestão Integrada de Suprimentos</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight mt-1">
                Central de Importação de Planilhas ERP
              </h2>
              <p className="mt-1 text-xs text-slate-200 max-w-2xl">
                Carregue suas bases de <strong>Compras (Materiais)</strong> e <strong>Serviços Realizados (Subempreitadas/Contratos)</strong>. As duas bases são independentes e lidas 100% no seu navegador com mapeamento inteligente.
              </p>
            </div>

            {hasAnyLoaded && onContinueToDashboard && (
              <button
                type="button"
                onClick={onContinueToDashboard}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg transition-transform active:scale-95 shrink-0"
              >
                <span>Ir para o Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Alerta de Erro se houver */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-800 dark:text-red-300">
                  Atenção ao processar o arquivo
                </h4>
                <p className="mt-0.5 text-xs text-red-700 dark:text-red-300 leading-relaxed">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* BANNER CLOUD FIRESTORE */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold">Banco de Dados Cloud Firestore Ativo</span>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                  As planilhas de Compras e Serviços são sincronizadas e salvas automaticamente na nuvem para persistência entre sessões e dispositivos.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 shrink-0">
              Persistência em Nuvem
            </span>
          </div>

          {/* DOIS CAMPOS DE UPLOAD LADO A LADO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CAMPO 1: PLANILHA DE COMPRAS */}
            <div className="flex flex-col h-full bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#0B2545] text-white flex items-center justify-center font-black text-xs shadow-xs">
                    CP
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Planilha de Compras
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Produtos, Materiais e Insumos Físicos
                    </span>
                  </div>
                </div>

                {comprasReport && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 className="w-3 h-3" />
                    Ativa ({comprasReport.totalRows} linhas)
                  </span>
                )}
              </div>

              {/* Status ou Dropzone de Compras */}
              <div className="mt-4 flex-1 flex flex-col justify-between">
                {comprasReport ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Arquivo Carregado:</span>
                        <strong className="text-slate-900 dark:text-white font-mono truncate max-w-[200px]" title={comprasReport.fileName}>
                          {comprasReport.fileName}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Total de Linhas:</span>
                        <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {comprasReport.totalRows.toLocaleString('pt-BR')} linhas
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Data/Hora Carregamento:</span>
                        <span className="font-mono text-slate-600 dark:text-slate-300">
                          {comprasReport.loadTimestamp}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => comprasInputRef.current?.click()}
                        className="flex-1 px-3 py-2 rounded-xl bg-[#0B2545] text-white hover:bg-[#13315C] text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Substituir Planilha de Compras</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowVerificationCompras(!showVerificationCompras)}
                        className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1"
                        title="Ver colunas mapeadas e checagens"
                      >
                        <span>Colunas</span>
                        {showVerificationCompras ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Painel Recolhível de Verificação de Colunas Compras */}
                    {showVerificationCompras && (
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2 animate-in fade-in duration-150">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                          <span>Colunas Reconhecidas ({comprasReport.recognizedColumns.length})</span>
                          {comprasReport.missingEssentialColumns.length === 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Todas essenciais presentes
                            </span>
                          ) : (
                            <span className="text-amber-600 text-[11px] font-bold">
                              {comprasReport.missingEssentialColumns.length} ausente(s)
                            </span>
                          )}
                        </div>

                        {comprasReport.missingEssentialColumns.length > 0 && (
                          <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300">
                            <strong>Colunas essenciais ausentes na base de Compras:</strong>{' '}
                            {comprasReport.missingEssentialColumns.join(', ')}
                          </div>
                        )}

                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                          {comprasReport.recognizedColumns.map((col) => (
                            <div key={col.canonical} className="flex justify-between text-slate-600 dark:text-slate-300">
                              <span>{col.label}:</span>
                              <span className="text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[150px]" title={col.matchedHeader}>
                                {col.matchedHeader}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDraggingTarget('Compras');
                    }}
                    onDragLeave={() => setDraggingTarget(null)}
                    onDrop={(e) => handleDrop(e, 'Compras')}
                    onClick={() => comprasInputRef.current?.click()}
                    className={`cursor-pointer rounded-xl border-2 border-dashed p-7 text-center flex flex-col items-center justify-center transition-all ${
                      draggingTarget === 'Compras'
                        ? 'border-[#0B2545] bg-[#0B2545]/10 scale-[1.01]'
                        : 'border-slate-300 dark:border-slate-700 hover:border-[#0B2545] hover:bg-white dark:hover:bg-slate-900'
                    }`}
                  >
                    <UploadCloud className="w-8 h-8 text-[#0B2545] dark:text-[#8DA9C4] mb-2" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Arraste a Planilha de Compras aqui
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      ou clique para selecionar (.xlsx, .xls ou .csv)
                    </span>
                    <span className="mt-3 px-3 py-1.5 rounded-lg bg-[#0B2545] text-white text-[11px] font-bold">
                      Selecionar Compras
                    </span>
                  </div>
                )}
              </div>

              <input
                ref={comprasInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFileChange(e, 'Compras')}
                className="hidden"
              />
            </div>

            {/* CAMPO 2: PLANILHA DE SERVIÇOS REALIZADOS */}
            <div className="flex flex-col h-full bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#F28C28] text-white flex items-center justify-center font-black text-xs shadow-xs">
                    SV
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Planilha de Serviços Realizados
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Subempreiteiros, Contratos e Retenções
                    </span>
                  </div>
                </div>

                {servicosReport && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <CheckCircle2 className="w-3 h-3" />
                    Ativa ({servicosReport.totalRows} linhas)
                  </span>
                )}
              </div>

              {/* Status ou Dropzone de Serviços */}
              <div className="mt-4 flex-1 flex flex-col justify-between">
                {servicosReport ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Arquivo Carregado:</span>
                        <strong className="text-slate-900 dark:text-white font-mono truncate max-w-[200px]" title={servicosReport.fileName}>
                          {servicosReport.fileName}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Total de Linhas:</span>
                        <strong className="font-mono text-[#F28C28] font-bold">
                          {servicosReport.totalRows.toLocaleString('pt-BR')} linhas
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Data/Hora Carregamento:</span>
                        <span className="font-mono text-slate-600 dark:text-slate-300">
                          {servicosReport.loadTimestamp}
                        </span>
                      </div>
                    </div>

                    {/* Aviso de Ordem de Colunas se diferente */}
                    {servicosReport.columnOrderNotice && (
                      <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
                        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                        <span>{servicosReport.columnOrderNotice}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => servicosInputRef.current?.click()}
                        className="flex-1 px-3 py-2 rounded-xl bg-[#F28C28] text-white hover:bg-[#e07b16] text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Substituir Planilha de Serviços</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowVerificationServicos(!showVerificationServicos)}
                        className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1"
                        title="Ver colunas mapeadas e checagens"
                      >
                        <span>Colunas</span>
                        {showVerificationServicos ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Painel Recolhível de Verificação de Colunas Serviços */}
                    {showVerificationServicos && (
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2 animate-in fade-in duration-150">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                          <span>Colunas Reconhecidas ({servicosReport.recognizedColumns.length})</span>
                          {servicosReport.missingEssentialColumns.length === 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Todas essenciais presentes
                            </span>
                          ) : (
                            <span className="text-amber-600 text-[11px] font-bold">
                              {servicosReport.missingEssentialColumns.length} ausente(s)
                            </span>
                          )}
                        </div>

                        {servicosReport.missingEssentialColumns.length > 0 && (
                          <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300">
                            <strong>Colunas essenciais ausentes na base de Serviços:</strong>{' '}
                            {servicosReport.missingEssentialColumns.join(', ')}
                          </div>
                        )}

                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                          {servicosReport.recognizedColumns.map((col) => (
                            <div key={col.canonical} className="flex justify-between text-slate-600 dark:text-slate-300">
                              <span>{col.label}:</span>
                              <span className="text-orange-600 dark:text-orange-400 font-semibold truncate max-w-[150px]" title={col.matchedHeader}>
                                {col.matchedHeader}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDraggingTarget('Serviços');
                    }}
                    onDragLeave={() => setDraggingTarget(null)}
                    onDrop={(e) => handleDrop(e, 'Serviços')}
                    onClick={() => servicosInputRef.current?.click()}
                    className={`cursor-pointer rounded-xl border-2 border-dashed p-7 text-center flex flex-col items-center justify-center transition-all ${
                      draggingTarget === 'Serviços'
                        ? 'border-[#F28C28] bg-[#F28C28]/10 scale-[1.01]'
                        : 'border-slate-300 dark:border-slate-700 hover:border-[#F28C28] hover:bg-white dark:hover:bg-slate-900'
                    }`}
                  >
                    <UploadCloud className="w-8 h-8 text-[#F28C28] mb-2" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Arraste a Planilha de Serviços aqui
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      ou clique para selecionar (.xlsx, .xls ou .csv)
                    </span>
                    <span className="mt-3 px-3 py-1.5 rounded-lg bg-[#F28C28] text-white text-[11px] font-bold">
                      Selecionar Serviços
                    </span>
                  </div>
                )}
              </div>

              <input
                ref={servicosInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFileChange(e, 'Serviços')}
                className="hidden"
              />
            </div>
          </div>

          {/* BARRA DE AÇÕES INFERIORES: DEMONSTRAÇÃO E LIMPEZA */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500 font-semibold">Testar c/ Dados de Demonstração Projel:</span>
              <button
                type="button"
                onClick={() => onLoadDemoData('both')}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 font-bold flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Carregar Ambas (Compras + Serviços)</span>
              </button>
              <button
                type="button"
                onClick={() => onLoadDemoData('compras')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-[11px] font-semibold"
              >
                Só Compras Demo
              </button>
              <button
                type="button"
                onClick={() => onLoadDemoData('servicos')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-[11px] font-semibold"
              >
                Só Serviços Demo
              </button>
            </div>

            {hasAnyLoaded && (
              <button
                type="button"
                onClick={onClearAllData}
                className="text-rose-600 dark:text-rose-400 hover:text-rose-700 text-xs font-semibold flex items-center gap-1"
                title="Limpa as planilhas salvas no navegador"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar dados salvos</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
