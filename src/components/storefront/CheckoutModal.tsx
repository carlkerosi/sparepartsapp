import React, { useState, useEffect } from 'react';
import { SaleRecord, InventorySettings, CustomerProfile } from '../../types/inventory';
import { formatCurrency } from '../../utils/calculations';
import {
  X,
  Truck,
  Phone,
  User,
  MapPin,
  Car,
  ShieldCheck,
  Smartphone,
  Check,
  Printer,
  ArrowRight,
  LogIn,
  UserPlus,
  UserCheck,
  Copy,
} from 'lucide-react';
import { CartItem } from './CartDrawer';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  currencySymbol: string;
  defaultTaxRate: number;
  settings?: InventorySettings;
  customer?: CustomerProfile | null;
  onOpenAuthModal?: (mode: 'signin' | 'signup') => void;
  onOpenOrderTracking?: () => void;
  onPlaceOrder: (orderPayload: {
    customerName: string;
    customerPhone: string;
    vehicleRef?: string;
    deliveryAddress: string;
    paymentMethod: 'Mobile Money' | 'Cash' | 'Bank Transfer' | 'Credit Card';
    mpesaReceiptNumber?: string;
    notes?: string;
  }) => Promise<SaleRecord | void>;
  onViewInvoiceReceipt: (sale: SaleRecord) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  currencySymbol,
  settings,
  customer,
  onOpenAuthModal,
  onOpenOrderTracking,
  onPlaceOrder,
  onViewInvoiceReceipt,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [vehicleRef, setVehicleRef] = useState('');
  const [notes, setNotes] = useState('');
  const [manualMpesaCode, setManualMpesaCode] = useState('');
  const [copiedField, setCopiedField] = useState<'paybill' | 'account' | 'amount' | 'all' | null>(null);

  // Guided Manual M-Pesa Paybill step
  const [isMpesaToolkitStepActive, setIsMpesaToolkitStepActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedSale, setConfirmedSale] = useState<SaleRecord | null>(null);

  useEffect(() => {
    if (isOpen && customer) {
      if (customer.displayName && !customerName.trim()) {
        setCustomerName(customer.displayName);
      }
      if (customer.phone && !customerPhone.trim()) {
        setCustomerPhone(customer.phone);
      }
      if (customer.defaultDeliveryAddress && !deliveryAddress.trim()) {
        setDeliveryAddress(customer.defaultDeliveryAddress);
      }
      if (customer.defaultVehicleRef && !vehicleRef.trim()) {
        setVehicleRef(customer.defaultVehicleRef);
      }
    }
  }, [isOpen, customer]);

  if (!isOpen) return null;

  const paybillNumber =
    settings?.mpesaPaybillNumber && settings.mpesaPaybillNumber !== '174379'
      ? settings.mpesaPaybillNumber
      : '522522';
  const paybillAccount = settings?.mpesaAccountNumber || '1358024235';
  const paybillAccountName = settings?.mpesaAccountName || 'PANZER AUTOPARTS LTD';

  const totalInc = items.reduce((sum, item) => sum + (item?.part?.retailPriceInc || 0) * (item?.quantity || 0), 0);

  const handleCopyDetail = async (field: 'paybill' | 'account' | 'amount' | 'all', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // Ignore clipboard denials in restricted browser contexts
    }
  };

  const processFinalOrder = async (mpesaCode: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const channelTag = `Manual M-Pesa Paybill (${paybillNumber} · Acc ${paybillAccount})`;
      const combinedNotes = [notes.trim(), channelTag].filter(Boolean).join(' | ');

      const sale = await onPlaceOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        vehicleRef: vehicleRef.trim() || undefined,
        deliveryAddress: deliveryAddress.trim(),
        paymentMethod: 'Mobile Money',
        mpesaReceiptNumber: mpesaCode,
        notes: combinedNotes,
      });

      if (sale) {
        setConfirmedSale(sale);
        setIsMpesaToolkitStepActive(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Error placing order. Please check connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartPaymentFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      setErrorMessage('Please fill in your name, phone number, and delivery address.');
      return;
    }
    setErrorMessage(null);

    const cleaned = manualMpesaCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length >= 8) {
      await processFinalOrder(cleaned);
    } else {
      setIsMpesaToolkitStepActive(true);
    }
  };

  const handleManualMpesaCodeConfirm = async () => {
    const cleaned = manualMpesaCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length < 8) {
      setErrorMessage('Please enter the valid M-Pesa confirmation code from your SMS (e.g. UAK84920XY).');
      return;
    }
    setErrorMessage(null);
    await processFinalOrder(cleaned);
  };

  const handleCloseAndReset = () => {
    setConfirmedSale(null);
    setIsMpesaToolkitStepActive(false);
    setManualMpesaCode('');
    setCopiedField(null);
    setErrorMessage(null);
    onClose();
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative">
        {isMpesaToolkitStepActive ? (
          /* ========================================================================= */
          /* 1. GUIDED MANUAL M-PESA PAYBILL STEP (*334# / SIM TOOLKIT)               */
          /* ========================================================================= */
          <div className="flex flex-col max-h-[92vh]">
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-700 block">
                    LIPA NA M-PESA · SIM TOOLKIT / *334#
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    Pay via Paybill {paybillNumber}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMpesaToolkitStepActive(false)}
                aria-label="Close"
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center justify-between">
                  <span>{errorMessage}</span>
                  <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-500 ml-2 cursor-pointer p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Direct 1-Tap Phone Launcher + Copyable Details */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 text-xs">
                <div className="font-bold text-emerald-950 flex flex-wrap items-center justify-between gap-2">
                  <span>Pay via phone M-Pesa menu &amp; enter code below:</span>
                  <span className="font-mono text-sm text-emerald-800">{formatCurrency(totalInc, currencySymbol)}</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href="tel:*334%23"
                    onClick={() => handleCopyDetail('account', paybillAccount)}
                    className="flex-1 min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-2 shadow-sm transition-colors no-underline"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Open M-Pesa on Phone (*334#)</span>
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyDetail(
                        'all',
                        `Paybill: ${paybillNumber} | Account: ${paybillAccount} | Amount: ${Math.round(totalInc)}`
                      )
                    }
                    className="min-h-[44px] px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-emerald-300 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedField === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'all' ? 'Details Copied!' : 'Copy All Details'}</span>
                  </button>
                </div>

                <ol className="space-y-1 text-slate-700 list-decimal list-inside bg-white/80 p-3 rounded-lg border border-emerald-100">
                  <li>
                    Dial <strong className="font-mono">*334#</strong> or open <strong>SIM Toolkit &rarr; M-Pesa</strong>
                  </li>
                  <li>
                    Select <strong>Lipa na M-Pesa &rarr; Pay Bill</strong>
                  </li>
                  <li>
                    Business No. <strong className="font-mono">{paybillNumber}</strong> · Account No. <strong className="font-mono">{paybillAccount}</strong>
                  </li>
                  <li>
                    Amount <strong className="font-mono">{Math.round(totalInc).toLocaleString()}</strong> · Confirm <strong className="font-mono">{paybillAccountName}</strong>
                  </li>
                </ol>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 bg-white border border-emerald-200 rounded-lg">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">1. Paybill No.</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono font-bold text-base text-slate-900">{paybillNumber}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyDetail('paybill', paybillNumber)}
                        className="min-h-[32px] px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedField === 'paybill' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'paybill' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white border border-emerald-200 rounded-lg">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">2. Account No.</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono font-bold text-sm text-slate-900">{paybillAccount}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyDetail('account', paybillAccount)}
                        className="min-h-[32px] px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedField === 'account' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'account' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white border border-emerald-200 rounded-lg">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">3. Amount (KSh)</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono font-bold text-sm text-emerald-700">
                        {Math.round(totalInc).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyDetail('amount', String(Math.round(totalInc)))}
                        className="min-h-[32px] px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedField === 'amount' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'amount' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* M-Pesa Confirmation Code Input */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <label className="block text-xs font-bold text-slate-900">
                  Enter M-Pesa Confirmation Code from your Safaricom SMS *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={manualMpesaCode}
                    onChange={(e) => setManualMpesaCode(e.target.value.toUpperCase())}
                    placeholder="e.g. UAK84920XY"
                    className="flex-1 min-h-[44px] px-3 py-2.5 text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleManualMpesaCodeConfirm}
                    disabled={isSubmitting || manualMpesaCode.trim().replace(/[^A-Za-z0-9]/g, '').length < 8}
                    className="min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors inline-flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSubmitting ? 'Confirming Order...' : 'Confirm & Place Order'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Your official tax receipt and order tracking number are generated immediately once you confirm the SMS code.
                </p>
              </div>
            </div>

            <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setIsMpesaToolkitStepActive(false)}
                className="min-h-[40px] px-3.5 py-2 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
              >
                &larr; Edit Delivery Details
              </button>
              <span className="text-[11px] text-slate-500 font-mono">
                {paybillAccountName}
              </span>
            </div>
          </div>
        ) : confirmedSale ? (
          /* ========================================================================= */
          /* 2. OFFICIAL RECEIPT VIEW (GENERATED IMMEDIATELY AFTER CONFIRMATION)       */
          /* ========================================================================= */
          <div className="max-h-[92vh] flex flex-col">
            <div className="px-5 sm:px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide truncate">
                  Official Receipt
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-xs font-semibold text-slate-700 truncate">{confirmedSale.invoiceNumber}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseAndReset}
                  aria-label="Close"
                  className="min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-8 overflow-y-auto space-y-4 text-xs flex-1" id="printable-receipt">
              {!customer && onOpenAuthModal && (
                <div className="p-3 bg-slate-900 text-white rounded-lg flex flex-wrap items-center justify-between gap-2 print:hidden">
                  <div>
                    <span className="font-bold text-xs block">Save &amp; Track Order {confirmedSale.invoiceNumber}</span>
                    <span className="text-[11px] text-slate-300">
                      Sign in or create an account to save this order to Firebase and follow delivery updates.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenAuthModal('signin')}
                      className="min-h-[38px] px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAuthModal('signup')}
                      className="min-h-[38px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Create Account
                    </button>
                  </div>
                </div>
              )}

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-emerald-950 uppercase tracking-wide text-[11px] block">
                      Order Confirmed &amp; Logged
                    </span>
                    <span className="text-[11px] text-emerald-800">
                      M-Pesa Paybill {paybillNumber}
                      {confirmedSale.mpesaReceiptNumber && (
                        <> · Ref: <strong className="font-mono">{confirmedSale.mpesaReceiptNumber}</strong></>
                      )}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-800 block uppercase font-bold">Amount Paid</span>
                  <span className="font-mono text-sm font-bold text-emerald-950">
                    {formatCurrency(confirmedSale.totalInc, currencySymbol)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-base font-bold text-slate-900">PANZER AUTOPARTS LIMITED</h1>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Nairobi Industrial Area · Range Rover OEM Spares Specialists
                  </p>
                  <div className="text-[11px] text-slate-500 mt-0.5 space-y-0.5">
                    <div>Phone: <strong className="font-mono text-slate-700">+254 722 849 204</strong></div>
                    <div>Email: <span className="text-slate-700">orders@panzerautoparts.co.ke</span></div>
                    <div className="text-emerald-800 font-mono text-[10px]">
                      Paybill: {paybillNumber} · Acc No: {paybillAccount} · {paybillAccountName}
                    </div>
                  </div>
                </div>

                <div className="sm:text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    CUSTOMER TAX RECEIPT
                  </span>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                    {confirmedSale.invoiceNumber}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {new Date(confirmedSale.timestamp).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 border-b border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Customer Details</span>
                  <div className="font-bold text-slate-900 text-xs mt-0.5">{confirmedSale.customerName}</div>
                  <div className="text-slate-500 text-[11px]">Contact: <span className="font-mono">{confirmedSale.customerPhone}</span></div>
                  {confirmedSale.deliveryAddress && (
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Dispatch Address: {confirmedSale.deliveryAddress}
                    </div>
                  )}
                </div>

                <div className="sm:text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Vehicle / Fitment</span>
                  <div className="font-semibold text-slate-800 text-xs mt-0.5">
                    {confirmedSale.vehicleRef || 'Range Rover Genuine'}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Payment: <span className="font-semibold text-slate-800">Manual M-Pesa Paybill</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left my-2 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                      <th className="py-1.5 px-1">Spare Part / Description</th>
                      <th className="py-1.5 px-2 text-center w-12">Qty</th>
                      <th className="py-1.5 px-2 text-right">Unit Price</th>
                      <th className="py-1.5 px-2 text-right">Total (Inc)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {confirmedSale.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-1">
                          <span className="font-mono font-bold text-slate-900 mr-1.5">
                            {it.partNumber}
                          </span>
                          <span className="text-slate-700">{it.description}</span>
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-semibold">
                          {it.quantity}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-600">
                          {formatCurrency(it.unitPriceInc, currencySymbol)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(it.lineTotalInc, currencySymbol)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 pt-3 flex flex-col sm:flex-row justify-between items-start gap-3">
                <div className="max-w-xs text-slate-500 text-[11px] leading-relaxed">
                  Thank you for shopping with Panzer Autoparts Limited. Certified OEM Range Rover spares.
                  Dispatch tracking: <strong>2-4 hours Nairobi Metro / Karen / Westlands delivery</strong>.
                </div>

                <div className="w-full sm:w-56 space-y-1 text-right">
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>Subtotal (Net):</span>
                    <span className="font-mono">{formatCurrency(confirmedSale.subtotalEx, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>KRA 16% VAT:</span>
                    <span className="font-mono">{formatCurrency(confirmedSale.taxAmount, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                    <span>Total Paid:</span>
                    <span className="font-mono text-emerald-700">{formatCurrency(confirmedSale.totalInc, currencySymbol)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onViewInvoiceReceipt(confirmedSale);
                    handleCloseAndReset();
                  }}
                  className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Fullscreen Tax Invoice
                </button>
                {onOpenOrderTracking && (
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseAndReset();
                      onOpenOrderTracking();
                    }}
                    className="min-h-[40px] px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Track Order Status</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleCloseAndReset}
                className="min-h-[40px] px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* 3. CHECKOUT DETAILS & MANUAL M-PESA PAYBILL FLOW                          */
          /* ========================================================================= */
          <div className="flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 bg-slate-900 text-white rounded-lg shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">Checkout &amp; Kenyan Dispatch</h3>
                  <p className="text-[11px] text-slate-500 truncate">Nairobi delivery in 2-4 hours or Industrial Area pickup</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleStartPaymentFlow} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {/* Order Summary Snapshot */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs gap-2">
                  <div>
                    <span className="font-semibold text-slate-800">{items.length} spare item(s) selected</span>
                    <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                      ✓ Genuine OEM Certified · KRA 16% VAT Included
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Total Payable</span>
                    <span className="font-mono font-bold text-slate-900 text-base">
                      {formatCurrency(totalInc, currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* Optional Client Account Login / Sign Up */}
                {customer ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs">
                    <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold text-emerald-950 block truncate">
                        Signed in as {customer.displayName}
                      </span>
                      <span className="text-[11px] text-emerald-800 block truncate">
                        Order &amp; delivery details automatically saved to your Firebase account ({customer.email})
                      </span>
                    </div>
                  </div>
                ) : onOpenAuthModal ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2.5 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        Save details &amp; track your order in Firebase (Optional)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Sign in / create an account — or continue below as a guest.
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenAuthModal('signin')}
                        className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <LogIn className="w-3 h-3" />
                        <span>Sign In</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenAuthModal('signup')}
                        className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>Sign Up</span>
                      </button>
                    </div>
                  </div>
                ) : null}

                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center justify-between">
                    <span>{errorMessage}</span>
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="text-rose-400 hover:text-rose-700 ml-2 cursor-pointer p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Customer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Customer / Workshop Name *
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. David Mwangi / Karen Motors"
                        className="w-full text-xs pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone / M-Pesa Number *
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="07XX XXX XXX"
                        className="w-full text-xs pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white font-mono font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery Address / Garage Location *
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-3 text-slate-400" />
                    <textarea
                      rows={2}
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="e.g. Karen Road Auto Garage, Nairobi / or Industrial Area Pickup"
                      className="w-full text-xs pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white resize-none"
                    />
                  </div>
                </div>

                {/* Vehicle Compatibility */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vehicle Model / Reg Number (For Fitment Verification)
                  </label>
                  <div className="relative">
                    <Car className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={vehicleRef}
                      onChange={(e) => setVehicleRef(e.target.value)}
                      placeholder="e.g. Range Rover Sport L494 / KDA 482B"
                      className="w-full text-xs pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white font-medium"
                    />
                  </div>
                </div>

                {/* Single Payment Method: Manual M-Pesa Paybill (SIM Toolkit / *334#) */}
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="font-bold text-emerald-950">
                        Lipa na M-Pesa Paybill (Manual SIM Toolkit / *334#)
                      </span>
                    </div>
                    <a
                      href="tel:*334%23"
                      onClick={() => handleCopyDetail('account', paybillAccount)}
                      className="min-h-[36px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors no-underline"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Open M-Pesa (*334#)</span>
                    </a>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-emerald-200">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Paybill Business No.</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">{paybillNumber}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyDetail('paybill', paybillNumber)}
                        className="min-h-[34px] px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedField === 'paybill' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'paybill' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-emerald-200">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Account ({paybillAccountName})</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">{paybillAccount}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyDetail('account', paybillAccount)}
                        className="min-h-[34px] px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedField === 'account' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedField === 'account' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-950 mb-1">
                      Already sent M-Pesa payment? Enter SMS Code (or leave blank to open guided payment screen):
                    </label>
                    <input
                      type="text"
                      value={manualMpesaCode}
                      onChange={(e) => setManualMpesaCode(e.target.value.toUpperCase())}
                      placeholder="Optional here — e.g. UAK84920XY"
                      className="w-full min-h-[40px] px-3 py-2 text-xs font-mono font-bold bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 uppercase"
                    />
                  </div>
                </div>

                {/* Delivery Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery Notes / Gate Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Call before arrival, leave at garage reception"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Sticky Bottom Footer Trigger */}
              <div className="px-5 sm:px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="text-xs text-slate-500">
                  Total: <strong className="font-mono text-slate-900 text-sm">{formatCurrency(totalInc, currencySymbol)}</strong>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[44px] px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <span>
                      {manualMpesaCode.trim().replace(/[^A-Za-z0-9]/g, '').length >= 8
                        ? 'Confirm M-Pesa Code & Place Order'
                        : `Pay via M-Pesa Paybill (${paybillNumber})`}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
