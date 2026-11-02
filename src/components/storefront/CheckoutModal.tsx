import React, { useState, useEffect } from 'react';
import { SaleRecord } from '../../types/inventory';
import { formatCurrency } from '../../utils/calculations';
import { 
  X, 
  CheckCircle, 
  Truck, 
  Phone, 
  User, 
  MapPin, 
  Car, 
  ShieldCheck, 
  Smartphone, 
  Banknote, 
  Building2, 
  RotateCw, 
  Clock, 
  Check, 
  Printer, 
  Receipt,
  ArrowRight
} from 'lucide-react';
import { CartItem } from './CartDrawer';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  currencySymbol: string;
  defaultTaxRate: number;
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
  defaultTaxRate,
  onPlaceOrder,
  onViewInvoiceReceipt,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('0722 849 204');
  const [deliveryAddress, setDeliveryAddress] = useState('Karen Workshop, Nairobi');
  const [vehicleRef, setVehicleRef] = useState('Range Rover Sport L494 3.0 (KDA 482B)');
  const [paymentMethod, setPaymentMethod] = useState<'Mobile Money' | 'Cash' | 'Bank Transfer'>('Mobile Money');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [bankReference, setBankReference] = useState('');
  const [notes, setNotes] = useState('');
  
  // Payment confirmation states
  const [isStkPromptActive, setIsStkPromptActive] = useState(false);
  const [stkCountdown, setStkCountdown] = useState(25);
  const [stkStatus, setStkStatus] = useState<'prompting' | 'processing' | 'approved'>('prompting');
  const [generatedMpesaCode, setGeneratedMpesaCode] = useState('');
  
  // Explicit payment confirmation modal for Cash / Bank Transfer
  const [isConfirmingOfflinePayment, setIsConfirmingOfflinePayment] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedSale, setConfirmedSale] = useState<SaleRecord | null>(null);

  const totalInc = items.reduce((sum, item) => sum + (item?.part?.retailPriceInc || 0) * (item?.quantity || 0), 0);
  const totalEx = items.reduce((sum, item) => sum + (item?.part?.retailPriceEx || 0) * (item?.quantity || 0), 0);
  const taxAmount = totalInc - totalEx;

  // Countdown timer for M-Pesa STK Push
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isStkPromptActive && stkCountdown > 0 && stkStatus === 'prompting') {
      timer = setTimeout(() => setStkCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [isStkPromptActive, stkCountdown, stkStatus]);

  if (!isOpen) return null;

  // Generate authentic Safaricom confirmation code (e.g., SHB89421KZ)
  const generateMpesaReceipt = () => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const randLetters = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    const randDigits = Math.floor(10000 + Math.random() * 90000);
    return `S${randLetters}${randDigits}`;
  };

  const handleStartPaymentFlow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      setErrorMessage('Please fill in your name, contact phone number, and delivery address.');
      return;
    }
    setErrorMessage(null);

    if (paymentMethod === 'Mobile Money') {
      setIsStkPromptActive(true);
      setStkCountdown(25);
      setStkStatus('prompting');
    } else {
      // Open explicit payment confirmation dialog for Cash / Bank Transfer
      setIsConfirmingOfflinePayment(true);
    }
  };

  const handleSimulatePinAuthorize = async () => {
    setStkStatus('processing');
    const code = generateMpesaReceipt();
    setGeneratedMpesaCode(code);

    setTimeout(async () => {
      setStkStatus('approved');
      // Payment confirmed! Proceed to generate official receipt
      setTimeout(async () => {
        await processFinalOrder(code);
      }, 900);
    }, 1100);
  };

  const handleConfirmOfflinePayment = async () => {
    setIsConfirmingOfflinePayment(false);
    await processFinalOrder();
  };

  const processFinalOrder = async (mpesaCode?: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const finalMpesaCode = mpesaCode || (paymentMethod === 'Mobile Money' ? generateMpesaReceipt() : undefined);
      const sale = await onPlaceOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        vehicleRef: vehicleRef.trim() || undefined,
        deliveryAddress: deliveryAddress.trim(),
        paymentMethod,
        mpesaReceiptNumber: finalMpesaCode,
        notes: notes.trim() || (paymentMethod === 'Cash' && cashTendered ? `Cash tendered: KSh ${cashTendered}` : paymentMethod === 'Bank Transfer' && bankReference ? `Bank Ref: ${bankReference}` : undefined),
      });

      if (sale) {
        setConfirmedSale(sale);
        setIsStkPromptActive(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Error placing order. Please check connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAndReset = () => {
    setConfirmedSale(null);
    setIsStkPromptActive(false);
    setIsConfirmingOfflinePayment(false);
    setStkStatus('prompting');
    setErrorMessage(null);
    onClose();
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const parsedCashTendered = parseFloat(cashTendered.replace(/,/g, '')) || 0;
  const cashChangeDue = Math.max(0, parsedCashTendered - totalInc);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative">
        {/* ========================================================================= */}
        {/* 1. M-PESA STK PUSH PAYMENT VERIFICATION MODAL                             */}
        {/* ========================================================================= */}
        {isStkPromptActive ? (
          <div className="p-6 sm:p-8 space-y-6 bg-slate-950 text-white relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400 block font-mono">
                    LIPA NA M-PESA ONLINE
                  </span>
                  <h3 className="text-sm font-bold text-white">Payment Confirmation Required</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStkPromptActive(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {stkStatus === 'approved' ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40 animate-bounce">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40 mb-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Payment Confirmed by Safaricom</span>
                  </div>
                  <h4 className="text-lg font-bold text-white">Payment Received Successfully</h4>
                  <p className="text-xs text-slate-300 mt-1 font-mono">
                    M-Pesa Transaction Ref: <strong className="text-emerald-400 font-bold">{generatedMpesaCode}</strong>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Amount: <strong className="text-white">{formatCurrency(totalInc, currencySymbol)}</strong> confirmed. Generating official receipt...
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Simulated Phone Screen Preview */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center relative overflow-hidden">
                  <div className="w-20 h-1 bg-slate-800 rounded-full mx-auto mb-4" />
                  
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium mb-3">
                    <Clock className="w-3 h-3 animate-spin" />
                    <span>Awaiting PIN on phone: {stkCountdown}s remaining</span>
                  </div>

                  <div className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-950 p-4 rounded-lg border border-slate-800 text-left space-y-1.5">
                    <p className="text-emerald-400 font-bold text-sm">Do you want to pay {formatCurrency(totalInc, currencySymbol)}?</p>
                    <p className="text-slate-200">To: <strong className="text-white">PANZER AUTOPARTS LIMITED</strong></p>
                    <p className="text-slate-400 text-[11px]">Paybill: <span className="text-white font-mono">849204</span> · Acc: <span className="text-white font-mono">{items[0]?.part?.partNumber || 'RANGE-ROVER'}</span></p>
                    <p className="text-slate-400 text-[11px]">Sent to mobile: <span className="text-emerald-300 font-semibold">{customerPhone}</span></p>
                  </div>

                  {/* Simulated PIN entry button */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col items-center gap-2">
                    <span className="text-[11px] text-slate-400">Simulate customer entering M-Pesa PIN on handset:</span>
                    <button
                      type="button"
                      onClick={handleSimulatePinAuthorize}
                      disabled={stkStatus === 'processing'}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
                    >
                      {stkStatus === 'processing' ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          <span>Verifying M-Pesa Payment...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 text-emerald-200" />
                          <span>Enter PIN & Confirm Payment</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-center text-[11px] text-slate-400">
                  Receipt will be generated immediately after Safaricom payment confirmation.
                </div>
              </div>
            )}
          </div>
        ) : isConfirmingOfflinePayment ? (
          /* ========================================================================= */
          /* 1B. OFFLINE PAYMENT CONFIRMATION DIALOG (CASH / BANK TRANSFER)            */
          /* ========================================================================= */
          <div className="p-6 sm:p-8 space-y-5 bg-white text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-900 text-white rounded-lg">
                  {paymentMethod === 'Cash' ? <Banknote className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Payment Confirmation</h3>
                  <p className="text-xs text-slate-500">Confirm payment received before issuing official receipt</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmingOfflinePayment(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
              <div className="flex justify-between items-center text-sm font-bold text-slate-900 pb-2 border-b border-slate-200">
                <span>Total Amount Due:</span>
                <span className="font-mono text-emerald-700 text-base">{formatCurrency(totalInc, currencySymbol)}</span>
              </div>

              {paymentMethod === 'Cash' ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Cash Tendered by Customer:</span>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder={`e.g. ${totalInc}`}
                      className="w-36 p-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded text-right focus:outline-none"
                    />
                  </div>
                  {parsedCashTendered >= totalInc && (
                    <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 p-2 rounded border border-emerald-200">
                      <span>Change Due to Customer:</span>
                      <span className="font-mono">{formatCurrency(cashChangeDue, currencySymbol)}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Payment will be confirmed as collected upon dispatch or workshop counter collection.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1 font-mono text-[11px]">
                    <div className="text-slate-500">Panzer Autoparts Limited Bank Wire:</div>
                    <div className="font-bold text-slate-900">NCBA Bank Kenya · Acc: 8492019482</div>
                    <div className="text-slate-600">Branch: Industrial Area, Nairobi</div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Bank Confirmation Ref / Slip # (Optional)
                    </label>
                    <input
                      type="text"
                      value={bankReference}
                      onChange={(e) => setBankReference(e.target.value.toUpperCase())}
                      placeholder="e.g. EFT-984210"
                      className="w-full p-1.5 text-xs font-mono bg-white border border-slate-300 rounded uppercase"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingOfflinePayment(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting || (paymentMethod === 'Cash' && parsedCashTendered > 0 && parsedCashTendered < totalInc)}
                onClick={handleConfirmOfflinePayment}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{isSubmitting ? 'Generating Receipt...' : 'Confirm Payment & Issue Receipt'}</span>
              </button>
            </div>
          </div>
        ) : confirmedSale ? (
          /* ========================================================================= */
          /* 2. OFFICIAL RECEIPT VIEW (GENERATED DIRECTLY AFTER PAYMENT CONFIRMATION)  */
          /* ========================================================================= */
          <div className="max-h-[85vh] flex flex-col">
            {/* Top Bar with Print Controls */}
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                  Official Receipt Generated
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-xs font-semibold text-slate-700">{confirmedSale.invoiceNumber}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseAndReset}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-4 text-xs" id="printable-receipt">
              {/* Payment Verified Stamp Banner */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-emerald-950 uppercase tracking-wide text-[11px] block">
                      Payment Confirmed & Verified
                    </span>
                    <span className="text-[11px] text-emerald-800">
                      Paid via <strong>{confirmedSale.paymentMethod}</strong>
                      {confirmedSale.mpesaReceiptNumber && (
                        <> · M-Pesa Ref: <strong className="font-mono">{confirmedSale.mpesaReceiptNumber}</strong></>
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

              {/* Company & Invoice Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-base font-bold text-slate-900">PANZER AUTOPARTS LIMITED</h1>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Nairobi Industrial Area · Range Rover OEM Spares Specialists
                  </p>
                  <div className="text-[11px] text-slate-500 mt-0.5 space-y-0.5">
                    <div>Phone: <strong className="font-mono text-slate-700">+254 722 849 204</strong></div>
                    <div>Email: <span className="text-slate-700">orders@panzerautoparts.co.ke</span></div>
                    <div className="text-emerald-800 font-mono text-[10px]">Lipa na M-Pesa Paybill: 849204 · Till: 948201</div>
                  </div>
                </div>

                <div className="text-right">
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

              {/* Billed To & Vehicle Info */}
              <div className="grid grid-cols-2 gap-3 py-2 border-b border-slate-200">
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

                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Vehicle / Fitment</span>
                  <div className="font-semibold text-slate-800 text-xs mt-0.5">
                    {confirmedSale.vehicleRef || 'Range Rover Genuine'}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Payment Method: <span className="font-semibold text-slate-800">{confirmedSale.paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Purchased Parts Table */}
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
                    <tr key={idx} className="py-1.5">
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

              {/* Totals Summary */}
              <div className="border-t border-slate-200 pt-3 flex justify-between items-start">
                <div className="max-w-xs text-slate-500 text-[11px] leading-relaxed">
                  Thank you for shopping with Panzer Autoparts Limited. Certified OEM Range Rover spares.
                  Dispatch tracking: <strong>2-4 hours Nairobi Metro / Karen / Westlands delivery</strong>.
                </div>

                <div className="w-56 space-y-1 text-right">
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

            {/* Bottom Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  onViewInvoiceReceipt(confirmedSale);
                  handleCloseAndReset();
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                View Fullscreen Tax Invoice
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="px-4 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseAndReset}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  Done & Continue Shopping
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* 3. CHECKOUT DETAILS & PAYMENT SELECTOR                                    */
          /* ========================================================================= */
          <div>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-900 text-white rounded-lg">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Checkout & Kenyan Dispatch</h3>
                  <p className="text-[11px] text-slate-500">Nairobi delivery in 2-4 hours or workshop pickup in Industrial Area</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleStartPaymentFlow} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Order Summary Snapshot */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-800">{items.length} Range Rover spare item(s) selected</span>
                  <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                    ✓ Genuine OEM Certified · KRA 16% VAT Included
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Total Payable</span>
                  <span className="font-mono font-bold text-slate-900 text-base">
                    {formatCurrency(totalInc, currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Error Notification Banner */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center justify-between animate-in fade-in">
                  <span>{errorMessage}</span>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    className="text-rose-400 hover:text-rose-700 ml-2 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Personal Details */}
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
                      className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
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
                      placeholder="07XX XXX XXX or +254 7XX..."
                      className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white font-mono font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Address / Garage Location in Kenya *
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <textarea
                    rows={2}
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="e.g. Karen Road Auto Garage, Nairobi / or Enterprise Road Counter Pickup"
                    className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white resize-none"
                  />
                </div>
              </div>

              {/* Vehicle Compatibility check */}
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
                    placeholder="e.g. Range Rover Vogue L405 4.4 SDV8 / KDA 482B"
                    className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white font-medium"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Mobile Money')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'Mobile Money'
                        ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Smartphone className={`w-4 h-4 ${paymentMethod === 'Mobile Money' ? 'text-emerald-700' : 'text-slate-400'}`} />
                      {paymentMethod === 'Mobile Money' && (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-slate-900">Lipa na M-Pesa</div>
                      <div className="text-[10px] text-slate-500">STK Push on phone</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'Cash'
                        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Banknote className={`w-4 h-4 ${paymentMethod === 'Cash' ? 'text-slate-900' : 'text-slate-400'}`} />
                      {paymentMethod === 'Cash' && (
                        <Check className="w-3.5 h-3.5 text-slate-900" />
                      )}
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-slate-900">Cash on Delivery</div>
                      <div className="text-[10px] text-slate-500">Workshop / Courier</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Bank Transfer')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'Bank Transfer'
                        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Building2 className={`w-4 h-4 ${paymentMethod === 'Bank Transfer' ? 'text-slate-900' : 'text-slate-400'}`} />
                      {paymentMethod === 'Bank Transfer' && (
                        <Check className="w-3.5 h-3.5 text-slate-900" />
                      )}
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-slate-900">Bank Wire / RTGS</div>
                      <div className="text-[10px] text-slate-500">NCBA / KCB Bank</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Notes / Gate Code (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Call before arrival, leave at garage reception"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              {/* Submit Trigger */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Total Payable: <strong className="font-mono text-slate-900 text-sm">{formatCurrency(totalInc, currencySymbol)}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <span>{paymentMethod === 'Mobile Money' ? 'Pay with M-Pesa (STK Push)' : 'Proceed to Payment Confirmation'}</span>
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
