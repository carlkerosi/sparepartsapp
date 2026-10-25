import React, { useState, useEffect } from 'react';
import { Supplier } from '../types/inventory';
import { X, Building2, Check, AlertCircle, Star, Globe, Mail, Phone, MapPin } from 'lucide-react';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierToEdit?: Supplier | null;
  onSaveSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>, existingId?: string) => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  supplierToEdit,
  onSaveSupplier,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [country, setCountry] = useState('Japan');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [currency, setCurrency] = useState('USD');
  const [leadTimeDays, setLeadTimeDays] = useState<number>(21);
  const [shippingTerms, setShippingTerms] = useState('FOB Yokohama');
  const [rating, setRating] = useState<number>(5);
  const [status, setStatus] = useState<Supplier['status']>('ACTIVE');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (supplierToEdit) {
      setName(supplierToEdit.name);
      setCode(supplierToEdit.code);
      setContactPerson(supplierToEdit.contactPerson || '');
      setEmail(supplierToEdit.email || '');
      setPhone(supplierToEdit.phone || '');
      setWebsite(supplierToEdit.website || '');
      setPhysicalAddress(supplierToEdit.physicalAddress || '');
      setCountry(supplierToEdit.country || 'Japan');
      setPaymentTerms(supplierToEdit.paymentTerms || 'Net 30 Days');
      setCurrency(supplierToEdit.currency || 'USD');
      setLeadTimeDays(supplierToEdit.leadTimeDays || 21);
      setShippingTerms(supplierToEdit.shippingTerms || 'FOB Yokohama');
      setRating(supplierToEdit.rating || 5);
      setStatus(supplierToEdit.status || 'ACTIVE');
      setNotes(supplierToEdit.notes || '');
    } else {
      setName('');
      setCode('SUP-');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setWebsite('');
      setPhysicalAddress('');
      setCountry('Japan');
      setPaymentTerms('Net 30 Days');
      setCurrency('USD');
      setLeadTimeDays(21);
      setShippingTerms('FOB Yokohama');
      setRating(5);
      setStatus('ACTIVE');
      setNotes('');
    }
    setErrorMsg(null);
  }, [supplierToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Supplier name is required.');
      return;
    }
    if (!code.trim()) {
      setErrorMsg('Supplier code is required.');
      return;
    }

    onSaveSupplier(
      {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        contactPerson: contactPerson.trim(),
        email: email.trim(),
        phone: phone.trim(),
        website: website.trim() || undefined,
        physicalAddress: physicalAddress.trim() || undefined,
        country: country.trim(),
        paymentTerms: paymentTerms.trim(),
        currency: currency.trim(),
        leadTimeDays: Number(leadTimeDays) || 0,
        shippingTerms: shippingTerms.trim(),
        rating: Number(rating),
        status,
        notes: notes.trim() || undefined,
      },
      supplierToEdit ? supplierToEdit.id : undefined
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {supplierToEdit ? 'Edit Supplier Profile & Terms' : 'Register New Vendor / Primary Supplier'}
              </h2>
              <p className="text-xs text-slate-500">
                Track procurement terms, commercial payment contracts, and linking parts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Company Identity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Company / Vendor Trade Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Denso Corporation Japan, Akebono Brake Industry"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Vendor Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. SUP-DENSO"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono font-bold uppercase"
              />
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div className="pt-2 border-t border-slate-200">
            <span className="block font-bold uppercase tracking-wider text-slate-600 mb-2">
              Key Contact Person & Communication
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Primary Contact Name & Title
                </label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Kenji Tanaka (Export Director)"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="orders@supplier.com"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+81 3 3668 5171"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.supplier.com"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Country of Origin / Factory
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Japan, Germany, USA, Italy, China"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="mt-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Physical Plant / Warehouse Address
              </label>
              <input
                type="text"
                value={physicalAddress}
                onChange={(e) => setPhysicalAddress(e.target.value)}
                placeholder="Factory address for freight pickup & bills of lading"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Section 3: Commercial Terms & Freight */}
          <div className="pt-2 border-t border-slate-200">
            <span className="block font-bold uppercase tracking-wider text-slate-600 mb-2">
              Commercial Terms & Shipping Protocol
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Terms *
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="Net 30 Days">Net 30 Days</option>
                  <option value="Net 45 Days">Net 45 Days</option>
                  <option value="Net 60 Days">Net 60 Days</option>
                  <option value="Net 15 Days">Net 15 Days</option>
                  <option value="Letter of Credit (LC)">Letter of Credit (LC)</option>
                  <option value="Cash in Advance / Wire (FOB)">Cash in Advance / Wire</option>
                  <option value="COD (Cash on Delivery)">COD (Cash on Delivery)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer font-mono"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CNY">CNY (¥)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Shipping Terms (Incoterms)
                </label>
                <input
                  type="text"
                  value={shippingTerms}
                  onChange={(e) => setShippingTerms(e.target.value)}
                  placeholder="e.g. FOB Yokohama, CIF, EXW"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Lead Time (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(parseInt(e.target.value) || 1)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono tabular-nums font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Vendor Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer font-semibold"
                >
                  <option value="ACTIVE">Active (Approved Supplier)</option>
                  <option value="UNDER_REVIEW">Under Review / Probationary</option>
                  <option value="INACTIVE">Inactive / Archived</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reliability Rating (1 to 5 Stars)
                </label>
                <div className="flex items-center gap-1.5 h-9">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          star <= rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-slate-500 text-xs ml-2 font-mono">
                    {rating} / 5 stars
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Contractual Notes & Fulfillment History
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Direct factory distributor. 0.5% return rate. Consolidation in Yokohama port every second Tuesday."
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>{supplierToEdit ? 'Save Supplier Changes' : 'Create Supplier'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
