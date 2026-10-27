import React, { useState, useMemo } from 'react';
import { SaleRecord } from '../types/inventory';
import { formatCurrency, calculateSalesMetrics } from '../utils/calculations';
import { 
  Search, 
  Receipt, 
  Download, 
  Eye, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Filter, 
  ArrowUpDown,
  ShoppingBag
} from 'lucide-react';

interface SalesLedgerProps {
  sales: SaleRecord[];
  currencySymbol: string;
  onViewReceipt: (sale: SaleRecord) => void;
  onExportCsv: () => void;
  onOpenNewSale: () => void;
}

export const SalesLedger: React.FC<SalesLedgerProps> = ({
  sales,
  currencySymbol,
  onViewReceipt,
  onExportCsv,
  onOpenNewSale,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

  // Filter sales
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return sales.filter((sale) => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchInv = sale.invoiceNumber.toLowerCase().includes(q);
        const matchCust = sale.customerName.toLowerCase().includes(q);
        const matchVeh = (sale.vehicleRef || '').toLowerCase().includes(q);
        const matchPart = sale.items.some(
          (it) => it.partNumber.toLowerCase().includes(q) || it.description.toLowerCase().includes(q)
        );

        if (!matchInv && !matchCust && !matchVeh && !matchPart) return false;
      }

      // Date Range
      if (dateRange !== 'ALL') {
        const saleDate = new Date(sale.timestamp);
        if (dateRange === 'TODAY') {
          if (sale.timestamp.slice(0, 10) !== todayStr) return false;
        } else if (dateRange === 'WEEK') {
          const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        } else if (dateRange === 'MONTH') {
          const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) return false;
        }
      }

      // Payment Filter
      if (paymentFilter !== 'ALL' && sale.paymentMethod !== paymentFilter) {
        return false;
      }

      return true;
    });
  }, [sales, searchTerm, dateRange, paymentFilter]);

  // Overall metrics for filtered sales
  const metrics = useMemo(() => calculateSalesMetrics(filteredSales), [filteredSales]);

  return (
    <div className="space-y-4">
      {/* Sales Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <span className="text-xs text-slate-500 block">Total Sales Count</span>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {metrics.totalSalesCount}{' '}
            <span className="text-xs font-normal text-slate-500">
              ({metrics.totalUnitsSold} parts sold)
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <span className="text-xs text-slate-500 block">Net Revenue (Ex-Tax)</span>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {formatCurrency(metrics.totalRevenueEx, currencySymbol)}
          </div>
          <span className="text-[11px] text-slate-400">
            {formatCurrency(metrics.totalRevenueInc, currencySymbol)} Gross Inc
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 border-l-4 border-l-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 block">16% VAT Tax (Owner)</span>
            <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded font-bold">KRA</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {formatCurrency(metrics.totalTaxCollected, currencySymbol)}
          </div>
          <span className="text-[11px] text-slate-400">Output tax on invoices</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <span className="text-xs text-slate-500 block">Landed Cost of Goods (COGS)</span>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-700 mt-1">
            {formatCurrency(metrics.totalCogsLanded, currencySymbol)}
          </div>
          <span className="text-[11px] text-slate-400">Freight & origin cost</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <span className="text-xs text-slate-500 block">Realized Gross Profit</span>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
            +{formatCurrency(metrics.totalGrossProfit, currencySymbol)}{' '}
            <span className="text-xs font-normal">({metrics.overallMarginPercent}%)</span>
          </div>
          <span className="text-[11px] text-slate-400">Actual business profit</span>
        </div>
      </div>

      {/* Main Ledger Table Container */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {/* Search & Filter Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice #, customer, vehicle, or part #..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range Buttons (Zero-Pill interactive controls) */}
            <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
              <button
                onClick={() => setDateRange('ALL')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  dateRange === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setDateRange('TODAY')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  dateRange === 'TODAY' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateRange('WEEK')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  dateRange === 'WEEK' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setDateRange('MONTH')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  dateRange === 'MONTH' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                }`}
              >
                Last 30 Days
              </button>
            </div>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="ALL">All Payments</option>
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Store Credit">Store Credit</option>
            </select>

            {/* Export CSV */}
            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Ledger CSV</span>
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                <th className="py-3 px-4">Invoice # & Date</th>
                <th className="py-3 px-4">Customer & Vehicle</th>
                <th className="py-3 px-4">Parts Sold (Items)</th>
                <th className="py-3 px-3 text-center">Qty</th>
                <th className="py-3 px-3 text-right">COGS Landed ({currencySymbol})</th>
                <th className="py-3 px-3 text-right">Revenue Ex ({currencySymbol})</th>
                <th className="py-3 px-3 text-right">16% VAT ({currencySymbol})</th>
                <th className="py-3 px-3 text-right">Total Inc ({currencySymbol})</th>
                <th className="py-3 px-3 text-right">Gross Profit ({currencySymbol})</th>
                <th className="py-3 px-3 text-center">Payment</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">No sales transactions found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No records match the active search or date filters.
                    </p>
                    <button
                      onClick={onOpenNewSale}
                      className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Record New Sale</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Invoice & Date */}
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        {sale.invoiceNumber}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(sale.timestamp).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        ·{' '}
                        {new Date(sale.timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    {/* Customer & Vehicle */}
                    <td className="py-3 px-4 align-top">
                      <div className="font-medium text-slate-900 text-xs">
                        {sale.customerName}
                      </div>
                      {sale.vehicleRef && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {sale.vehicleRef}
                        </div>
                      )}
                    </td>

                    {/* Parts Sold Breakdown */}
                    <td className="py-3 px-4 align-top max-w-sm">
                      <div className="space-y-1">
                        {sale.items.map((it, idx) => (
                          <div key={idx} className="flex items-baseline justify-between gap-2 text-xs">
                            <span className="truncate">
                              <span className="font-mono font-semibold text-slate-800 mr-1">
                                {it.partNumber}
                              </span>
                              <span className="text-slate-600 text-[11px]">{it.description}</span>
                            </span>
                            <span className="font-mono tabular-nums text-slate-500 shrink-0 text-[11px]">
                              {it.quantity}x @ {formatCurrency(it.unitPriceEx, currencySymbol)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Units */}
                    <td className="py-3 px-3 align-top text-center font-mono tabular-nums font-semibold text-slate-800">
                      {sale.totalUnits}
                    </td>

                    {/* Landed Cost COGS */}
                    <td className="py-3 px-3 align-top text-right font-mono tabular-nums text-slate-500">
                      {formatCurrency(sale.totalCogsLanded, currencySymbol)}
                    </td>

                    {/* Revenue Ex */}
                    <td className="py-3 px-3 align-top text-right font-mono tabular-nums font-medium text-slate-900">
                      {formatCurrency(sale.subtotalEx, currencySymbol)}
                    </td>

                    {/* 16% VAT Tax */}
                    <td className="py-3 px-3 align-top text-right font-mono tabular-nums text-slate-600 font-medium">
                      {formatCurrency(sale.taxAmount !== undefined ? sale.taxAmount : Math.max(0, (sale.totalInc || 0) - (sale.subtotalEx || 0)), currencySymbol)}
                    </td>

                    {/* Total Inc */}
                    <td className="py-3 px-3 align-top text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatCurrency(sale.totalInc, currencySymbol)}
                    </td>

                    {/* Gross Profit & Margin */}
                    <td className="py-3 px-3 align-top text-right font-mono tabular-nums">
                      <div className="font-bold text-emerald-700">
                        +{formatCurrency(sale.totalGrossProfit, currencySymbol)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {sale.marginPercent}% margin
                      </div>
                    </td>

                    {/* Payment Method */}
                    <td className="py-3 px-3 align-top text-center whitespace-nowrap text-slate-700">
                      {sale.paymentMethod}
                    </td>

                    {/* View Receipt Button */}
                    <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                      <button
                        onClick={() => onViewReceipt(sale)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-slate-500" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <div>
            Showing <span className="font-mono font-semibold text-slate-700">{filteredSales.length}</span> sales transactions
          </div>
          <div className="font-mono">
            Total Revenue: {formatCurrency(metrics.totalRevenueEx, currencySymbol)} Ex
          </div>
        </div>
      </div>
    </div>
  );
};
