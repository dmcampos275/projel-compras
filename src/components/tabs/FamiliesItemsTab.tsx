import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Layers, Package, TrendingUp, Filter } from 'lucide-react';
import { PurchaseRecord, CrossFilterAction } from '../../types/purchases';
import { formatCurrency, formatNumber, formatPercent, formatDate } from '../../utils/formatters';

interface FamiliesItemsTabProps {
  records: PurchaseRecord[];
  onApplyCrossFilter: (action: CrossFilterAction) => void;
}

const FAMILY_COLORS = ['#0B2545', '#1E4E8C', '#F28C28', '#10B981', '#6366F1', '#EC4899', '#8B5CF6'];

export const FamiliesItemsTab: React.FC<FamiliesItemsTabProps> = ({
  records,
  onApplyCrossFilter,
}) => {
  const [itemRankMode, setItemRankMode] = useState<'value' | 'quantity'>('value');

  // --- 1. Valor por Família ---
  const { familyData, grandTotal } = useMemo(() => {
    const map = new Map<string, { family: string; value: number; count: number }>();
    let total = 0;

    records.forEach((r) => {
      const fam = r.family || 'Geral / Outros';
      const cur = map.get(fam) || { family: fam, value: 0, count: 0 };
      cur.value += r.netValue;
      cur.count++;
      total += r.netValue;
      map.set(fam, cur);
    });

    const sorted = Array.from(map.values())
      .sort((a, b) => b.value - a.value)
      .map((f, idx) => ({
        ...f,
        percent: total > 0 ? (f.value / total) * 100 : 0,
        color: FAMILY_COLORS[idx % FAMILY_COLORS.length],
      }));

    return { familyData: sorted, grandTotal: total };
  }, [records]);

  // --- 2. Top 10 Itens / Serviços (por Valor ou por Quantidade) ---
  const topItemsData = useMemo(() => {
    const map = new Map<
      string,
      {
        service: string;
        family: string;
        unit: string;
        totalValue: number;
        totalQuantity: number;
        avgUnitPrice: number;
        count: number;
      }
    >();

    records.forEach((r) => {
      const srv = r.service || 'Item não especificado';
      const cur = map.get(srv) || {
        service: srv,
        family: r.family || 'Geral',
        unit: r.unit || 'UN',
        totalValue: 0,
        totalQuantity: 0,
        avgUnitPrice: 0,
        count: 0,
      };

      cur.totalValue += r.netValue;
      cur.totalQuantity += r.qtyRequested;
      cur.count++;
      map.set(srv, cur);
    });

    const items = Array.from(map.values()).map((i) => ({
      ...i,
      avgUnitPrice: i.totalQuantity > 0 ? i.totalValue / i.totalQuantity : 0,
      shortName: i.service.length > 25 ? `${i.service.slice(0, 23)}...` : i.service,
    }));

    if (itemRankMode === 'value') {
      return items.sort((a, b) => b.totalValue - a.totalValue).slice(0, 10);
    } else {
      return items.sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 10);
    }
  }, [records, itemRankMode]);

  // --- 3. Evolução Mensal das 5 Principais Famílias (Barras Empilhadas) ---
  const top5Families = useMemo(() => {
    return familyData.slice(0, 5).map((f) => f.family);
  }, [familyData]);

  const monthlyFamilyEvolution = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthsMap = new Map<string, { label: string; [fam: string]: string | number }>();

    for (let m = 0; m < 12; m++) {
      const entry: { label: string; [fam: string]: string | number } = { label: monthNames[m] };
      top5Families.forEach((f) => {
        entry[f] = 0;
      });
      monthsMap.set(monthNames[m], entry);
    }

    records.forEach((r) => {
      if (!r.issueDate) return;
      const m = r.issueDate.getMonth();
      const monthLabel = monthNames[m];
      const entry = monthsMap.get(monthLabel);
      if (entry && top5Families.includes(r.family)) {
        entry[r.family] = (Number(entry[r.family]) || 0) + r.netValue;
      }
    });

    return Array.from(monthsMap.values());
  }, [records, top5Families]);

  // --- 4. Histórico de Preço Unitário de um Item Selecionado ---
  // Obtém lista dos itens mais comprados para permitir seleção no select
  const distinctItemOptions = useMemo(() => {
    const map = new Map<string, number>();
    records.forEach((r) => {
      if (r.service && r.unitPrice > 0) {
        map.set(r.service, (map.get(r.service) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0]);
  }, [records]);

  const [selectedItemForPrice, setSelectedItemForPrice] = useState<string>('');

  // Seta item padrão inicial se ainda não selecionado
  const activePriceItem = selectedItemForPrice || distinctItemOptions[0] || '';

  const itemPriceHistory = useMemo(() => {
    if (!activePriceItem) return [];

    return records
      .filter((r) => r.service === activePriceItem && r.issueDate && r.unitPrice > 0)
      .sort((a, b) => a.issueDate!.getTime() - b.issueDate!.getTime())
      .map((r) => ({
        date: formatDate(r.issueDate),
        timestamp: r.issueDate!.getTime(),
        price: r.unitPrice,
        supplier: r.supplierTradeName || r.supplier,
        order: r.orderNumber,
        unit: r.unit,
      }));
  }, [records, activePriceItem]);

  return (
    <div className="space-y-6">
      {/* Linha 1: Famílias de Insumos & Top 10 Itens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Família */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#1E4E8C] dark:text-[#8DA9C4]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Compras por Família de Insumos
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Volume financeiro líquido e representatividade por grupo
              </p>
            </div>
            <span className="text-xs text-slate-400">Total: {formatCurrency(grandTotal)}</span>
          </div>

          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={familyData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="family"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  width={130}
                  tickFormatter={(fam) => fam.length > 18 ? `${fam.slice(0, 16)}...` : fam}
                />
                <Tooltip
                  formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Valor Líquido']}
                  contentStyle={{
                    backgroundColor: '#0B2545',
                    borderColor: '#13315C',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="value"
                  name="Total Comprado"
                  fill="#1E4E8C"
                  radius={[0, 4, 4, 0]}
                  onClick={(entry: any) => onApplyCrossFilter({ type: 'families', value: String(entry?.family || entry?.payload?.family || '') })}
                  className="cursor-pointer hover:opacity-85 transition-opacity"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 10 Itens com Alternador Valor / Quantidade */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Top 10 Itens Mais Comprados
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Itens com maior demanda física ou impacto no orçamento
              </p>
            </div>

            {/* Alternador Valor vs Quantidade */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setItemRankMode('value')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                  itemRankMode === 'value'
                    ? 'bg-white dark:bg-slate-900 text-[#0B2545] dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Por Valor (R$)
              </button>
              <button
                onClick={() => setItemRankMode('quantity')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${
                  itemRankMode === 'quantity'
                    ? 'bg-white dark:bg-slate-900 text-[#0B2545] dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Por Qtd
              </button>
            </div>
          </div>

          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topItemsData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis
                  type="number"
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) =>
                    itemRankMode === 'value' ? `R$ ${(val / 1000).toFixed(0)}k` : formatNumber(val)
                  }
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  width={140}
                />
                <Tooltip
                  formatter={(val: unknown) => [
                    itemRankMode === 'value' ? formatCurrency(Number(val) || 0) : formatNumber(Number(val) || 0),
                    itemRankMode === 'value' ? 'Valor Líquido' : 'Quantidade Pedida',
                  ]}
                  labelFormatter={(name, payload) => {
                    const row = payload?.[0]?.payload;
                    return row ? `${row.service} (${row.unit}) - ${row.family}` : name;
                  }}
                  contentStyle={{
                    backgroundColor: '#0B2545',
                    borderColor: '#13315C',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey={itemRankMode === 'value' ? 'totalValue' : 'totalQuantity'}
                  name={itemRankMode === 'value' ? 'Valor Líquido' : 'Qtd'}
                  fill={itemRankMode === 'value' ? '#0B2545' : '#F28C28'}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Linha 2: Evolução das 5 Principais Famílias (Barras Empilhadas) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Evolução Mensal das 5 Principais Famílias de Insumos
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Composição mensal empilhada das maiores categorias de aquisição
            </p>
          </div>
        </div>

        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyFamilyEvolution} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Valor']}
                contentStyle={{
                  backgroundColor: '#0B2545',
                  borderColor: '#13315C',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {top5Families.map((fam, index) => (
                <Bar
                  key={fam}
                  dataKey={fam}
                  name={fam}
                  stackId="a"
                  fill={FAMILY_COLORS[index % FAMILY_COLORS.length]}
                  radius={index === top5Families.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  onClick={() => onApplyCrossFilter({ type: 'families', value: fam })}
                  className="cursor-pointer"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Linha 3: Variação de Preço Unitário ao Longo do Tempo com Seletor */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Variação Histórica do Preço Unitário
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rastreamento de inflação, reajustes e cotações ao longo das ordens de compra
            </p>
          </div>

          {/* Dropdown de Seleção de Item */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
              Item analisado:
            </span>
            <select
              value={activePriceItem}
              onChange={(e) => setSelectedItemForPrice(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 max-w-sm focus:outline-none focus:border-[#1E4E8C]"
            >
              {distinctItemOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 h-72">
          {itemPriceHistory.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Nenhum histórico de preço registrado para este item no período.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={itemPriceHistory} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickFormatter={(val) => `R$ ${val}`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: unknown) => [formatCurrency(Number(val) || 0), 'Preço Unitário']}
                  labelFormatter={(date, payload) => {
                    const row = payload?.[0]?.payload;
                    return row ? `${date} · O.C. ${row.order} (${row.supplier})` : date;
                  }}
                  contentStyle={{
                    backgroundColor: '#0B2545',
                    borderColor: '#13315C',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  name="Preço Unitário"
                  stroke="#F28C28"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#F28C28' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
