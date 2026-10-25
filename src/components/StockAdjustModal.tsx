import React, { useState, useEffect } from 'react';
import { SparePart, MovementType } from '../types/inventory';
import { X, ArrowUpDown, Check, AlertCircle } from 'lucide-react';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  part: SparePart | null;
  initialDelta?: number;
  onConfirmAdjust: (part: SparePart, delta: number, type: MovementType, reason: string, notes: string) => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  part,
  initialDelta = 1,
  onConfirmAdjust,
}) => {
  const [delta, setDelta] = useState<number>(initialDelta);
  const [type, setType] = useState<MovementType>('ADJUSTMENT');
  const [reason, setReason] = useState('Physical Stock Count Adjustment');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setDelta(initialDelta);
    if (initialDelta < 0) {
      setReason('Physical Stock Count Discrepancy');
    } else {
      setReason('Physical Stock Count Adjustment');
    }
    setErrorMsg(null);
  }, [part, initialDelta, isOpen]);

  if (!isOpen || !part) return null;

  const newStock = part.stockQuantity + delta;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (delta === 0) {
      setErrorMsg('Quantity adjustment cannot be zero.');
      return;
    }
    if (newStock < 0) {
      setErrorMsg(`Adjustment would result in negative stock (${newStock}). Current stock is ${part.stockQuantity}.`);
      return;
    }

    onConfirmAdjust(part, delta, type, reason, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-150">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">Adjust Stock Quantity</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Part identification */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <div className="font-mono font-semibold text-slate-900">{part.partNumber}</div>
            <div className="text-slate-600 mt-0.5">{part.description}</div>
            <div className="flex items-center justify-between text-slate-500 mt-2 pt-2 border-t border-slate-200 font-mono tabular-nums">
              <span>Current Stock: <strong className="text-slate-900">{part.stockQuantity}</strong></span>
              <span>Location: {part.location || '—'}</span>
            </div>
          </div>

          {/* Quantity adjustment delta */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quantity Adjustment (Delta)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                required
                value={delta}
                onChange={(e) => setDelta(parseInt(e.target.value) || 0)}
                className="w-full text-base font-mono tabular-nums font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums flex items-center justify-between">
              <span>Use negative numbers (-1) to reduce, positive to increase.</span>
              <span className="font-bold text-slate-800">
                New Stock: <span className={newStock < 0 ? 'text-rose-600' : 'text-slate-900'}>{newStock}</span>
              </span>
            </div>
          </div>

          {/* Adjustment Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Category
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="Physical Stock Count Adjustment">Physical Cycle Count / Audit</option>
              <option value="Damaged in Warehouse">Damaged / Scrap / Broken in Storage</option>
              <option value="Customer Return / Warranty">Customer Return / Restocked</option>
              <option value="Vendor Sample / Internal Testing">Internal Workshop Use / Testing</option>
              <option value="Initial Stocktake Import">Initial Stocktake Correction</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reference Document / Audit Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Audit Sheet #12, Bin recount by Carl"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer shadow-xs"
            >
              Confirm Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
