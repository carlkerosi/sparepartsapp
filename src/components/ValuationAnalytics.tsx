import React, { useMemo } from 'react';
import { SparePart, SaleRecord } from '../types/inventory';
import { formatCurrency, formatNumber, calculateInventoryMetrics, calculateSalesMetrics } from '../utils/calculations';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  PieChart, 
  Award,
  AlertOctagon,
  ArrowRight
} from 'lucide-react';

interface ValuationAnalyticsProps {
  parts: SparePart[];
  sales: SaleRecord[];
  currencySymbol: string;
  onSelectCategory: (category: string) => void;
  onFilterLowStock: () => void;
}

export const ValuationAnalytics: React.FC<ValuationAnalyticsProps> = ({
  parts,
  sales,
  currencySymbol,
  onSelectCategory,
  onFilterLowStock,
}) => {
  const invMetrics = useMemo(() => calculateInventoryMetrics(parts), [parts]);
  const salesMetrics = useMemo(() => calculateSalesMetrics(sales), [sales]);

  // Category breakdown
  const categoryStats = useMemo(() => {
    const map = new Map<
      string,
      { count: number; units: number; landedVal: number; retailVal: number; fobVal: number }
    >();

    for (const p of parts) {
      const cat = p.category || 'General';
      const existing = map.get(cat) || { count: 0, units: 0, landedVal: 0, retailVal: 0, fobVal: 0 };
      const qty = Math.max(0, p.stockQuantity);
      map.set(cat, {
        count: existing.count + 1,
        units: existing.units + qty,
        landedVal: existing.landedVal + p.unitCostLanded * qty,
        retailVal: existing.retailVal + p.retailPriceEx * qty,
        fobVal: existing.fobVal + p.unitCostFobUsd * qty,
      });
    }

    return Array.from(map.entries())
      .map(([cat, stats]) => ({
        category: cat,
        ...stats,
        margin: stats.retailVal > 0 ? ((stats.retailVal - stats.landedVal) / stats.retailVal) * 100 : 0,
      }))
      .sort((a, b) => b.landedVal - a.landedVal);
  }, [parts]);

  // Top 5 highest capital value stock items
  const topCapitalParts = useMemo(() => {
    return [...parts]
      .map((p) => ({
        ...p,
        totalLandedValue: p.unitCostLanded * Math.max(0, p.stockQuantity),
        totalRetailValue: p.retailPriceEx * Math.max(0, p.stockQuantity),
      }))
      .sort((a, b) => b.totalLandedValue - a.totalLandedValue)
      .slice(0, 5);
  }, [parts]);

  // Best selling parts from sales records
  const topSellingParts = useMemo(() => {
    const map = new Map<string, { partNumber: string; description: string; units: number; revenue: number; profit: number }>();
    for (const s of sales) {
      for (const it of s.items) {
        const ex = map.get(it.partId) || {
          partNumber: it.partNumber,
          description: it.description,
          units: 0,
          revenue: 0,
          profit: 0,
        };
        map.set(it.partId, {
          partNumber: it.partNumber,
          description: it.description,
          units: ex.units + it.quantity,
          revenue: ex.revenue + it.lineTotalEx,
          profit: ex.profit + it.grossProfit,
        });
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [sales]);

  return (
    <div className="space-y-6">
      {/* 4 Financial Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total FOB Valuation */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>FOB Origin Valuation</span>
            <span className="text-[10px] font-mono text-slate-400">USD</span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            ${invMetrics.totalFobValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Supplier invoice value at port of export across {formatNumber(invMetrics.totalUnits)} on-hand units.
          </p>
        </div>

        {/* Total Landed Valuation */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Total Landed Valuation</span>
            <span className="text-[10px] font-mono text-slate-400">{currencySymbol}</span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {formatCurrency(invMetrics.totalLandedValueUsd, currencySymbol)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cleared inventory asset value in Kenyan Shillings (FOB converted + Sea/Air Freight + EAC Duties + Port Clearance).
          </p>
        </div>

        {/* Potential Retail Value */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Potential Retail (Ex-Tax)</span>
            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {formatCurrency(invMetrics.totalRetailValueEx, currencySymbol)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gross retail sales if current warehouse inventory is 100% sold at list price.
          </p>
        </div>

        {/* Unrealized Gross Margin */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Unrealized Gross Margin</span>
            <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
              +{invMetrics.unrealizedMarginPercent}%
            </span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-2">
            {formatCurrency(invMetrics.unrealizedProfit, currencySymbol)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Spread between Retail Ex and Landed Cost tied in current physical stock.
          </p>
        </div>
      </div>

      {/* 2 Column Section: Category Distribution & Top Capital Value Parts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-slate-600" />
              <span>Inventory Capital By Category</span>
            </h3>
            <span className="text-[11px] text-slate-500">Sorted by Landed Value</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-2 text-center">SKUs</th>
                  <th className="py-2.5 px-2 text-center">Stock</th>
                  <th className="py-2.5 px-3 text-right">Landed ({currencySymbol})</th>
                  <th className="py-2.5 px-3 text-right">Selling Ex ({currencySymbol})</th>
                  <th className="py-2.5 px-3 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categoryStats.map((cat) => (
                  <tr 
                    key={cat.category}
                    onClick={() => onSelectCategory(cat.category)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      {cat.category}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-600">
                      {cat.count}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono tabular-nums font-bold text-slate-900">
                      {cat.units}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                      {formatCurrency(cat.landedVal, currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">
                      {formatCurrency(cat.retailVal, currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-medium text-emerald-700">
                      {cat.margin.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 5 Capital Value Spare Parts */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-slate-600" />
              <span>Highest Capital Value Inventory Items</span>
            </h3>
            <span className="text-[11px] text-slate-500">Top on-hand investment</span>
          </div>

          <div className="p-4 space-y-3">
            {topCapitalParts.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 flex items-center justify-between gap-4 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 text-xs">#{idx + 1}</span>
                    <span className="font-mono font-bold text-slate-900">{item.partNumber}</span>
                    <span className="text-slate-500 text-[11px]">· {item.category}</span>
                  </div>
                  <div className="text-slate-700 text-[11px] truncate mt-0.5">
                    {item.description}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    Stock: {item.stockQuantity} units @ Landed {formatCurrency(item.unitCostLanded, currencySymbol)}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono tabular-nums font-bold text-slate-900 text-sm">
                    {formatCurrency(item.totalLandedValue, currencySymbol)}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-mono">
                    Retail: {formatCurrency(item.totalRetailValue, currencySymbol)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Best Sellers from Historical Records */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-600" />
          <span>Top Velocity Spare Parts (Historical Sales Volume)</span>
        </h3>

        {topSellingParts.length === 0 ? (
          <p className="text-xs text-slate-500">No sales transactions recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {topSellingParts.map((part, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-mono font-bold text-slate-900 text-xs block truncate">
                  {part.partNumber}
                </span>
                <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {part.description}
                </span>
                <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-baseline font-mono tabular-nums">
                  <span className="text-slate-900 font-bold">{part.units} units sold</span>
                  <span className="text-emerald-700 font-semibold text-[11px]">
                    +{formatCurrency(part.profit, currencySymbol)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
