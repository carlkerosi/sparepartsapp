import React, { useState, useMemo } from 'react';
import { Supplier, SparePart } from '../types/inventory';
import { formatCurrency, formatNumber, getStockStatus } from '../utils/calculations';
import { 
  Building2, 
  Search, 
  Plus, 
  Filter, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Calendar, 
  Clock, 
  Star, 
  Package, 
  Layers, 
  Edit3, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Download
} from 'lucide-react';

interface SuppliersManagementProps {
  suppliers: Supplier[];
  parts: SparePart[];
  currencySymbol: string;
  onOpenNewSupplier: () => void;
  onEditSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (supplierId: string) => void;
  onViewSupplierParts: (supplier: Supplier) => void;
  onAddPartForSupplier: (supplier: Supplier) => void;
}

export const SuppliersManagement: React.FC<SuppliersManagementProps> = ({
  suppliers,
  parts,
  currencySymbol,
  onOpenNewSupplier,
  onEditSupplier,
  onDeleteSupplier,
  onViewSupplierParts,
  onAddPartForSupplier,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'UNDER_REVIEW' | 'INACTIVE'>('ALL');

  // Compute linked parts statistics per supplier
  const supplierStatsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        partsCount: number;
        totalUnits: number;
        totalLandedValue: number;
        totalFobValue: number;
        lowStockCount: number;
        partsList: SparePart[];
      }
    >();

    for (const sup of suppliers) {
      map.set(sup.id, {
        partsCount: 0,
        totalUnits: 0,
        totalLandedValue: 0,
        totalFobValue: 0,
        lowStockCount: 0,
        partsList: [],
      });
    }

    for (const p of parts) {
      if (p.supplierId && map.has(p.supplierId)) {
        const stats = map.get(p.supplierId)!;
        const qty = Math.max(0, p.stockQuantity);
        stats.partsCount += 1;
        stats.totalUnits += qty;
        stats.totalLandedValue += p.unitCostLanded * qty;
        stats.totalFobValue += p.unitCostFobUsd * qty;
        if (p.stockQuantity <= p.minStockLevel) {
          stats.lowStockCount += 1;
        }
        stats.partsList.push(p);
      }
    }

    return map;
  }, [suppliers, parts]);

  // Unique countries
  const countries = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => {
      if (s.country) set.add(s.country);
    });
    return Array.from(set).sort();
  }, [suppliers]);

  // Overall KPI
  const activeSuppliersCount = suppliers.filter((s) => s.status === 'ACTIVE').length;
  const avgLeadTime = suppliers.length > 0 
    ? Math.round(suppliers.reduce((acc, s) => acc + (s.leadTimeDays || 0), 0) / suppliers.length) 
    : 0;

  const totalCapitalManaged = useMemo(() => {
    return parts.reduce((acc, p) => acc + p.unitCostLanded * Math.max(0, p.stockQuantity), 0);
  }, [parts]);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((sup) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = sup.name.toLowerCase().includes(q);
        const matchCode = sup.code.toLowerCase().includes(q);
        const matchContact = (sup.contactPerson || '').toLowerCase().includes(q);
        const matchCountry = (sup.country || '').toLowerCase().includes(q);
        const matchTerms = (sup.paymentTerms || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchContact && !matchCountry && !matchTerms) {
          return false;
        }
      }

      if (countryFilter !== 'ALL' && sup.country !== countryFilter) return false;
      if (statusFilter !== 'ALL' && sup.status !== statusFilter) return false;

      return true;
    });
  }, [suppliers, searchTerm, countryFilter, statusFilter]);

  const handleExportSuppliersCsv = () => {
    const headers = [
      'Vendor Code',
      'Company Name',
      'Contact Person',
      'Email',
      'Phone',
      'Country',
      'Payment Terms',
      'Currency',
      'Shipping Terms (Incoterms)',
      'Lead Time Days',
      'Rating',
      'Status',
      'Linked Parts Count',
      'Notes',
    ];

    const rows = filteredSuppliers.map((s) => {
      const stats = supplierStatsMap.get(s.id);
      return [
        `"${s.code}"`,
        `"${s.name.replace(/"/g, '""')}"`,
        `"${(s.contactPerson || '').replace(/"/g, '""')}"`,
        `"${s.email || ''}"`,
        `"${s.phone || ''}"`,
        `"${s.country || ''}"`,
        `"${s.paymentTerms || ''}"`,
        s.currency || 'USD',
        `"${s.shippingTerms || ''}"`,
        s.leadTimeDays,
        s.rating,
        s.status,
        stats?.partsCount || 0,
        `"${(s.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `suppliers_directory_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <span className="text-xs text-slate-500 block">Total Vendors</span>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {suppliers.length}{' '}
            <span className="text-xs font-normal text-emerald-700">
              ({activeSuppliersCount} active)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Commercial trade partners</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <span className="text-xs text-slate-500 block">Average Freight Lead Time</span>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1 flex items-center gap-1">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>{avgLeadTime} days</span>
          </div>
          <span className="text-[11px] text-slate-400">Factory to warehouse</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <span className="text-xs text-slate-500 block">Linked Inventory SKUs</span>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {parts.filter((p) => p.supplierId).length}{' '}
            <span className="text-xs font-normal text-slate-500">
              of {parts.length} total
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Assigned primary suppliers</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5">
          <span className="text-xs text-slate-500 block">Landed Capital Managed</span>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {formatCurrency(totalCapitalManaged, currencySymbol)}
          </div>
          <span className="text-[11px] text-slate-400">Procured under vendor contracts</span>
        </div>
      </div>

      {/* Main Suppliers Table Container */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vendor name, code, contact, country, or terms..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Country filter */}
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
              >
                <option value="ALL">All Countries ({countries.length})</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Segmented Control */}
            <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  statusFilter === 'ACTIVE' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('UNDER_REVIEW')}
                className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                  statusFilter === 'UNDER_REVIEW' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
                }`}
              >
                Review
              </button>
            </div>

            {/* Export CSV */}
            <button
              onClick={handleExportSuppliersCsv}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Add Supplier Button */}
            <button
              onClick={onOpenNewSupplier}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Supplier</span>
            </button>
          </div>
        </div>

        {/* Suppliers Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
                <th className="py-3 px-4">Vendor & Code</th>
                <th className="py-3 px-4">Key Contact & Location</th>
                <th className="py-3 px-3">Commercial Terms</th>
                <th className="py-3 px-3">Freight & Lead Time</th>
                <th className="py-3 px-3 text-center">Rating</th>
                <th className="py-3 px-4 text-center">Linked Inventory Parts</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-800">No suppliers match your filter</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Register your primary vendors to organize replacement parts procurement.
                    </p>
                    <button
                      onClick={onOpenNewSupplier}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Register Supplier</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((sup) => {
                  const stats = supplierStatsMap.get(sup.id) || {
                    partsCount: 0,
                    totalUnits: 0,
                    totalLandedValue: 0,
                    totalFobValue: 0,
                    lowStockCount: 0,
                    partsList: [],
                  };

                  return (
                    <tr key={sup.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Vendor Identity */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-mono font-bold text-xs text-slate-900">
                          {sup.code}
                        </div>
                        <div className="font-semibold text-slate-900 text-xs mt-0.5">
                          {sup.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Status: <span className={sup.status === 'ACTIVE' ? 'text-emerald-700 font-semibold' : 'text-amber-700'}>{sup.status}</span>
                        </div>
                      </td>

                      {/* Contact & Country */}
                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="font-medium text-slate-800 text-xs">
                          {sup.contactPerson || 'General Sales Dept.'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{sup.country}</span>
                          {sup.physicalAddress && <span className="text-slate-400 truncate">· {sup.physicalAddress}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-600 mt-1 font-mono">
                          {sup.email && (
                            <a
                              href={`mailto:${sup.email}`}
                              title={sup.email}
                              className="hover:text-slate-900 flex items-center gap-0.5 hover:underline"
                            >
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="truncate max-w-[120px]">{sup.email}</span>
                            </a>
                          )}
                          {sup.phone && (
                            <a
                              href={`tel:${sup.phone}`}
                              className="hover:text-slate-900 flex items-center gap-0.5 hover:underline"
                            >
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{sup.phone}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Commercial Payment Terms */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <div className="font-semibold text-slate-800 text-xs">
                          {sup.paymentTerms}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Procurement: <strong className="text-slate-700">{sup.currency || 'USD'}</strong>
                        </div>
                      </td>

                      {/* Freight & Lead Time */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <div className="text-xs text-slate-800 font-medium">
                          {sup.shippingTerms || 'FOB Origin'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{sup.leadTimeDays} days lead time</span>
                        </div>
                      </td>

                      {/* Star Rating */}
                      <td className="py-3 px-3 align-top text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-0.5">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-mono font-bold text-xs text-slate-800">{sup.rating}</span>
                          <span className="text-slate-400 text-[10px]">/5</span>
                        </div>
                      </td>

                      {/* Linked Spare Parts */}
                      <td className="py-3 px-4 align-top text-center">
                        <div className="inline-flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => onViewSupplierParts(sup)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                          >
                            <Package className="w-3.5 h-3.5 text-slate-600" />
                            <span>{stats.partsCount} parts</span>
                            <ChevronRight className="w-3 h-3 text-slate-400" />
                          </button>
                          <div className="text-[10px] text-slate-500 font-mono tabular-nums mt-1">
                            {formatNumber(stats.totalUnits)} units in stock
                            {stats.lowStockCount > 0 && (
                              <span className="text-amber-700 font-semibold ml-1">
                                · {stats.lowStockCount} low
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onAddPartForSupplier(sup)}
                            title="Add new spare part assigned to this supplier"
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Part</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditSupplier(sup)}
                            title="Edit Supplier Details & Terms"
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteSupplier(sup.id)}
                            title="Delete Supplier"
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

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <div>
            Showing <span className="font-mono font-semibold text-slate-700">{filteredSuppliers.length}</span> of{' '}
            <span className="font-mono font-semibold text-slate-700">{suppliers.length}</span> registered suppliers
          </div>
          <div>Real-time Firebase Firestore synchronized</div>
        </div>
      </div>
    </div>
  );
};
