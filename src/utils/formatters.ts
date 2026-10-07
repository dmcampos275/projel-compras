/**
 * FORMATADORES E CONVERSORES DE DADOS (PT-BR)
 */

export const BRL_CURRENCY_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const BRL_NUMBER_FORMATTER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  return BRL_CURRENCY_FORMATTER.format(value);
}

/**
 * Formata valores monetários de forma abreviada para cards de KPI
 * Ex: R$ 1,2 mi / R$ 350 mil / R$ 850
 */
export function formatCompactCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}R$ ${(abs / 1_000_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} bi`;
  }
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${(abs / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} mil`;
  }
  return formatCurrency(value);
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
  }
  if (abs >= 10_000) {
    return `${sign}${(abs / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} mil`;
  }
  return formatNumber(value, 0);
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || isNaN(value)) return '0,0%';
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export const formatDateBR = formatDate;

export function formatDateISO(date: Date | null | undefined): string {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Converte valor de planilha brasileira ou Excel para número JavaScript float com total precisão.
 * Lida com padrões brasileiros (1.234,56 e 50.000), notação contábil (1.000,00) e exportações de ERP.
 */
export function parseExcelNumber(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = String(val).trim();
  if (!str) return 0;

  // Tratar formatação contábil com parênteses: (1.234,50) -> -1234.50
  let isNegative = false;
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  }

  // Remove símbolos de moeda (R$, $, etc.) e espaços normais ou não quebráveis (\u00A0)
  str = str.replace(/[R$\s\u00A0]/g, '').trim();

  // Remove caracteres que não sejam dígitos, vírgulas, pontos ou sinal de menos
  str = str.replace(/[^\d.,-]/g, '');
  if (!str) return 0;

  // CASO 1: Possui tanto vírgula quanto ponto (ex: 1.250.000,50 ou 1,250,000.50)
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // 1.234.567,89 -> Padrão brasileiro: pontos são milhares, vírgula é decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234,567.89 -> Padrão americano: vírgulas são milhares, ponto é decimal
      str = str.replace(/,/g, '');
    }
  }
  // CASO 2: Possui APENAS vírgula
  else if (str.includes(',')) {
    const commaParts = str.split(',');
    if (commaParts.length > 2) {
      // Mais de uma vírgula (ex: 1,234,567 sem ponto): vírgulas são milhares
      str = str.replace(/,/g, '');
    } else {
      // Apenas uma vírgula (ex: 1234,56): vírgula é decimal
      str = str.replace(',', '.');
    }
  }
  // CASO 3: Possui APENAS ponto (sem vírgulas)
  else if (str.includes('.')) {
    const dotParts = str.split('.');
    if (dotParts.length > 2) {
      // Mais de um ponto (ex: 1.250.000 ou 1.234.567): pontos são separadores de milhar!
      str = str.replace(/\./g, '');
    } else {
      // Apenas um ponto (ex: 1234.56, 0.500, 7.850, 1000.00):
      // Ponto único é o separador decimal padrão da computação e de bancos de dados ERP.
      // Mantém o ponto como decimal para preservar a precisão correta sem inflar valores por 1.000x.
    }
  }

  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : num;
}

/**
 * Converte datas de seriais do Excel, Date objects ou strings dd/mm/aaaa
 */
export function parseExcelDate(val: unknown): Date | null {
  if (val === null || val === undefined || val === '') return null;

  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }

  // Se for número serial do Excel (ex: 45200)
  if (typeof val === 'number') {
    // Excel base date: 1899-12-30 (inclui o bug do ano bissexto de 1900)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const millis = val * 86400 * 1000;
    const parsed = new Date(excelEpoch.getTime() + millis);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  const str = String(val).trim();
  if (!str) return null;

  // Formato dd/mm/aaaa ou dd/mm/aa
  const brMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    let year = parseInt(brMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Formato ISO aaaa-mm-dd
  const isoMatch = str.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  const generic = new Date(str);
  return isNaN(generic.getTime()) ? null : generic;
}

/**
 * Agrupa de forma inteligente a Situação original da O.C.
 */
export function classifyStatusGroup(
  rawStatus: string
): 'Aberta' | 'Parcialmente Atendida' | 'Atendida/Encerrada' | 'Cancelada' | 'Outros' {
  if (!rawStatus) return 'Outros';
  const clean = rawStatus
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (
    clean.includes('cancel') ||
    clean.includes('canc.') ||
    clean.includes('bloquead') ||
    clean.includes('rejeitad')
  ) {
    return 'Cancelada';
  }

  if (
    clean.includes('parcial') ||
    clean.includes('saldo') ||
    clean.includes('em atendimento') ||
    clean.includes('atend. parcial')
  ) {
    return 'Parcialmente Atendida';
  }

  if (
    clean.includes('encerrad') ||
    clean.includes('atendid') ||
    clean.includes('concluid') ||
    clean.includes('finalizad') ||
    clean.includes('recebid') ||
    clean.includes('fechad') ||
    clean.includes('liquid')
  ) {
    return 'Atendida/Encerrada';
  }

  if (
    clean.includes('abert') ||
    clean.includes('emitid') ||
    clean.includes('aprovad') ||
    clean.includes('liberad') ||
    clean.includes('pendent') ||
    clean.includes('em cotacao')
  ) {
    return 'Aberta';
  }

  return 'Outros';
}

/**
 * Higieniza e unifica nomes de fornecedores que contêm códigos ERP, filiais ou pontuações
 * Ex: "000123 - VOTORANTIM CIMENTOS S.A." -> "VOTORANTIM CIMENTOS S.A."
 */
export function extractSupplierDetails(raw: string): {
  cleanSupplier: string;
  supplierCode?: string;
} {
  const trimmed = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!trimmed || trimmed === 'Não informado') {
    return { cleanSupplier: 'Fornecedor não informado' };
  }

  // Padrão 1: "001234 - FORNECEDOR" ou "001234/0001 - FORNECEDOR" ou "12.345.678/0001-90 - FORNECEDOR"
  const matchPrefix = trimmed.match(/^([\d.\-\/]+)\s*[-:]\s*(.+)$/);
  if (matchPrefix) {
    const code = matchPrefix[1].trim();
    const name = matchPrefix[2].trim();
    if (name.length > 1) {
      return { cleanSupplier: name, supplierCode: code };
    }
  }

  // Padrão 2: "FORNECEDOR (001234)" ou "FORNECEDOR - 001234"
  const matchSuffix = trimmed.match(/^(.+?)\s*\(([\d.\-\/]+)\)$/);
  if (matchSuffix) {
    const name = matchSuffix[1].trim();
    const code = matchSuffix[2].trim();
    if (name.length > 1) {
      return { cleanSupplier: name, supplierCode: code };
    }
  }

  return { cleanSupplier: trimmed };
}

/**
 * Chave de busca simplificada para agrupar variações cadastrais de um mesmo fornecedor
 * Remove LTDA, S/A, ME, EPP, acentos e pontuação.
 */
export function normalizeSupplierUnifiedKey(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\b(LTDA|S\.?A\.?|S\/A|EPP|ME|EIRELI|DO BRASIL|INDUSTRIA E COMERCIO|IND\.? E COM\.?)\b/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
