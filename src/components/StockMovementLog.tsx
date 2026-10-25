import React, { useState, useMemo } from 'react';
import { StockMovement } from '../types/inventory';
import { 
  ArrowUpDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter, 
  Clock, 
  FileText,
  RotateCcw
} from 'lucide-react';

interface StockMovementLogProps {
  movements: StockMovement[];
  onOpenNewSale: () => void;
  onOpenRestock: () => void;
}

export const StockMovementLog: React.FC<StockMovementLogProps> = ({
  movements,
  onOpenNewSale,
  onOpenRestock,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchPart = m.partNumber.toLowerCase().includes(q);
        const matchDesc = m.description.toLowerCase().includes(q);
        const matchRef = m.referenceDoc.toLowerCase().includes(q);
        const matchNotes = (m.notes || '').toLowerCase().includes(q);
        if (!matchPart && !matchDesc && !matchRef && !matchNotes) return false;
      }

      if (typeFilter !== 'ALL' && m.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [movements, searchTerm, typeFilter]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search movements by part #, reference doc, reason..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Segmented Filter */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter('SALE')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                typeFilter === 'SALE' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              Sales (Out)
            </button>
            <button
              onClick={() => setTypeFilter('PURCHASE_RECEIPT')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                typeFilter === 'PURCHASE_RECEIPT' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              Restock (In)
            </button>
            <button
              onClick={() => setTypeFilter('ADJUSTMENT')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                typeFilter === 'ADJUSTMENT' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              Adjustments
            </button>
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Part Number & Description</th>
              <th className="py-3 px-3 text-center">Movement Type</th>
              <th className="py-3 px-3 text-center">Previous</th>
              <th className="py-3 px-3 text-center">Quantity Delta</th>
              <th className="py-3 px-3 text-center">New Stock</th>
              <th className="py-3 px-4">Reference Document</th>
              <th className="py-3 px-4">Reason / Notes</th>
              <th className="py-3 px-4 text-right">User</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <ArrowUpDown className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">No stock movements recorded</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Every sale, restock, or count adjustment automatically appears here.
                  </p>
                </td>
              </tr>
            ) : (
              filteredMovements.map((m) => {
                const isOut = m.quantityDelta < 0;
                return (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 align-top whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(m.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      <span className="text-slate-400">
                        {new Date(m.timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>

                    {/* Part Number & Desc */}
                    <td className="py-3 px-4 align-top max-w-xs">
                      <div className="font-mono font-semibold text-slate-900">
                        {m.partNumber}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">
                        {m.description}
                      </div>
                    </td>

                    {/* Movement Type */}
                    <td className="py-3 px-3 align-top text-center whitespace-nowrap">
                      {m.type === 'SALE' && (
                        <span className="text-rose-700 font-medium">Sale (Outward)</span>
                      )}
                      {m.type === 'PURCHASE_RECEIPT' && (
                        <span className="text-emerald-700 font-medium">Inward Shipment</span>
                      )}
                      {m.type === 'ADJUSTMENT' && (
                        <span className="text-amber-700 font-medium">Manual Count</span>
                      )}
                      {m.type === 'RETURN' && (
                        <span className="text-blue-700 font-medium">Customer Return</span>
                      )}
                    </td>

                    {/* Previous */}
                    <td className="py-3 px-3 align-top text-center font-mono tabular-nums text-slate-500">
                      {m.previousStock}
                    </td>

                    {/* Delta */}
                    <td className="py-3 px-3 align-top text-center font-mono tabular-nums font-bold">
                      <span
                        className={`inline-flex items-center gap-0.5 ${
                          isOut ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {isOut ? (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                        <span>{m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}</span>
                      </span>
                    </td>

                    {/* New Stock */}
                    <td className="py-3 px-3 align-top text-center font-mono tabular-nums font-bold text-slate-900">
                      {m.newStock}
                    </td>

                    {/* Reference Document */}
                    <td className="py-3 px-4 align-top font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      {m.referenceDoc}
                    </td>

                    {/* Notes / Reason */}
                    <td className="py-3 px-4 align-top text-slate-600 text-[11px]">
                      {m.notes || '—'}
                    </td>

                    {/* User */}
                    <td className="py-3 px-4 align-top text-right text-slate-500 text-[11px] whitespace-nowrap">
                      {m.user || 'System'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <div>
          Showing <span className="font-mono font-semibold text-slate-700">{filteredMovements.length}</span> audit events
        </div>
        <div>Immutable stock transaction ledger</div>
      </div>
    </div>
  );
};
