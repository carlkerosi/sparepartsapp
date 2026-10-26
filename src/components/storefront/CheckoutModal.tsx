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
  ArrowRight,
  Smartphone,
  Banknote,
  RotateCw,
  Clock,
  Check
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
  const [paymentMethod, setPaymentMethod] = useState<'Mobile Money' | 'Cash'>('Mobile Money');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [notes, setNotes] = useState('');
  
  // STK Push Simulation States
  const [isStkPromptActive, setIsStkPromptActive] = useState(false);
  const [stkCountdown, setStkCountdown] = useState(25);
  const [stkPinInput, setStkPinInput] = useState('');
  const [stkStatus, setStkStatus] = useState<'prompting' | 'processing' | 'approved'>('prompting');
  const [generatedMpesaCode, setGeneratedMpesaCode] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedSale, setConfirmedSale] = useState<SaleRecord | null>(null);

  const totalInc = items.reduce((sum, item) => sum + (item?.part?.retailPriceInc || 0) * (item?.quantity || 0), 0);
  const totalEx = items.reduce((sum, item) => sum + (item?.part?.retailPriceEx || 0) * (item?.quantity || 0), 0);
  const totalLandedCogs = items.reduce((sum, item) => sum + (item?.part?.unitCostLanded || 0) * (item?.quantity || 0), 0);

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

  const handleStartStkPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      setErrorMessage('Please fill in your name, M-Pesa phone number, and delivery address.');
      return;
    }
    setErrorMessage(null);

    if (paymentMethod === 'Mobile Money') {
      setIsStkPromptActive(true);
      setStkCountdown(25);
      setStkStatus('prompting');
      setStkPinInput('');
    } else {
      // Direct Cash flow
      processFinalOrder();
    }
  };

  const handleSimulatePinAuthorize = async () => {
    setStkStatus('processing');
    const code = generateMpesaReceipt();
    setGeneratedMpesaCode(code);

    setTimeout(async () => {
      setStkStatus('approved');
      setTimeout(async () => {
        await processFinalOrder(code);
      }, 1000);
    }, 1200);
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
        notes: notes.trim() || (paymentMethod === 'Cash' && cashTendered ? `Customer tenders KSh ${cashTendered}` : undefined),
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
    setStkStatus('prompting');
    setErrorMessage(null);
    onClose();
  };

  const parsedCashTendered = parseFloat(cashTendered.replace(/,/g, '')) || 0;
  const cashChangeDue = Math.max(0, parsedCashTendered - totalInc);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 relative">
        {/* ========================================================================= */}
        {/* 1. M-PESA STK PUSH INTERACTIVE PROMPT MODAL                               */}
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
                  <h3 className="text-sm font-bold text-white">STK Push Verification</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStkPromptActive(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
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
                  <h4 className="text-lg font-bold text-white">M-Pesa Payment Received!</h4>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Receipt: <strong className="text-emerald-400">{generatedMpesaCode}</strong>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Amount: {formatCurrency(totalInc, currencySymbol)} confirmed. Finalizing order dispatch...
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

                  <div className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-left space-y-1">
                    <p className="text-emerald-400 font-bold">Do you want to pay {formatCurrency(totalInc, currencySymbol)}?</p>
                    <p className="text-slate-300">To: APEX AUTO SPARES (KENYA)</p>
                    <p className="text-slate-400 text-[10px]">Till / Paybill: 849204 · Acc: {items[0]?.part?.partNumber || 'PARTS'}</p>
                    <p className="text-slate-400 text-[10px]">Sent to: <span className="text-white font-semibold">{customerPhone}</span></p>
                  </div>

                  {/* Simulated PIN entry buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col items-center gap-2">
                    <span className="text-[11px] text-slate-400">Simulate customer entering M-Pesa PIN on handset:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSimulatePinAuthorize}
                        disabled={stkStatus === 'processing'}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        {stkStatus === 'processing' ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Authorizing PIN...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Authorize PIN & Confirm Payment</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-center text-[11px] text-slate-500">
                  Tip: A real Safaricom USSD prompt has been simulated. In production, this integrates via Daraja STK Push API.
                </div>
              </div>
            )}
          </div>
        ) : confirmedSale ? (
          /* ========================================================================= */
          /* 2. ORDER CONFIRMATION VIEW                                                */
          /* ========================================================================= */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Order Confirmed Successfully!</h2>
              <p className="text-xs text-slate-500 mt-1">
                Your Range Rover spare parts order has been logged into our Industrial Area fulfillment system.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-left space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Number:</span>
                <span className="font-bold text-slate-900">{confirmedSale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="text-slate-800">{confirmedSale.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-bold text-emerald-700">
                  {confirmedSale.paymentMethod === 'Mobile Money' ? 'Lipa na M-Pesa (STK Push)' : 'Cash on Delivery / Pickup'}
                </span>
              </div>
              {confirmedSale.mpesaReceiptNumber && (
                <div className="flex justify-between bg-emerald-50 p-1.5 rounded border border-emerald-200 text-emerald-800 font-bold">
                  <span>M-Pesa Receipt Code:</span>
                  <span>{confirmedSale.mpesaReceiptNumber}</span>
                </div>
              )}
              {confirmedSale.vehicleRef && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Vehicle / Fitment:</span>
                  <span className="text-slate-800">{confirmedSale.vehicleRef}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-bold text-slate-900">
                <span>Grand Total (16% VAT Inc):</span>
                <span>{formatCurrency(confirmedSale.totalInc, currencySymbol)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 font-normal">
                <span>Total Landed COGS:</span>
                <span>{formatCurrency(confirmedSale.totalCogsLanded, currencySymbol)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  onViewInvoiceReceipt(confirmedSale);
                  handleCloseAndReset();
                }}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                View / Print Tax Invoice
              </button>
              <button
                type="button"
                onClick={handleCloseAndReset}
                className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Continue Shopping
              </button>
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
            <form onSubmit={handleStartStkPrompt} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Order Summary Snapshot */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-800">{items.length} item(s) selected</span>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Landed Cost: <strong className="text-emerald-700">{formatCurrency(totalLandedCogs, currencySymbol)}</strong> · 16% VAT Inc
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Total Payable</span>
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
                    className="text-rose-400 hover:text-rose-700 ml-2"
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
                    className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Payment Method Selector (M-Pesa STK Prompt vs Cash) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Payment Option (Kenya Standard) *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Option 1: M-Pesa STK Push */}
                  <div
                    onClick={() => setPaymentMethod('Mobile Money')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      paymentMethod === 'Mobile Money'
                        ? 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center">
                        <Smartphone className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900">M-Pesa STK Prompt</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      Instant PIN prompt sent to your Safaricom mobile phone screen.
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-mono font-semibold text-emerald-800">
                      Till/Paybill: 849204
                    </span>
                  </div>

                  {/* Option 2: Cash On Delivery */}
                  <div
                    onClick={() => setPaymentMethod('Cash')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      paymentMethod === 'Cash'
                        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center">
                        <Banknote className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900">Cash on Delivery</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      Pay in cash upon physical delivery or collection at our Nairobi counter.
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-mono font-semibold text-slate-600">
                      Receipt on arrival
                    </span>
                  </div>
                </div>
              </div>

              {/* Cash Calculation helper if Cash is selected */}
              {paymentMethod === 'Cash' && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Cash Amount Tendered (Optional)</span>
                    <span className="text-[11px] text-slate-400">For driver change calculation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder={`e.g. ${Math.ceil(totalInc / 1000) * 1000}`}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                    {parsedCashTendered > totalInc && (
                      <div className="shrink-0 text-right">
                        <span className="text-[10px] text-slate-500 block">Change Due:</span>
                        <span className="text-xs font-mono font-bold text-emerald-700">
                          {formatCurrency(cashChangeDue, currencySymbol)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dispatch Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Call my mechanic Joseph on 0711..., delivery before 3 PM"
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 px-4 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                    paymentMethod === 'Mobile Money'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isSubmitting ? (
                    <span>Registering Order...</span>
                  ) : paymentMethod === 'Mobile Money' ? (
                    <>
                      <Smartphone className="w-4 h-4" />
                      <span>Trigger M-Pesa STK Prompt ({formatCurrency(totalInc, currencySymbol)})</span>
                    </>
                  ) : (
                    <>
                      <Banknote className="w-4 h-4" />
                      <span>Confirm Cash on Delivery ({formatCurrency(totalInc, currencySymbol)})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
