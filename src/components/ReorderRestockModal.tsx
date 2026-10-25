import React, { useState, useMemo } from 'react';
import { SparePart, Supplier } from '../types/inventory';
import { formatCurrency, getStockStatus } from '../utils/calculations';
import { 
  AlertTriangle, 
  Truck, 
  CheckCircle, 
  Download, 
  Plus, 
  ArrowRight,
  PackageCheck,
  FileSpreadsheet,
  Building2
} from 'lucide-react';

interface ReorderRestockModalProps {
  parts: SparePart[];
  suppliers?: Supplier[];
  currencySymbol: string;
  onReceiveShipment: (
    partId: string,
    quantityReceived: number,
    referenceDoc: string,
    updatedFobUsd?: number,
    updatedLandedCost?: number,
    notes?: string
  ) => void;
}

export const ReorderRestockModal: React.FC<ReorderRestockModalProps> = ({
  parts,
  suppliers = [],
  currencySymbol,
  onReceiveShipment,
}) => {
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');

  // Low stock parts
  const lowStockParts = useMemo(() => {
    return parts
      .filter((p) => p.stockQuantity <= p.minStockLevel)
      .filter((p) => {
        if (vendorFilter !== 'ALL' && p.supplierId !== vendorFilter) return false;
        return true;
      });
  }, [parts, vendorFilter]);

  // Restock form state
  const [selectedPartId, setSelectedPartId] = useState<string>(
    lowStockParts.length > 0 ? lowStockParts[0].id : parts[0]?.id || ''
  );
  const [qtyReceived, setQtyReceived] = useState<number>(20);
  const [poReference, setPoReference] = useState<string>('PO-2026-');
  const [updateCosts, setUpdateCosts] = useState<boolean>(false);
  const [newFobUsd, setNewFobUsd] = useState<number>(0);
  const [newLandedCost, setNewLandedCost] = useState<number>(0);
  const [notes, setNotes] = useState<string>('Inward sea freight replenishment');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Sync cost fields when part changes
  const activePart = useMemo(() => {
    return parts.find((p) => p.id === selectedPartId);
  }, [parts, selectedPartId]);

  const handleSelectPart = (part: SparePart) => {
    setSelectedPartId(part.id);
    setNewFobUsd(part.unitCostFobUsd);
    setNewLandedCost(part.unitCostLanded);
    // suggest deficit quantity + 15 buffer
    const deficit = Math.max(1, (part.minStockLevel * 2) - part.stockQuantity);
    setQtyReceived(deficit);
  };

  const handleReceiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePart) return;
    if (qtyReceived <= 0) return;

    onReceiveShipment(
      activePart.id,
      qtyReceived,
      poReference.trim() || 'PO-RESTOCK',
      updateCosts ? newFobUsd : undefined,
      updateCosts ? newLandedCost : undefined,
      notes
    );

    setSuccessNotice(`Successfully received ${qtyReceived} units of ${activePart.partNumber}. Stock updated!`);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Reorder estimation totals
  const totalReorderUnitsNeeded = lowStockParts.reduce((acc, p) => {
    return acc + Math.max(0, (p.minStockLevel * 2) - p.stockQuantity);
  }, 0);

  const totalEstimatedFobCost = lowStockParts.reduce((acc, p) => {
    const qty = Math.max(0, (p.minStockLevel * 2) - p.stockQuantity);
    return acc + (qty * p.unitCostFobUsd);
  }, 0);

  const totalEstimatedLandedCost = lowStockParts.reduce((acc, p) => {
    const qty = Math.max(0, (p.minStockLevel * 2) - p.stockQuantity);
    return acc + (qty * p.unitCostLanded);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>Real-Time Reorder Alerts & Replenishment</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {lowStockParts.length} spare parts have hit or fallen below minimum safety stock levels
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase">Recommended Buffer</span>
              <span className="font-bold text-slate-900 text-sm">{totalReorderUnitsNeeded} units</span>
            </div>
            <div className="text-right border-l border-slate-200 pl-4">
              <span className="text-slate-400 block text-[10px] uppercase">Est. FOB Cost (USD)</span>
              <span className="font-bold text-slate-900 text-sm">${totalEstimatedFobCost.toFixed(2)}</span>
            </div>
            <div className="text-right border-l border-slate-200 pl-4">
              <span className="text-slate-400 block text-[10px] uppercase">Est. Landed Cost ({currencySymbol})</span>
              <span className="font-bold text-slate-900 text-sm">
                {formatCurrency(totalEstimatedLandedCost, currencySymbol)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {successNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Grid: Left = Low Stock Table / Right = Receive Shipment Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Low Stock Items Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Low Stock Parts Requiring Reorder ({lowStockParts.length})
            </h3>
            
            {suppliers.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-200 text-slate-700 py-1 px-2 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="ALL">Filter By Vendor (All)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name.slice(0, 22)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                  <th className="py-2.5 px-3">Part # & Details</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                  <th className="py-2.5 px-2 text-center">Current</th>
                  <th className="py-2.5 px-2 text-center">Min Safety</th>
                  <th className="py-2.5 px-2 text-center">Deficit</th>
                  <th className="py-2.5 px-3 text-right">FOB (USD)</th>
                  <th className="py-2.5 px-3 text-right">Landed ({currencySymbol})</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockParts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <PackageCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-800">All stock levels healthy!</p>
                      <p className="text-xs text-slate-400 mt-1">
                        No spare parts are currently below their minimum safety threshold.
                      </p>
                    </td>
                  </tr>
                ) : (
                  lowStockParts.map((p) => {
                    const status = getStockStatus(p.stockQuantity, p.minStockLevel);
                    const deficit = Math.max(0, p.minStockLevel - p.stockQuantity);
                    const isSelected = p.id === selectedPartId;

                    return (
                      <tr 
                        key={p.id} 
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-slate-100/80 font-medium' : ''
                        }`}
                        onClick={() => handleSelectPart(p)}
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-slate-900">{p.partNumber}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">{p.description}</div>
                          <div className="text-[10px] text-slate-400">Loc: {p.location || '—'} · {p.supplier || 'OEM'}</div>
                        </td>

                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          {status === 'OUT_OF_STOCK' ? (
                            <span className="text-rose-700 font-bold uppercase text-[10px]">Out of Stock</span>
                          ) : (
                            <span className="text-amber-700 font-semibold uppercase text-[10px]">Low Stock</span>
                          )}
                        </td>

                        <td className="py-2.5 px-2 text-center font-mono tabular-nums font-bold text-rose-700">
                          {p.stockQuantity}
                        </td>

                        <td className="py-2.5 px-2 text-center font-mono tabular-nums text-slate-600">
                          {p.minStockLevel}
                        </td>

                        <td className="py-2.5 px-2 text-center font-mono tabular-nums font-bold text-amber-800">
                          +{deficit}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                          ${p.unitCostFobUsd.toFixed(2)}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">
                          {formatCurrency(p.unitCostLanded, currencySymbol)}
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPart(p);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded hover:bg-slate-100 cursor-pointer shadow-2xs"
                          >
                            <span>Restock</span>
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Inward Shipment Receipt Tool */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
            <Truck className="w-5 h-5 text-slate-800" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Receive Inward Shipment</h3>
              <p className="text-[11px] text-slate-500">Record incoming stock and update landed costs</p>
            </div>
          </div>

          <form onSubmit={handleReceiveSubmit} className="space-y-4">
            {/* Part selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Part to Receive
              </label>
              <select
                value={selectedPartId}
                onChange={(e) => {
                  const part = parts.find((p) => p.id === e.target.value);
                  if (part) handleSelectPart(part);
                }}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
              >
                {parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.partNumber} — {p.description.slice(0, 32)} (Current: {p.stockQuantity})
                  </option>
                ))}
              </select>
            </div>

            {activePart && (
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-xs">
                <div className="text-slate-500">Current Stock on Hand:</div>
                <div className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                  {activePart.stockQuantity} units{' '}
                  <span className="text-xs font-normal text-slate-500">
                    (Safety minimum: {activePart.minStockLevel})
                  </span>
                </div>
              </div>
            )}

            {/* Quantity received */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity Received (Units) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={qtyReceived}
                onChange={(e) => setQtyReceived(parseInt(e.target.value) || 1)}
                className="w-full text-sm font-mono tabular-nums font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              {activePart && (
                <div className="text-[11px] text-slate-500 mt-1 font-mono">
                  New stock will be: <strong className="text-slate-900">{activePart.stockQuantity + qtyReceived} units</strong>
                </div>
              )}
            </div>

            {/* PO / Waybill reference */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PO / Supplier Waybill Number *
              </label>
              <input
                type="text"
                required
                value={poReference}
                onChange={(e) => setPoReference(e.target.value)}
                placeholder="e.g. PO-2026-092 / BOL-DENSO-481"
                className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* Update costs toggle */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={updateCosts}
                  onChange={(e) => setUpdateCosts(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-0"
                />
                <span>Shipment unit costs changed? Update FOB & Landed</span>
              </label>

              {updateCosts && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-dashed border-slate-200">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">New FOB (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newFobUsd}
                      onChange={(e) => setNewFobUsd(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">New Landed Cost ({currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newLandedCost}
                      onChange={(e) => setNewLandedCost(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Receipt Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Cleared customs via port agent"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={!activePart}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-2"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Confirm Receipt & Update Stock</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
