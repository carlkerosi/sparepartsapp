import React, { useState } from 'react';
import { SaleRecord, InventorySettings } from '../types/inventory';
import { formatCurrency } from '../utils/calculations';
import { Printer, X, Check, ShieldCheck, Eye, EyeOff } from 'lucide-react';

interface InvoiceReceiptModalProps {
  sale: SaleRecord | null;
  settings: InventorySettings;
  isOpen: boolean;
  onClose: () => void;
}

export const InvoiceReceiptModal: React.FC<InvoiceReceiptModalProps> = ({
  sale,
  settings,
  isOpen,
  onClose,
}) => {
  const [showProfitMargin, setShowProfitMargin] = useState(false);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Controls Bar */}
        <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Receipt / Tax Invoice</span>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-xs text-slate-500">{sale.invoiceNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfitMargin(!showProfitMargin)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md cursor-pointer transition-colors"
              title="Toggle Merchant Profit & Cost Details"
            >
              {showProfitMargin ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                  <span>Customer View</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Manager View</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Document */}
        <div className="p-8 print:p-0 text-slate-900" id="printable-receipt">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {settings.businessName}
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                {settings.businessAddress}
              </p>
              <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                <div>Phone: <strong className="text-slate-700 font-mono">{settings.businessPhone}</strong> · Email: <span className="text-slate-700">{settings.businessEmail || 'orders@apexspares.co.ke'}</span></div>
                <div>
                  KRA e-TIMS PIN: <span className="font-mono font-bold text-slate-800">{settings.businessTaxId}</span>
                  {settings.businessRegNumber && (
                    <span> · BRS Reg: <span className="font-mono font-medium text-slate-700">{settings.businessRegNumber}</span></span>
                  )}
                </div>
                {(settings.mpesaPaybillNumber || settings.mpesaTillNumber) && (
                  <div className="text-[11px] text-emerald-800 font-mono">
                    Lipa na M-Pesa Paybill: <strong>{settings.mpesaPaybillNumber || '849204'}</strong> · Till: <strong>{settings.mpesaTillNumber || '948201'}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                TAX INVOICE / RECEIPT
              </span>
              <div className="text-base font-bold font-mono text-slate-900 mt-1">
                {sale.invoiceNumber}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                {new Date(sale.timestamp).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>

          {/* Customer & Vehicle Info */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] uppercase font-semibold">Billed To</span>
              <div className="font-semibold text-slate-900 text-sm mt-0.5">{sale.customerName}</div>
              {sale.customerPhone && (
                <div className="text-slate-500">Contact: {sale.customerPhone}</div>
              )}
            </div>

            <div className="text-right">
              <span className="text-slate-400 block text-[11px] uppercase font-semibold">Vehicle / Reference</span>
              <div className="font-medium text-slate-800 text-xs mt-0.5">
                {sale.vehicleRef || 'Counter Sale / Over the counter'}
              </div>
              <div className="text-slate-500 mt-0.5">
                Payment: <span className="font-semibold text-slate-700">{sale.paymentMethod}</span>
              </div>
              {sale.mpesaReceiptNumber && (
                <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 font-mono font-bold text-[11px]">
                  <span>M-Pesa Ref: {sale.mpesaReceiptNumber}</span>
                </div>
              )}
              {sale.deliveryAddress && (
                <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[240px]">
                  Dispatch To: {sale.deliveryAddress}
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-xs text-left my-4 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-2 px-1">Item Description</th>
                <th className="py-2 px-2 text-center w-16">Qty</th>
                <th className="py-2 px-2 text-right">Price (Ex)</th>
                <th className="py-2 px-2 text-right">Price (Inc)</th>
                <th className="py-2 px-2 text-right">Total (Ex)</th>
                {showProfitMargin && (
                  <th className="py-2 px-2 text-right text-emerald-700">Margin</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((item, i) => (
                <tr key={i} className="py-2">
                  <td className="py-2.5 px-1">
                    <span className="font-mono font-semibold text-slate-900 mr-1.5">
                      {item.partNumber}
                    </span>
                    <span className="text-slate-700">{item.description}</span>
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono tabular-nums">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                    {formatCurrency(item.unitPriceEx, settings.currencySymbol)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600">
                    {formatCurrency(item.unitPriceInc, settings.currencySymbol)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {formatCurrency(item.lineTotalEx, settings.currencySymbol)}
                  </td>
                  {showProfitMargin && (
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-emerald-700">
                      +{formatCurrency(item.grossProfit, settings.currencySymbol)} ({item.marginPercent}%)
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Invoice Summary Totals */}
          <div className="border-t border-slate-200 pt-4 flex justify-between items-start text-xs">
            <div className="max-w-xs text-slate-500">
              {sale.notes && (
                <div className="mb-2">
                  <span className="font-semibold text-slate-700">Notes:</span> {sale.notes}
                </div>
              )}
              <div className="text-[11px] leading-relaxed">
                Thank you for your business. Genuine replacement parts guaranteed.
                All goods remain property of vendor until fully paid.
              </div>
            </div>

            <div className="w-60 space-y-1.5 text-right">
              {showProfitMargin && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Goods Net (Ex-Tax):</span>
                    <span className="font-mono tabular-nums font-medium">
                      {formatCurrency(sale.subtotalEx, settings.currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>KRA 16% VAT Tax:</span>
                    <span className="font-mono tabular-nums font-medium text-emerald-800">
                      {formatCurrency(sale.taxAmount !== undefined ? sale.taxAmount : (sale.totalInc - sale.subtotalEx), settings.currencySymbol)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                <span>Total Amount Due:</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(sale.totalInc, settings.currencySymbol)}
                </span>
              </div>

              {showProfitMargin && (
                <div className="mt-3 pt-2 border-t border-dashed border-emerald-200 bg-emerald-50/50 p-2 rounded text-left">
                  <span className="text-[11px] font-semibold text-emerald-900 block">Manager COGS Breakdown:</span>
                  <div className="flex justify-between text-emerald-800 text-xs mt-0.5">
                    <span>Total Landed COGS:</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(sale.totalCogsLanded, settings.currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-900 text-xs font-bold mt-0.5">
                    <span>Gross Realized Profit:</span>
                    <span className="font-mono tabular-nums">
                      +{formatCurrency(sale.totalGrossProfit, settings.currencySymbol)} ({sale.marginPercent}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer stamp */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <div>Authorized Signature & Company Stamp</div>
            <div className="font-mono">Served by: {sale.salesPerson || 'Counter Attendant'}</div>
          </div>
        </div>

        {/* Action Button at bottom */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            Close Receipt
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
};
