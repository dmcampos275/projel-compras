/**
 * MAPA DE COLUNAS CONFIGURÁVEL - DASHBOARD DE COMPRAS PROJEL ENGENHARIA
 * 
 * Se o ERP exportar um arquivo com nomes ligeiramente diferentes,
 * adicione os novos nomes ao array 'aliases' do respectivo campo abaixo.
 * A busca ignora acentos, espaços extras e maiúsculas/minúsculas.
 */

export interface CanonicalFieldConfig {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];
}

export const COLUMN_DEFINITIONS: CanonicalFieldConfig[] = [
  // --- IDENTIFICAÇÃO ---
  {
    key: 'branch',
    label: 'Filial',
    required: false,
    aliases: ['filial', 'cod filial', 'codigo filial', 'unidade', 'empresa filial', 'filial oc'],
  },
  {
    key: 'orderNumber',
    label: 'Nº Ordem Compra',
    required: true,
    aliases: [
      'no ordem compra',
      'no. ordem compra',
      'nr ordem compra',
      'numero ordem compra',
      'ordem compra',
      'ordem de compra',
      'nr oc',
      'num oc',
      'pedido',
      'pedido compra',
      'n ordem compra',
    ],
  },
  {
    key: 'seq',
    label: 'Seq.',
    required: false,
    aliases: ['seq.', 'seq', 'sequencia', 'sequencial', 'item oc', 'item'],
  },
  {
    key: 'status',
    label: 'Situação',
    required: true,
    aliases: ['situacao', 'status', 'posicao', 'situacao oc', 'fase'],
  },
  {
    key: 'reason',
    label: 'Motivo',
    required: false,
    aliases: ['motivo', 'cod motivo', 'codigo motivo'],
  },
  {
    key: 'reasonDescription',
    label: 'Descrição do Motivo',
    required: false,
    aliases: ['descricao do motivo', 'descricao motivo', 'motivo cancelamento', 'justificativa', 'desc motivo'],
  },

  // --- ITEM ---
  {
    key: 'service',
    label: 'Serviço / Item',
    required: true,
    aliases: [
      'servico',
      'item',
      'produto',
      'descricao',
      'descricao do servico',
      'descricao do produto',
      'descricao do item',
      'servico / produto',
    ],
  },
  {
    key: 'descriptionComplement',
    label: 'Complemento da Descrição',
    required: false,
    aliases: [
      'complemento da descricao',
      'complemento',
      'detalhamento',
      'especificacao',
      'obs item',
      'observacao item',
    ],
  },
  {
    key: 'family',
    label: 'Família',
    required: false,
    aliases: [
      'familia',
      'grupo produto',
      'grupo de produto',
      'grupo de material',
      'categoria',
      'familia de materiais',
      'classe',
    ],
  },
  {
    key: 'unit',
    label: 'U.M. O.C.',
    required: false,
    aliases: ['u.m. o.c.', 'u.m.', 'um', 'unidade', 'unidade de medida', 'un'],
  },

  // --- FORNECEDOR ---
  {
    key: 'supplier',
    label: 'Fornecedor',
    required: true,
    aliases: [
      'fornecedor',
      'razao social',
      'razao social fornecedor',
      'nome fornecedor',
      'parceiro',
      'fornecedor razao',
    ],
  },
  {
    key: 'supplierTradeName',
    label: 'Fantasia Fornecedor',
    required: false,
    aliases: ['fantasia fornecedor', 'nome fantasia', 'fantasia', 'fornecedor fantasia'],
  },
  {
    key: 'supplierGroup',
    label: 'Grupo Forn.',
    required: false,
    aliases: ['grupo forn.', 'grupo forn', 'grupo fornecedor', 'tipo fornecedor', 'classificacao forn'],
  },
  {
    key: 'supplierState',
    label: 'UF Forn.',
    required: false,
    aliases: ['uf forn.', 'uf forn', 'uf fornecedor', 'estado fornecedor', 'uf', 'estado'],
  },

  // --- QUANTIDADES ---
  {
    key: 'qtyRequested',
    label: 'Quantidade Pedida',
    required: false,
    aliases: ['quantidade pedida', 'qtd pedida', 'qtd. pedida', 'quantidade', 'qtd solicitada'],
  },
  {
    key: 'qtyCancelled',
    label: 'Quantidade Cancelada',
    required: false,
    aliases: ['quantidade cancelada', 'qtd cancelada', 'qtd. cancelada'],
  },
  {
    key: 'qtyOpen',
    label: 'Quantidade Aberto',
    required: false,
    aliases: ['quantidade aberto', 'qtd aberto', 'qtd. aberto', 'quantidade em aberto', 'saldo aberto'],
  },
  {
    key: 'qtyReceived',
    label: 'Quantidade Recebida',
    required: false,
    aliases: ['quantidade recebida', 'qtd recebida', 'qtd. recebida', 'quantidade entregue', 'atendido'],
  },

  // --- VALORES ---
  {
    key: 'unitPrice',
    label: 'Preço Unitário',
    required: false,
    aliases: [
      'preco unitario',
      'preco unit.',
      'preco unit',
      'vlr unitario',
      'vlr unit.',
      'vlr unit',
      'vlr. unitario',
      'vlr. unit',
      'valor unitario',
      'vl unitario',
      'vl unit',
      'preco',
      'unitario',
      'vlr un',
      'preco un',
      'c7_preco',
    ],
  },
  {
    key: 'itemValue',
    label: 'Valor do Item',
    required: false,
    aliases: [
      'valor do item',
      'vlr do item',
      'vlr. do item',
      'vlr item',
      'vlr. item',
      'vl item',
      'vl. item',
      'valor item',
      'total item',
      'valor bruto',
      'vlr bruto',
      'vl bruto',
      'total bruto',
      'valor mercadoria',
      'vlr mercadoria',
      'valor produto',
      'vlr produto',
      'total produto',
    ],
  },
  {
    key: 'netValue',
    label: 'Valor Líquido',
    required: true,
    aliases: [
      'valor liquido',
      'vlr liquido',
      'vlr. liquido',
      'vl liquido',
      'vl. liquido',
      'total liquido',
      'valor liq',
      'vlr liq',
      'valor liq.',
      'vlr liq.',
      'valor liquido total',
      'vlr liquido total',
      'total liquido oc',
      'valor liquido oc',
      'valor total liquido',
      'valor total',
      'vlr total',
      'vlr. total',
      'vl total',
      'vl. total',
      'total geral',
      'valor da oc',
      'total da oc',
      'valor do pedido',
      'total pedido',
      'total oc',
      'total',
      'valor',
      'valor final',
      'vlr final',
      'total da nota',
      'valor mercadoria',
      'vlr mercadoria',
      'total mercadoria',
      'c7_total',
    ],
  },
  {
    key: 'openValue',
    label: 'Valor em Aberto',
    required: false,
    aliases: [
      'valor em aberto',
      'vlr aberto',
      'vl aberto',
      'saldo aberto vlr',
      'valor aberto',
      'saldo aberto valor',
      'valor em abeto moeda emp.',
      'valor em abeto moeda emp',
      'valor em abeto',
      'valor em aberto moeda emp.',
      'valor em aberto moeda emp',
      'vlr em aberto moeda emp.',
      'vlr em aberto moeda emp',
      'saldo aberto moeda emp.',
      'saldo aberto moeda emp',
    ],
  },
  {
    key: 'cancelledValue',
    label: 'Valor Cancelado',
    required: false,
    aliases: ['valor cancelado', 'vlr cancelado', 'vl cancelado'],
  },
  {
    key: 'discountValue',
    label: 'Vlr Desc',
    required: false,
    aliases: ['vlr desc', 'valor desc', 'valor desconto', 'vlr desconto', 'desconto r$', 'desconto'],
  },
  {
    key: 'discountPercent',
    label: '% Desconto',
    required: false,
    aliases: ['% desconto', 'perc desconto', 'percentual desconto', 'porc desconto'],
  },
  {
    key: 'ipiValue',
    label: 'Valor IPI',
    required: false,
    aliases: ['valor ipi', 'vlr ipi', 'ipi'],
  },
  {
    key: 'icmsValue',
    label: 'Valor ICMS',
    required: false,
    aliases: ['valor icms', 'vlr icms', 'icms'],
  },
  {
    key: 'issValue',
    label: 'Valor ISS',
    required: false,
    aliases: ['valor iss', 'vlr iss', 'iss', 'iss retido', 'valor iss retido', 'vlr iss retido'],
  },
  {
    key: 'inssValue',
    label: 'Valor INSS',
    required: false,
    aliases: ['valor inss', 'vlr inss', 'inss', 'inss retido', 'valor inss retido', 'vlr inss retido'],
  },
  {
    key: 'irrfValue',
    label: 'Vlr. IRRF',
    required: false,
    aliases: ['vlr. irrf', 'vlr irrf', 'valor irrf', 'irrf', 'irrf retido', 'valor irrf retido', 'vlr irrf retido'],
  },
  {
    key: 'pisValue',
    label: 'Vlr. PIS Retido',
    required: false,
    aliases: ['vlr. pis retido', 'vlr pis retido', 'valor pis retido', 'pis retido', 'pis', 'vlr pis', 'vlr. pis'],
  },
  {
    key: 'cofinsValue',
    label: 'Vlr. Cofins Ret.',
    required: false,
    aliases: [
      'vlr. cofins ret.',
      'vlr. cofins ret',
      'vlr cofins ret',
      'vlr cofins ret.',
      'valor cofins retido',
      'cofins retido',
      'cofins ret.',
      'cofins',
      'vlr cofins',
    ],
  },
  {
    key: 'csllValue',
    label: 'Valor CSLL Retido',
    required: false,
    aliases: [
      'valor csll retido',
      'valor csll  retido',
      'vlr csll retido',
      'vlr. csll retido',
      'csll retido',
      'csll',
      'valor csll',
      'vlr csll',
    ],
  },

  // --- DATAS ---
  {
    key: 'issueDate',
    label: 'Emissão',
    required: true,
    aliases: ['emissao', 'data emissao', 'dt emissao', 'data de emissao', 'dt. emissao', 'data oc'],
  },
  {
    key: 'deliveryDate',
    label: 'Entrega',
    required: false,
    aliases: ['entrega', 'data entrega', 'dt entrega', 'previsao entrega', 'data de entrega', 'dt. entrega'],
  },
  {
    key: 'quoteDate',
    label: 'Data Cotação ou Índice',
    required: false,
    aliases: ['data cotacao ou indice', 'data cotacao', 'dt cotacao', 'cotacao'],
  },

  // --- CLASSIFICAÇÃO ---
  {
    key: 'costCenter',
    label: 'Centro de Custo',
    required: false,
    aliases: ['centro de custo', 'c.custo', 'centro custo', 'cc', 'obra', 'obra / centro de custo'],
  },
  {
    key: 'costCenterAbbr',
    label: 'Abrev. C.Custos',
    required: false,
    aliases: ['abrev. c.custos', 'abrev c.custos', 'abrev c custo', 'sigla cc', 'abrev centro de custo'],
  },
  {
    key: 'financialAccount',
    label: 'Cta. Financeira',
    required: false,
    aliases: ['cta. financeira', 'cta financeira', 'conta financeira'],
  },
  {
    key: 'financialAccountAbbr',
    label: 'Abrev. C.Financeira',
    required: false,
    aliases: ['abrev. c.financeira', 'abrev c financeira'],
  },
  {
    key: 'accountingAccount',
    label: 'Cta. Contábil',
    required: false,
    aliases: ['cta. contabil', 'cta contabil', 'conta contabil'],
  },
  {
    key: 'accountingAccountAbbr',
    label: 'Abrev. C.Contábil',
    required: false,
    aliases: ['abrev. c.contabil', 'abrev c contabil'],
  },

  // --- RESPONSÁVEIS ---
  {
    key: 'buyer',
    label: 'Usuário Comprador (Nome)',
    required: false,
    aliases: [
      'usuario comprador (nome)',
      'usuario comprador',
      'comprador',
      'comprador nome',
      'nome comprador',
      'responsavel compra',
    ],
  },
  {
    key: 'creator',
    label: 'Usuário Gerador (Nome)',
    required: false,
    aliases: [
      'usuario gerador (nome)',
      'usuario gerador',
      'gerador',
      'solicitante',
      'requisitante',
      'autor',
      'criador',
    ],
  },

  // --- ENTREGA E LOCALIDADE ---
  {
    key: 'deliveryCity',
    label: 'Cid. Ent. (Seq end entrega)',
    required: false,
    aliases: ['cid. ent. (seq end entrega)', 'cid. ent.', 'cid ent', 'cidade entrega', 'municipio entrega'],
  },
  {
    key: 'deliveryState',
    label: 'Est. Ent. (Seq end entrega)',
    required: false,
    aliases: ['est. ent. (seq end entrega)', 'est. ent.', 'est ent', 'estado entrega', 'uf entrega'],
  },

  // --- MOEDA ---
  {
    key: 'currency',
    label: 'Moeda',
    required: false,
    aliases: ['moeda', 'cod moeda', 'codigo moeda'],
  },
  {
    key: 'currencyDesc',
    label: 'Descrição Moeda',
    required: false,
    aliases: ['descricao moeda', 'desc moeda', 'nome moeda'],
  },
];

/**
 * Normaliza qualquer texto retirando acentos, pontuação desnecessária,
 * convertendo para minúsculas e removendo espaços duplicados.
 * Trata pontos, quebras de linha e caracteres invisíveis.
 */
export function normalizeHeaderString(str: string | unknown): string {
  if (typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // remove caracteres invisíveis/zero-width
    .replace(/[.\r\n\t_]/g, ' ')      // troca pontos, quebras e underscores por espaços
    .replace(/\s+/g, ' ')            // unifica espaços múltiplos e duplos
    .trim();
}

/**
 * Mapeia os cabeçalhos brutos da planilha para as propriedades canônicas do sistema.
 * Suporta sobrescrita de mapeamento manual específica por base.
 */
export function matchHeadersToColumns(
  rawHeaders: string[],
  customOverrides?: Record<string, string>
): {
  matchedMap: Map<string, string>; // canonicalKey -> rawHeader
  matchedDetails: {
    canonical: string;
    matchedHeader: string;
    label: string;
    required: boolean;
  }[];
  missingEssential: string[];
  unmatchedHeaders: string[];
} {
  const matchedMap = new Map<string, string>();
  const matchedDetails: {
    canonical: string;
    matchedHeader: string;
    label: string;
    required: boolean;
  }[] = [];
  const matchedHeaderSet = new Set<string>();

  // Aplica sobrescrita personalizada se houver
  if (customOverrides) {
    for (const [canonicalKey, rawHeaderName] of Object.entries(customOverrides)) {
      if (rawHeaders.includes(rawHeaderName)) {
        const def = COLUMN_DEFINITIONS.find((d) => d.key === canonicalKey);
        matchedMap.set(canonicalKey, rawHeaderName);
        matchedHeaderSet.add(rawHeaderName);
        matchedDetails.push({
          canonical: canonicalKey,
          matchedHeader: rawHeaderName,
          label: def?.label || canonicalKey,
          required: def?.required || false,
        });
      }
    }
  }

  const normalizedRaw = rawHeaders.map((h) => ({
    original: h,
    normalized: normalizeHeaderString(h),
  }));

  // FASE 1: Casamento Exato Estrito (Strict Exact Match)
  for (const def of COLUMN_DEFINITIONS) {
    if (matchedMap.has(def.key)) continue;

    for (const alias of def.aliases) {
      const normAlias = normalizeHeaderString(alias);
      const match = normalizedRaw.find(
        (nr) => !matchedHeaderSet.has(nr.original) && nr.normalized === normAlias
      );
      if (match) {
        matchedMap.set(def.key, match.original);
        matchedHeaderSet.add(match.original);
        matchedDetails.push({
          canonical: def.key,
          matchedHeader: match.original,
          label: def.label,
          required: def.required,
        });
        break;
      }
    }
  }

  // FASE 2: Casamento Aproximado Inteligente (apenas para campos ainda não mapeados)
  for (const def of COLUMN_DEFINITIONS) {
    if (matchedMap.has(def.key)) continue;

    for (const alias of def.aliases) {
      const normAlias = normalizeHeaderString(alias);
      if (normAlias.length < 4) continue;

      const match = normalizedRaw.find((nr) => {
        if (matchedHeaderSet.has(nr.original)) return false;
        if (nr.normalized.length < 4) return false;

        // Proteções contra falsos positivos cruciais em compras e serviços:
        // Não confundir "Seq." com "Seq. Pedido"
        if (def.key === 'seq' && nr.normalized.includes('pedido')) {
          return false;
        }

        // Não confundir "Filial" com "Filial Pedido"
        if (def.key === 'branch' && nr.normalized.includes('pedido')) {
          return false;
        }

        // Não confundir "Valor do Item" com "Valor Líquido"
        if (def.key === 'netValue' && nr.normalized.includes('item')) {
          return false;
        }
        if (def.key === 'itemValue' && nr.normalized.includes('liquid')) {
          return false;
        }

        if (def.key === 'netValue' || def.key === 'itemValue') {
          if (
            nr.normalized.includes('cancelad') ||
            nr.normalized.includes('abert') ||
            nr.normalized.includes('desc') ||
            nr.normalized.includes('ipi') ||
            nr.normalized.includes('icms') ||
            nr.normalized.includes('iss') ||
            nr.normalized.includes('unitari')
          ) {
            return false;
          }
        }

        if (def.key === 'qtyRequested') {
          if (
            nr.normalized.includes('cancelad') ||
            nr.normalized.includes('abert') ||
            nr.normalized.includes('recebid') ||
            nr.normalized.includes('entregu')
          ) {
            return false;
          }
        }

        // Evita que cabeçalhos genéricos como 'valor' casem com 'valor unitario'
        if (def.key === 'unitPrice' && (nr.normalized === 'valor' || nr.normalized === 'total')) {
          return false;
        }

        // Se o cabeçalho for exatamente 'valor' ou 'total', prioriza netValue ou itemValue
        if ((nr.normalized === 'valor' || nr.normalized === 'total') && (def.key === 'netValue' || def.key === 'itemValue')) {
          return true;
        }

        // Regra geral de inclusão segura
        if (nr.normalized.includes(normAlias)) return true;
        if (normAlias.includes(nr.normalized) && nr.normalized.length >= 6) return true;

        return false;
      });

      if (match) {
        matchedMap.set(def.key, match.original);
        matchedHeaderSet.add(match.original);
        matchedDetails.push({
          canonical: def.key,
          matchedHeader: match.original,
          label: def.label,
          required: def.required,
        });
        break;
      }
    }
  }

  // Lista de colunas essenciais estipuladas no briefing:
  // Filial, Nº Ordem Compra, Seq., Fornecedor, Emissão, Entrega, Valor Líquido (ou Valor do Item),
  // Quantidade Pedida, Quantidade Recebida, Quantidade Aberto, Situação.
  const essentialDefinitions: { keys: string[]; label: string }[] = [
    { keys: ['branch'], label: 'Filial' },
    { keys: ['orderNumber'], label: 'Nº Ordem Compra' },
    { keys: ['seq'], label: 'Seq.' },
    { keys: ['supplier'], label: 'Fornecedor / Prestador' },
    { keys: ['issueDate'], label: 'Emissão' },
    { keys: ['deliveryDate'], label: 'Entrega' },
    { keys: ['netValue', 'itemValue'], label: 'Valor Líquido (ou Valor do Item)' },
    { keys: ['qtyRequested'], label: 'Quantidade Pedida' },
    { keys: ['qtyReceived'], label: 'Quantidade Recebida' },
    { keys: ['qtyOpen'], label: 'Quantidade Aberto' },
    { keys: ['status'], label: 'Situação' },
  ];

  const missingEssential: string[] = [];
  for (const ess of essentialDefinitions) {
    const hasAny = ess.keys.some((k) => matchedMap.has(k));
    if (!hasAny) {
      missingEssential.push(ess.label);
    }
  }

  // Cabeçalhos que sobraram sem mapear
  const unmatchedHeaders = rawHeaders.filter((h) => !matchedHeaderSet.has(h));

  return {
    matchedMap,
    matchedDetails,
    missingEssential,
    unmatchedHeaders,
  };
}

/**
 * Compara a ordem das colunas de duas planilhas e retorna aviso informativo se for diferente
 */
export function checkColumnOrderNotice(headers1: string[], headers2: string[]): string | undefined {
  if (!headers1.length || !headers2.length) return undefined;
  const h1 = headers1.map((h) => normalizeHeaderString(h));
  const h2 = headers2.map((h) => normalizeHeaderString(h));
  const minLen = Math.min(h1.length, h2.length);
  let differentOrder = false;

  for (let i = 0; i < minLen; i++) {
    if (h1[i] !== h2[i]) {
      differentOrder = true;
      break;
    }
  }

  if (differentOrder) {
    return 'Aviso: A ordem das colunas desta planilha é diferente da outra base carregada. O sistema mapeou cada coluna pelo NOME do cabeçalho automaticamente com sucesso.';
  }
  return undefined;
}

