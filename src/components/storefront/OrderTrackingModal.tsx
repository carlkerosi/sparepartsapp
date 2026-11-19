import React, { useState, useMemo, useEffect } from 'react';
import { CustomerProfile, OrderStatus, SaleRecord } from '../../types/inventory';
import { formatCurrency } from '../../utils/calculations';
import {
  X,
  Package,
  CheckCircle2,
  Truck,
  Clock,
  Receipt,
  Search,
  LogOut,
  LogIn,
  UserPlus,
  MapPin,
  Car,
  ShieldCheck,
  Pencil,
  Check,
  Phone,
  User,
} from 'lucide-react';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerProfile | null;
  sales: SaleRecord[];
  currencySymbol: string;
  onOpenAuthModal: (mode: 'signin' | 'signup') => void;
  onSignOut: () => void;
  onViewReceipt: (sale: SaleRecord) => void;
  onUpdateCustomerProfile?: (updated: CustomerProfile) => Promise<void>;
}

const STEPS: { key: OrderStatus; label: string; sub: string }[] = [
  { key: 'CONFIRMED', label: 'Confirmed', sub: 'Payment verified' },
  { key: 'PACKING', label: 'Packing', sub: 'Parts picked' },
  { key: 'DISPATCHED', label: 'Dispatched', sub: 'Courier en route' },
  { key: 'DELIVERED', label: 'Delivered', sub: 'Received' },
];

function getStepIndex(status?: OrderStatus): number {
  const idx = STEPS.findIndex((s) => s.key === (status || 'CONFIRMED'));
  return idx >= 0 ? idx : 0;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  customer,
  sales,
  currencySymbol,
  onOpenAuthModal,
  onSignOut,
  onViewReceipt,
  onUpdateCustomerProfile,
}) => {
  const [guestInvoice, setGuestInvoice] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [matchedGuestSale, setMatchedGuestSale] = useState<SaleRecord | null>(null);

  // Editable saved Firebase client account details
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editVehicle, setEditVehicle] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveMsg, setProfileSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setEditName(customer.displayName || '');
      setEditPhone(customer.phone || '');
      setEditAddress(customer.defaultDeliveryAddress || '');
      setEditVehicle(customer.defaultVehicleRef || '');
    }
  }, [customer, isOpen]);

  const customerOrders = useMemo(() => {
    if (!customer) return [];
    const uid = customer.uid;
    const emailLower = (customer.email || '').toLowerCase();
    return sales
      .filter((s) => {
        if (s.customerId && s.customerId === uid) return true;
        if (emailLower && s.customerEmail && s.customerEmail.toLowerCase() === emailLower) return true;
        return false;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [customer, sales]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !onUpdateCustomerProfile) return;
    setIsSavingProfile(true);
    setProfileSaveMsg(null);
    try {
      await onUpdateCustomerProfile({
        ...customer,
        displayName: editName.trim() || customer.displayName,
        phone: editPhone.trim() || undefined,
        defaultDeliveryAddress: editAddress.trim() || undefined,
        defaultVehicleRef: editVehicle.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
      setIsEditingProfile(false);
      setProfileSaveMsg('Account details saved to Firebase.');
      setTimeout(() => setProfileSaveMsg(null), 2500);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleGuestLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    const invQuery = guestInvoice.trim().toUpperCase();
    const phoneDigits = guestPhone.replace(/\D/g, '').slice(-9);

    if (!invQuery || phoneDigits.length < 4) {
      setLookupError('Enter your Invoice # (e.g. INV-2026-1001) and at least the last 4 digits of your phone number.');
      setMatchedGuestSale(null);
      return;
    }

    const found = sales.find((s) => {
      const matchesInv = s.invoiceNumber.toUpperCase() === invQuery;
      const saleDigits = (s.customerPhone || '').replace(/\D/g, '');
      const matchesPhone = saleDigits.endsWith(phoneDigits) || saleDigits.includes(phoneDigits);
      return matchesInv && matchesPhone;
    });

    if (!found) {
      setLookupError('No matching order found for that Invoice # and phone number.');
      setMatchedGuestSale(null);
      return;
    }

    setMatchedGuestSale(found);
  };

  const renderOrderCard = (sale: SaleRecord) => {
    const activeIdx = getStepIndex(sale.orderStatus);
    const status = sale.orderStatus || 'CONFIRMED';

    return (
      <div key={sale.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {/* Card Header */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs text-slate-900">{sale.invoiceNumber}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {STEPS[activeIdx].label}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {new Date(sale.timestamp).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {sale.mpesaReceiptNumber && (
                <> · M-Pesa: <strong className="font-mono text-slate-700">{sale.mpesaReceiptNumber}</strong></>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Total Paid</span>
              <span className="font-mono font-bold text-xs text-slate-900">
                {formatCurrency(sale.totalInc, currencySymbol)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onViewReceipt(sale)}
              className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Receipt</span>
            </button>
          </div>
        </div>

        {/* 4-Stage Fulfillment Progress Stepper */}
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="grid grid-cols-4 gap-2">
            {STEPS.map((step, idx) => {
              const isDone = idx <= activeIdx;
              const isCurrent = idx === activeIdx;
              return (
                <div key={step.key} className="relative flex flex-col items-center text-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                      isDone
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-slate-100 border-slate-200 text-slate-400'
                    } ${isCurrent ? 'ring-2 ring-emerald-200' : ''}`}
                  >
                    {idx === 2 ? (
                      <Truck className="w-3.5 h-3.5" />
                    ) : isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className={`text-[11px] font-bold mt-1.5 ${isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:block">{step.sub}</span>
                </div>
              );
            })}
          </div>
          {sale.statusUpdatedAt && status !== 'CONFIRMED' && (
            <div className="mt-2.5 text-[10px] text-slate-500 text-center font-mono">
              Last dispatch update: {new Date(sale.statusUpdatedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Items & Delivery Info */}
        <div className="p-4 space-y-3 text-xs">
          <div className="space-y-2">
            {sale.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-md bg-white border border-slate-200 p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.description}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Package className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">{item.description}</div>
                    <div className="text-[11px] font-mono text-slate-500">
                      {item.partNumber} · Qty: {item.quantity}
                    </div>
                  </div>
                </div>
                <span className="font-mono font-semibold text-slate-800 shrink-0">
                  {formatCurrency(item.lineTotalInc, currencySymbol)}
                </span>
              </div>
            ))}
          </div>

          {(sale.deliveryAddress || sale.vehicleRef) && (
            <div className="pt-2.5 border-t border-slate-100 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-600">
              {sale.deliveryAddress && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{sale.deliveryAddress}</span>
                </div>
              )}
              {sale.vehicleRef && (
                <div className="flex items-center gap-1">
                  <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{sale.vehicleRef}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-slate-50 rounded-t-2xl sm:rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] sm:max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-slate-900 text-white rounded-lg shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">Client Account &amp; Order Tracking</h3>
              <p className="text-[11px] text-slate-500 truncate">
                Saved delivery profile, dispatch progress &amp; tax receipts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {customer ? (
            <>
              {/* Signed-In Profile Banner & Firebase Account Editor */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                      {customer.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">{customer.displayName}</span>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono block truncate">{customer.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onUpdateCustomerProfile && (
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile((v) => !v)}
                        className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>{isEditingProfile ? 'Cancel' : 'Edit Details'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onSignOut}
                      className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>

                {profileSaveMsg && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{profileSaveMsg}</span>
                  </div>
                )}

                {isEditingProfile ? (
                  <form onSubmit={handleSaveProfile} className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Full Name / Workshop</label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone / M-Pesa Number</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          placeholder="07XX XXX XXX"
                          className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Default Delivery Address</label>
                      <div className="relative">
                        <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          placeholder="e.g. Karen Workshop, Nairobi"
                          className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Vehicle Model / Reg #</label>
                      <div className="relative">
                        <Car className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={editVehicle}
                          onChange={(e) => setEditVehicle(e.target.value)}
                          placeholder="e.g. Range Rover Sport KDA 482B"
                          className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                    </div>
                    <div className="sm:col-span-2 flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isSavingProfile}
                        className="min-h-[40px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isSavingProfile ? 'Saving to Firebase...' : 'Save Account Details'}</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="pt-2.5 border-t border-slate-100 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-slate-600">
                    <span>Phone: <strong className="font-mono text-slate-800">{customer.phone || 'Not set'}</strong></span>
                    <span>Address: <strong className="text-slate-800">{customer.defaultDeliveryAddress || 'Not set'}</strong></span>
                    <span>Vehicle: <strong className="text-slate-800">{customer.defaultVehicleRef || 'Not set'}</strong></span>
                  </div>
                )}
              </div>

              {/* Orders List */}
              {customerOrders.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2">
                  <Package className="w-10 h-10 text-slate-300 mx-auto stroke-1" />
                  <h4 className="text-sm font-bold text-slate-800">No tracked orders yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Any order you place while signed in will automatically appear here with live dispatch status and downloadable KRA tax receipts.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Your Orders ({customerOrders.length})
                  </div>
                  {customerOrders.map(renderOrderCard)}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Account Prompt (Optional Login / Sign Up) */}
              <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-xl space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Sign In or Create Account</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sign in to automatically track all your spare part orders, delivery updates, and saved vehicles in Firebase.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenAuthModal('signin')}
                    className="min-h-[42px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAuthModal('signup')}
                    className="min-h-[42px] px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create Account</span>
                  </button>
                </div>
              </div>

              {/* Guest Invoice Lookup (No login required!) */}
              <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-xl space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Guest Order Lookup</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Checked out as a guest? Look up your order status directly with your Invoice # and Phone number.
                  </p>
                </div>

                <form onSubmit={handleGuestLookup} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={guestInvoice}
                    onChange={(e) => setGuestInvoice(e.target.value.toUpperCase())}
                    placeholder="Invoice # (e.g. INV-2026-1001)"
                    className="min-h-[42px] text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono uppercase focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                  />
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="Phone (e.g. 0722849204)"
                    className="min-h-[42px] text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                  />
                  <button
                    type="submit"
                    className="min-h-[42px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Find Order</span>
                  </button>
                </form>

                {lookupError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                    {lookupError}
                  </div>
                )}

                {matchedGuestSale && <div className="pt-2">{renderOrderCard(matchedGuestSale)}</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
