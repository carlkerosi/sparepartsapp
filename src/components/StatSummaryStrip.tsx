import React from 'react';
import { InventoryMetrics, formatCurrency, formatNumber } from '../utils/calculations';
import { AlertCircle, AlertTriangle, Layers, DollarSign, TrendingUp } from 'lucide-react';

interface StatSummaryStripProps {
  metrics: InventoryMetrics;
  currencySymbol: string;
  onFilterLowStock?: () => void;
  onFilterOutOfStock?: () => void;
}

export const StatSummaryStrip: React.FC<StatSummaryStripProps> = ({
  metrics,
  currencySymbol,
  onFilterLowStock,
  onFilterOutOfStock,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {/* 1. Total Stock Units */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
          <span>Total Units in Stock</span>
          <Layers className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {formatNumber(metrics.totalUnits)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Across {metrics.totalSkus} active SKUs
          </div>
        </div>
      </div>

      {/* 2. Low Stock & Out of Stock Alerts */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
          <span>Real-Time Alerts</span>
          <AlertTriangle className={`w-3.5 h-3.5 ${metrics.lowStockCount > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-2 font-mono tabular-nums">
            <button 
              onClick={onFilterLowStock} 
              title="Click to filter low stock items"
              className="text-lg font-bold text-amber-700 hover:underline cursor-pointer"
            >
              {metrics.lowStockCount}
            </button>
            <span className="text-xs text-slate-400">low</span>
            <span className="text-slate-300">/</span>
            <button 
              onClick={onFilterOutOfStock} 
              title="Click to filter out of stock items"
              className="text-lg font-bold text-rose-700 hover:underline cursor-pointer"
            >
              {metrics.outOfStockCount}
            </button>
            <span className="text-xs text-slate-400">out</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Reorder thresholds reached
          </div>
        </div>
      </div>

      {/* 3. Total FOB Valuation USD */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
          <span>FOB Inventory Value</span>
          <span className="text-[10px] font-mono text-slate-400">USD</span>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {formatCurrency(metrics.totalFobValueUsd, '$')}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Port of origin cost
          </div>
        </div>
      </div>

      {/* 4. Total Landed Cost Valuation */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
          <span>Total Landed Cost</span>
          <span className="text-[10px] font-mono font-semibold text-slate-400">{currencySymbol}</span>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {formatCurrency(metrics.totalLandedValueUsd, currencySymbol)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Freight & customs cleared
          </div>
        </div>
      </div>

      {/* 5. Potential Retail Value (Ex-Tax) */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
          <span>Selling Value (Ex)</span>
          <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {formatCurrency(metrics.totalRetailValueEx, currencySymbol)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {formatCurrency(metrics.totalRetailValueInc, currencySymbol)} Selling Inc
          </div>
        </div>
      </div>

      {/* 6. Unrealized Gross Profit Margin */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
        <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
          <span>Unrealized Margin</span>
          <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
            +{metrics.unrealizedMarginPercent}%
          </span>
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold tracking-tight text-emerald-700 font-mono tabular-nums">
            {formatCurrency(metrics.unrealizedProfit, currencySymbol)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Selling Ex minus Landed
          </div>
        </div>
      </div>
    </div>
  );
};
