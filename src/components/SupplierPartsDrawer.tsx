import React from 'react';
import { Supplier, SparePart } from '../types/inventory';
import { formatCurrency, getStockStatus } from '../utils/calculations';
import { X, Package, ExternalLink, Plus, AlertTriangle, Building2 } from 'lucide-react';

interface SupplierPartsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  parts: SparePart[];
  currencySymbol: string;
  onFastSell: (part: SparePart) => void;
  onEditPart: (part: SparePart) => void;
  onAddPartForThisSupplier: (supplier: Supplier) => void;
}

export const SupplierPartsDrawer: React.FC<SupplierPartsDrawerProps> = ({
  isOpen,
  onClose,
  supplier,
  parts,
  currencySymbol,
  onFastSell,
  onEditPart,
  onAddPartForThisSupplier,
}) => {
  if (!isOpen || !supplier) return null;

  const linkedParts = parts.filter((p) => p.supplierId === supplier.id);

  const totalUnits = linkedParts.reduce((acc, p) => acc + Math.max(0, p.stockQuantity), 0);
  const totalLandedValue = linkedParts.reduce((acc, p) => acc + p.unitCostLanded * Math.max(0, p.stockQuantity), 0);
  const totalFobValue = linkedParts.reduce((acc, p) => acc + p.unitCostFobUsd * Math.max(0, p.stockQuantity), 0);
  const lowStockCount = linkedParts.filter((p) => p.stockQuantity <= p.minStockLevel).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-500 uppercase">{supplier.code}</span>
                <span className="text-slate-300">·</span>
                <h2 className="text-base font-bold text-slate-900">{supplier.name}</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {supplier.country} · Terms: <strong className="text-slate-700">{supplier.paymentTerms}</strong> · Shipping: <strong className="text-slate-700">{supplier.shippingTerms}</strong> ({supplier.leadTimeDays}d lead time)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddPartForThisSupplier(supplier)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link New Part</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="px-6 py-3 bg-slate-100/60 border-b border-slate-200 grid grid-cols-4 gap-4 text-xs font-mono tabular-nums">
          <div>
            <span className="text-slate-500 text-[10px] uppercase block">Linked SKUs</span>
            <span className="font-bold text-slate-900 text-sm">{linkedParts.length} parts</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase block">Total On-Hand</span>
            <span className="font-bold text-slate-900 text-sm">{totalUnits} units</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase block">FOB Cost (USD)</span>
            <span className="font-bold text-slate-900 text-sm">${totalFobValue.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] uppercase block">Landed Value</span>
            <span className="font-bold text-slate-900 text-sm">{formatCurrency(totalLandedValue, currencySymbol)}</span>
          </div>
        </div>

        {/* Body Table */}
        <div className="p-6 overflow-y-auto flex-1">
          {linkedParts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No spare parts currently linked</p>
              <p className="mt-1">Click "Link New Part" to assign spare parts to {supplier.name}.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px]">
                  <th className="py-2 px-3">Part # & Details</th>
                  <th className="py-2 px-2 text-center">Category</th>
                  <th className="py-2 px-2 text-right">FOB (USD)</th>
                  <th className="py-2 px-2 text-right">Landed Cost</th>
                  <th className="py-2 px-2 text-right">Retail (Ex)</th>
                  <th className="py-2 px-2 text-center">Stock Level</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {linkedParts.map((part) => {
                  const status = getStockStatus(part.stockQuantity, part.minStockLevel);
                  return (
                    <tr key={part.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-slate-900">{part.partNumber}</div>
                        <div className="text-[11px] text-slate-600 line-clamp-1">{part.description}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Bin: {part.location || '—'}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-600">
                        {part.category}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600">
                        ${part.unitCostFobUsd.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatCurrency(part.unitCostLanded, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700">
                        {formatCurrency(part.retailPriceEx, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono tabular-nums">
                        <span className={`font-bold ${status === 'OUT_OF_STOCK' ? 'text-rose-700' : status === 'LOW_STOCK' ? 'text-amber-700' : 'text-slate-900'}`}>
                          {part.stockQuantity}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">/ min {part.minStockLevel}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onFastSell(part)}
                            disabled={part.stockQuantity <= 0}
                            className="px-2 py-0.5 text-xs text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded cursor-pointer"
                          >
                            Sell
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditPart(part)}
                            className="px-2 py-0.5 text-xs text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
