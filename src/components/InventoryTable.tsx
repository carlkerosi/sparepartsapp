import React, { useState, useMemo } from 'react';
import { SparePart, Supplier } from '../types/inventory';
import { formatCurrency, getStockStatus } from '../utils/calculations';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Plus, 
  Minus, 
  ShoppingCart, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  Download, 
  PackagePlus,
  AlertTriangle,
  MapPin,
  ExternalLink,
  Building2,
  Package
} from 'lucide-react';

interface InventoryTableProps {
  parts: SparePart[];
  suppliers?: Supplier[];
  currencySymbol: string;
  onFastSell: (part: SparePart) => void;
  onEditPart: (part: SparePart) => void;
  onDeletePart: (partId: string) => void;
  onAdjustStock: (part: SparePart, delta: number) => void;
  onOpenNewPart: () => void;
  onExportCsv: () => void;
  selectedStatusFilter: 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK';
  onStatusFilterChange: (status: 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK') => void;
}

type SortField = 'partNumber' | 'description' | 'stockQuantity' | 'unitCostFobUsd' | 'unitCostLanded' | 'retailPriceEx' | 'retailPriceInc' | 'margin';
type SortOrder = 'asc' | 'desc';

export const InventoryTable: React.FC<InventoryTableProps> = ({
  parts,
  suppliers = [],
  currencySymbol,
  onFastSell,
  onEditPart,
  onDeletePart,
  onAdjustStock,
  onOpenNewPart,
  onExportCsv,
  selectedStatusFilter,
  onStatusFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('partNumber');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [copiedPartNumber, setCopiedPartNumber] = useState<string | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    parts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [parts]);

  // Copy part number helper
  const handleCopyPartNumber = (pNum: string) => {
    navigator.clipboard.writeText(pNum);
    setCopiedPartNumber(pNum);
    setTimeout(() => setCopiedPartNumber(null), 1500);
  };

  // Sort toggle helper
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtered and sorted parts
  const filteredParts = useMemo(() => {
    return parts
      .filter((part) => {
        // Search filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchNumber = part.partNumber.toLowerCase().includes(q);
          const matchDesc = part.description.toLowerCase().includes(q);
          const matchOem = (part.oemReference || '').toLowerCase().includes(q);
          const matchVeh = (part.vehicleCompatibility || '').toLowerCase().includes(q);
          const matchLoc = (part.location || '').toLowerCase().includes(q);
          const matchSup = (part.supplier || '').toLowerCase().includes(q);
          if (!matchNumber && !matchDesc && !matchOem && !matchVeh && !matchLoc && !matchSup) {
            return false;
          }
        }

        // Category filter
        if (selectedCategory !== 'ALL' && part.category !== selectedCategory) {
          return false;
        }

        // Supplier filter
        if (selectedSupplierId !== 'ALL' && part.supplierId !== selectedSupplierId) {
          return false;
        }

        // Stock status filter
        const status = getStockStatus(part.stockQuantity, part.minStockLevel);
        if (selectedStatusFilter === 'LOW_STOCK' && status !== 'LOW_STOCK') return false;
        if (selectedStatusFilter === 'OUT_OF_STOCK' && status !== 'OUT_OF_STOCK') return false;
        if (selectedStatusFilter === 'IN_STOCK' && status !== 'IN_STOCK') return false;

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField as keyof SparePart];
        let valB: any = b[sortField as keyof SparePart];

        if (sortField === 'margin') {
          valA = a.retailPriceEx > 0 ? ((a.retailPriceEx - a.unitCostLanded) / a.retailPriceEx) * 100 : 0;
          valB = b.retailPriceEx > 0 ? ((b.retailPriceEx - b.unitCostLanded) / b.retailPriceEx) * 100 : 0;
        }

        if (typeof valA === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        return sortOrder === 'asc' ? (valA || 0) - (valB || 0) : (valB || 0) - (valA || 0);
      });
  }, [parts, searchTerm, selectedCategory, selectedStatusFilter, sortField, sortOrder]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
      {/* Top Filter and Search Bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Search input */}
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Part #, description, OEM, or vehicle..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 transition-colors"
          />
        </div>

        {/* Right: Category selector, Status filter segmented control, Export button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier Dropdown */}
          {suppliers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer max-w-[170px] truncate"
              >
                <option value="ALL">All Vendors ({suppliers.length})</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name.slice(0, 18)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Segmented Control (Zero-Pill interactive buttons) */}
          <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
            <button
              onClick={() => onStatusFilterChange('ALL')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                selectedStatusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              All ({parts.length})
            </button>
            <button
              onClick={() => onStatusFilterChange('IN_STOCK')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                selectedStatusFilter === 'IN_STOCK'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              In Stock
            </button>
            <button
              onClick={() => onStatusFilterChange('LOW_STOCK')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                selectedStatusFilter === 'LOW_STOCK'
                  ? 'bg-white text-amber-800 shadow-xs font-semibold'
                  : 'text-amber-700 hover:text-amber-900'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => onStatusFilterChange('OUT_OF_STOCK')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                selectedStatusFilter === 'OUT_OF_STOCK'
                  ? 'bg-white text-rose-800 shadow-xs font-semibold'
                  : 'text-rose-700 hover:text-rose-900'
              }`}
            >
              Out of Stock
            </button>
          </div>

          {/* Export to CSV */}
          <button
            onClick={onExportCsv}
            title="Export filtered inventory to CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 cursor-pointer hover:bg-slate-100/60" onClick={() => handleSort('partNumber')}>
                <div className="flex items-center gap-1">
                  <span>Part Number</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 cursor-pointer hover:bg-slate-100/60" onClick={() => handleSort('description')}>
                <div className="flex items-center gap-1">
                  <span>Description & Compatibility</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 text-center">Category / Bin</th>
              <th className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100/60" onClick={() => handleSort('unitCostFobUsd')}>
                <div className="flex items-center justify-end gap-1">
                  <span>FOB ($ USD)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100/60" onClick={() => handleSort('unitCostLanded')}>
                <div className="flex items-center justify-end gap-1">
                  <span>Landed ({currencySymbol})</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100/60" onClick={() => handleSort('retailPriceEx')}>
                <div className="flex items-center justify-end gap-1">
                  <span>Selling Ex ({currencySymbol})</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100/60" onClick={() => handleSort('retailPriceInc')}>
                <div className="flex items-center justify-end gap-1">
                  <span>Selling Inc ({currencySymbol})</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100/60" onClick={() => handleSort('margin')}>
                <div className="flex items-center justify-end gap-1">
                  <span>Margin %</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 text-center cursor-pointer hover:bg-slate-100/60" onClick={() => handleSort('stockQuantity')}>
                <div className="flex items-center justify-center gap-1">
                  <span>Stock Level</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredParts.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500">
                  <PackagePlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-700">No spare parts match your filter</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try adjusting your search query, status filters, or add a new part.
                  </p>
                  <button
                    onClick={onOpenNewPart}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Part</span>
                  </button>
                </td>
              </tr>
            ) : (
              filteredParts.map((part) => {
                const status = getStockStatus(part.stockQuantity, part.minStockLevel);
                const margin = part.retailPriceEx > 0 
                  ? ((part.retailPriceEx - part.unitCostLanded) / part.retailPriceEx) * 100 
                  : 0;

                return (
                  <tr 
                    key={part.id} 
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Part Number & OEM */}
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {part.imageUrl ? (
                            <img
                              src={part.imageUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <Package className="w-4 h-4 text-slate-400 stroke-1" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-900 text-xs">
                            <span>{part.partNumber}</span>
                            <button
                              onClick={() => handleCopyPartNumber(part.partNumber)}
                              title="Copy Part Number"
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-700 transition-opacity p-0.5 rounded cursor-pointer"
                            >
                              {copiedPartNumber === part.partNumber ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          {part.oemReference && (
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                              OEM: {part.oemReference}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Description & Vehicle */}
                    <td className="py-3 px-4 align-top max-w-xs">
                      <div className="text-xs font-medium text-slate-900 leading-snug">
                        {part.description}
                      </div>
                      {part.vehicleCompatibility && (
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1" title={part.vehicleCompatibility}>
                          Fitment: {part.vehicleCompatibility}
                        </div>
                      )}
                      {part.supplier && (
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
                          <Building2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span className="truncate">{part.supplier}</span>
                        </div>
                      )}
                    </td>

                    {/* Category & Location */}
                    <td className="py-3 px-3 align-top text-center whitespace-nowrap">
                      <span className="text-xs text-slate-700 block">
                        {part.category || 'General'}
                      </span>
                      {part.location && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-400 font-mono mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-slate-400" />
                          {part.location}
                        </span>
                      )}
                    </td>

                    {/* FOB Cost USD */}
                    <td className="py-3 px-3 align-top text-right font-mono tabular-nums text-slate-600">
                      ${part.unitCostFobUsd.toFixed(2)}
                    </td>

                    {/* Landed Cost */}
                    <td className="py-3 px-3 align-top text-right font-mono tabular-nums font-medium text-slate-900">
                      {formatCurrency(part.unitCostLanded, currencySymbol)}
                    </td>

                    {/* Retail Price Ex */}
                    <td className="py-3 px-3 align-top text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatCurrency(part.retailPriceEx, currencySymbol)}
                    </td>

                    {/* Retail Price Inc */}
                    <td className="py-3 px-3 align-top text-right font-mono tabular-nums text-slate-700">
                      {formatCurrency(part.retailPriceInc, currencySymbol)}
                    </td>

                    {/* Margin % */}
                    <td className="py-3 px-3 align-top text-right font-mono tabular-nums">
                      <span className={`text-xs font-medium ${margin >= 40 ? 'text-emerald-700' : margin >= 20 ? 'text-slate-700' : 'text-amber-700'}`}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>

                    {/* Real-Time Stock Level */}
                    <td className="py-3 px-4 align-top text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center">
                        <div className="flex items-center gap-1.5 font-mono tabular-nums font-bold text-sm">
                          <span
                            className={
                              status === 'OUT_OF_STOCK'
                                ? 'text-rose-700'
                                : status === 'LOW_STOCK'
                                ? 'text-amber-700'
                                : 'text-slate-900'
                            }
                          >
                            {part.stockQuantity}
                          </span>
                          <span className="text-slate-400 text-xs font-normal">/ min {part.minStockLevel}</span>
                        </div>
                        {/* Unboxed Status Text according to Zero-Pill rule */}
                        <div className="text-[10px] uppercase font-semibold tracking-wider mt-0.5">
                          {status === 'OUT_OF_STOCK' && (
                            <span className="text-rose-700">Out of Stock</span>
                          )}
                          {status === 'LOW_STOCK' && (
                            <span className="text-amber-700">Low Stock Reorder</span>
                          )}
                          {status === 'IN_STOCK' && (
                            <span className="text-emerald-700">In Stock</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Quick Actions */}
                    <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Inline Stock Increment / Decrement */}
                        <div className="flex items-center bg-slate-100 rounded-md border border-slate-200">
                          <button
                            onClick={() => onAdjustStock(part, -1)}
                            disabled={part.stockQuantity <= 0}
                            title="Decrement stock (-1)"
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-l transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] font-mono text-slate-500 px-1">adj</span>
                          <button
                            onClick={() => onAdjustStock(part, 1)}
                            title="Increment stock (+1)"
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-r transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Fast Sell Button */}
                        <button
                          onClick={() => onFastSell(part)}
                          disabled={part.stockQuantity <= 0}
                          title={part.stockQuantity <= 0 ? 'No stock available to sell' : 'Sell Part (Record Sale)'}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer shadow-2xs"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          <span>Sell</span>
                        </button>

                        {/* Edit Part */}
                        <button
                          onClick={() => onEditPart(part)}
                          title="Edit Part Specifications & Pricing"
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Part */}
                        <button
                          onClick={() => onDeletePart(part.id)}
                          title="Delete Part"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Summary Count */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <div>
          Showing <span className="font-mono font-semibold text-slate-700">{filteredParts.length}</span> of{' '}
          <span className="font-mono font-semibold text-slate-700">{parts.length}</span> total spare parts
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span>Real-time sync enabled</span>
          <span className="text-slate-300">·</span>
          <span>Tabular numerals active</span>
        </div>
      </div>
    </div>
  );
};
