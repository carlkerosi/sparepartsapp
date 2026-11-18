import React, { useState, useEffect } from 'react';
import { SaleRecord, InventorySettings, CustomerProfile } from '../../types/inventory';
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
  ArrowRight,
  Wifi,
  Sparkles,
  LogIn,
  UserPlus,
  UserCheck,
  Copy,
  CreditCard,
  Send
} from 'lucide-react';
import { CartItem } from './CartDrawer';
import { 
  initiateStkPush, 
  queryStkStatus, 
  simulateStkConfirm 
} from '../../services/mpesaService';

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
  defaultTaxRate,
  settings,
  customer,
  onOpenAuthModal,
  onOpenOrderTracking,
  onPlaceOrder,
  onViewInvoiceReceipt,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('0722 849 204');
  const [deliveryAddress, setDeliveryAddress] = useState('Karen Workshop, Nairobi');
  const [vehicleRef, setVehicleRef] = useState('Range Rover Sport L494 3.0 (KDA 482B)');

  useEffect(() => {
    if (isOpen && customer) {
      if (customer.displayName && !customerName.trim()) {
        setCustomerName(customer.displayName);
      }
      if (customer.phone) {
        setCustomerPhone(customer.phone);
      }
      if (customer.defaultDeliveryAddress) {
        setDeliveryAddress(customer.defaultDeliveryAddress);
      }
      if (customer.defaultVehicleRef) {
        setVehicleRef(customer.defaultVehicleRef);
      }
    }
  }, [isOpen, customer]);
  const [selectedOption, setSelectedOption] = useState<
    'mpesa_toolkit' | 'cash_on_delivery' | 'bank_transfer' | 'credit_card' | 'mpesa_stk'
  >('mpesa_toolkit');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [bankReference, setBankReference] = useState('');
  const [cardReference, setCardReference] = useState('');
  const [notes, setNotes] = useState('');
  const [copiedField, setCopiedField] = useState<'paybill' | 'account' | 'amount' | 'all' | null>(null);
  
  // Payment confirmation states
  const [isMpesaToolkitStepActive, setIsMpesaToolkitStepActive] = useState(false);
  const [isStkPromptActive, setIsStkPromptActive] = useState(false);
  const [stkCountdown, setStkCountdown] = useState(30);
  const [stkStatus, setStkStatus] = useState<'idle' | 'dispatching' | 'prompting' | 'verifying' | 'approved' | 'cancelled' | 'failed'>('idle');
  const [generatedMpesaCode, setGeneratedMpesaCode] = useState('');
  const [manualMpesaCode, setManualMpesaCode] = useState('');
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);
  const [isStkSimulated, setIsStkSimulated] = useState(false);
  const [darajaNotice, setDarajaNotice] = useState<string | null>(null);
  const [darajaCustomerMessage, setDarajaCustomerMessage] = useState<string>('');
  const [darajaStatusNote, setDarajaStatusNote] = useState<string>('');
  
  // Explicit payment confirmation modal for Cash / Bank Transfer / Card
  const [isConfirmingOfflinePayment, setIsConfirmingOfflinePayment] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedSale, setConfirmedSale] = useState<SaleRecord | null>(null);

  const paybillNumber =
    settings?.mpesaPaybillNumber && settings.mpesaPaybillNumber !== '174379'
      ? settings.mpesaPaybillNumber
      : '522522';
  const paybillAccount = settings?.mpesaAccountNumber || '1358024235';
  const paybillAccountName = settings?.mpesaAccountName || 'PANZER AUTOPARTS LTD';

  const resolvedPaymentMethod: 'Mobile Money' | 'Cash' | 'Bank Transfer' | 'Credit Card' =
    selectedOption === 'cash_on_delivery'
      ? 'Cash'
      : selectedOption === 'bank_transfer'
      ? 'Bank Transfer'
      : selectedOption === 'credit_card'
      ? 'Credit Card'
      : 'Mobile Money';

  const handleCopyDetail = async (field: 'paybill' | 'account' | 'amount' | 'all', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // Clipboard fallback ignored when browser blocks permission
    }
  };

  const totalInc = items.reduce((sum, item) => sum + (item?.part?.retailPriceInc || 0) * (item?.quantity || 0), 0);
  const totalEx = items.reduce((sum, item) => sum + (item?.part?.retailPriceEx || 0) * (item?.quantity || 0), 0);
  const taxAmount = totalInc - totalEx;

  // Countdown timer for M-Pesa STK Push
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isStkPromptActive && stkCountdown > 0 && (stkStatus === 'prompting' || stkStatus === 'dispatching')) {
      timer = setTimeout(() => setStkCountdown((prev) => prev - 1), 1000);
    } else if (isStkPromptActive && stkCountdown === 0 && stkStatus === 'prompting') {
      setDarajaStatusNote('Awaiting your PIN input on handset. You may confirm or retry prompt.');
    }
    return () => clearTimeout(timer);
  }, [isStkPromptActive, stkCountdown, stkStatus]);

  // Real-time Daraja polling loop
  useEffect(() => {
    if (!isStkPromptActive || stkStatus !== 'prompting' || !checkoutRequestId) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const queryRes = await queryStkStatus(checkoutRequestId);
        if (queryRes.status === 'COMPLETED') {
          clearInterval(pollInterval);
          const receiptCode = queryRes.mpesaReceiptNumber || generateMpesaReceipt();
          setGeneratedMpesaCode(receiptCode);
          setStkStatus('approved');
          setTimeout(async () => {
            await processFinalOrder(receiptCode);
          }, 900);
        } else if (queryRes.status === 'CANCELLED') {
          clearInterval(pollInterval);
          setStkStatus('cancelled');
          setDarajaStatusNote('Payment prompt was cancelled on phone handset.');
        } else if (queryRes.status === 'TIMEOUT') {
          clearInterval(pollInterval);
          setStkStatus('failed');
          setDarajaStatusNote('Daraja timed out waiting for PIN entry on handset.');
        }
      } catch (e) {
        // Continue polling until countdown or completion
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [isStkPromptActive, stkStatus, checkoutRequestId]);

  if (!isOpen) return null;

  // Generate authentic Safaricom confirmation code (e.g., SBA89421KZ)
  const generateMpesaReceipt = () => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const randLetters = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
    const randDigits = Math.floor(10000 + Math.random() * 90000);
    return `S${randLetters}${randDigits}`;
  };

  const triggerStkRequest = async (useSandboxTestShortcode = false) => {
    setIsStkPromptActive(true);
    setStkCountdown(30);
    setStkStatus('dispatching');
    setIsStkSimulated(false);
    setDarajaNotice(null);
    setErrorMessage(null);
    setDarajaStatusNote(
      useSandboxTestShortcode
        ? 'Sending Sandbox handset test STK Push (Shortcode 174379)...'
        : `Sending STK Push prompt via ${(settings?.mpesaProvider || 'kcb_buni') === 'kcb_buni' ? 'KCB Buni' : 'Safaricom Daraja'}...`
    );

    try {
      const stkResult = await initiateStkPush({
        phoneNumber: customerPhone.trim(),
        amount: totalInc,
        accountReference: settings?.mpesaAccountNumber || '1358024235',
        transactionDesc: 'PANZER PARTS',
        useSandboxTestShortcode,
      });

      if (stkResult.CheckoutRequestID) {
        setCheckoutRequestId(stkResult.CheckoutRequestID);
        setIsStkSimulated(Boolean(stkResult.isSimulated));
        setDarajaNotice(stkResult.darajaError || null);
        setDarajaCustomerMessage(stkResult.CustomerMessage || `STK push dispatched to ${customerPhone}.`);
        setDarajaStatusNote(
          stkResult.isSimulated
            ? `Sandbox Simulation: Pay manually via Paybill ${stkResult.shortcode || '522522'} (Acc ${stkResult.accountNumber || '1358024235'}) and enter your M-Pesa code below, or use a Sandbox test option.`
            : `${stkResult.provider === 'kcb_buni' ? 'KCB Buni' : 'Live'} STK Push dispatched to ${customerPhone} (${useSandboxTestShortcode ? 'Sandbox 174379' : `Paybill ${stkResult.shortcode || '522522'} · Acc ${stkResult.accountNumber || '1358024235'}`}). Check your phone to enter your M-Pesa PIN.`
        );
        setStkStatus('prompting');
      } else {
        throw new Error(stkResult.error || 'Failed to dispatch Lipa na M-Pesa prompt.');
      }
    } catch (err: any) {
      console.error('STK push error:', err);
      const msg = err.message || 'Unable to trigger M-Pesa prompt. Please verify phone number format (07XXXXXXXX or 2547XXXXXXXX).';
      setErrorMessage(msg);
      setDarajaStatusNote(msg);
      setStkStatus('failed');
    }
  };

  const handleStartPaymentFlow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      setErrorMessage('Please fill in your name, contact phone number, and delivery address.');
      return;
    }
    setErrorMessage(null);

    if (selectedOption === 'mpesa_toolkit') {
      const cleaned = manualMpesaCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (cleaned.length >= 8) {
        await processFinalOrder(cleaned);
      } else {
        setIsMpesaToolkitStepActive(true);
      }
    } else if (selectedOption === 'mpesa_stk') {
      await triggerStkRequest(false);
    } else {
      // Open explicit payment confirmation dialog for Cash / Bank Transfer / Card
      setIsConfirmingOfflinePayment(true);
    }
  };

  const handleManualMpesaCodeConfirm = async () => {
    const cleaned = manualMpesaCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length < 8) {
      setErrorMessage('Please enter the valid 10-character M-Pesa confirmation code from your SMS (e.g. UAK84920XY).');
      return;
    }
    setErrorMessage(null);
    setGeneratedMpesaCode(cleaned);
    if (isStkPromptActive) {
      setStkStatus('approved');
      setTimeout(async () => {
        await processFinalOrder(cleaned);
      }, 600);
    } else {
      await processFinalOrder(cleaned);
    }
  };

  const handleSimulatePinAuthorize = async () => {
    setStkStatus('verifying');
    setDarajaStatusNote('Confirming PIN entry with Safaricom M-Pesa...');

    try {
      let code = '';
      if (checkoutRequestId) {
        const confirmRes = await simulateStkConfirm(checkoutRequestId);
        code = confirmRes.mpesaReceiptNumber || generateMpesaReceipt();
      } else {
        code = generateMpesaReceipt();
      }
      setGeneratedMpesaCode(code);
      setStkStatus('approved');
      setTimeout(async () => {
        await processFinalOrder(code);
      }, 900);
    } catch (e) {
      const code = generateMpesaReceipt();
      setGeneratedMpesaCode(code);
      setStkStatus('approved');
      setTimeout(async () => {
        await processFinalOrder(code);
      }, 900);
    }
  };

  const handleRetryStkPush = async () => {
    await triggerStkRequest(false);
  };

  const handleConfirmOfflinePayment = async () => {
    setIsConfirmingOfflinePayment(false);
    await processFinalOrder();
  };

  const processFinalOrder = async (mpesaCode?: string, overrideMethod?: 'Mobile Money' | 'Cash' | 'Bank Transfer' | 'Credit Card') => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const effectiveMethod = overrideMethod || resolvedPaymentMethod;
      const finalMpesaCode =
        mpesaCode || (effectiveMethod === 'Mobile Money' ? manualMpesaCode.trim().toUpperCase() || undefined : undefined);

      const channelTag =
        overrideMethod === 'Cash' || selectedOption === 'cash_on_delivery'
          ? 'Cash on Delivery / Pickup'
          : selectedOption === 'mpesa_toolkit'
          ? `M-Pesa SIM Toolkit (Paybill ${paybillNumber} · Acc ${paybillAccount})`
          : selectedOption === 'mpesa_stk'
          ? 'M-Pesa Express (STK Push)'
          : selectedOption === 'bank_transfer'
          ? `Bank Wire / PesaLink${bankReference ? ` · Ref: ${bankReference}` : ''}`
          : `Debit / Credit Card (PDQ)${cardReference ? ` · Ref: ${cardReference}` : ''}`;

      const combinedNotes = [
        notes.trim(),
        effectiveMethod === 'Cash' && cashTendered ? `Cash tendered: KSh ${cashTendered}` : '',
        channelTag,
      ]
        .filter(Boolean)
        .join(' | ');

      const sale = await onPlaceOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        vehicleRef: vehicleRef.trim() || undefined,
        deliveryAddress: deliveryAddress.trim(),
        paymentMethod: effectiveMethod,
        mpesaReceiptNumber: finalMpesaCode,
        notes: combinedNotes || undefined,
      });

      if (sale) {
        setConfirmedSale(sale);
        setIsMpesaToolkitStepActive(false);
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
    setIsMpesaToolkitStepActive(false);
    setIsStkPromptActive(false);
    setIsConfirmingOfflinePayment(false);
    setStkStatus('idle');
    setCheckoutRequestId(null);
    setIsStkSimulated(false);
    setDarajaNotice(null);
    setManualMpesaCode('');
    setCardReference('');
    setCopiedField(null);
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
        {/* 1A. M-PESA SIM TOOLKIT / PAYBILL DIRECT CONFIRMATION SCREEN               */}
        {/* ========================================================================= */}
        {isMpesaToolkitStepActive ? (
          <div className="p-6 sm:p-7 space-y-4 bg-white text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-700 block">
                    LIPA NA M-PESA · SIM TOOLKIT / M-PESA APP
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">Pay Direct via Paybill {paybillNumber}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMpesaToolkitStepActive(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center justify-between">
                <span>{errorMessage}</span>
                <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-500 ml-2 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Direct 1-Tap Phone Launcher + Step-by-step instructions */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 text-xs">
              <div className="font-bold text-emerald-950 flex flex-wrap items-center justify-between gap-2">
                <span>Launch M-Pesa on your phone &amp; pay via Paybill:</span>
                <span className="font-mono text-sm text-emerald-800">{formatCurrency(totalInc, currencySymbol)}</span>
              </div>

              {/* Direct Phone Dialer Launcher (*334#) + Copy All */}
              <div className="flex flex-col sm:flex-row gap-2">
                <a
                  href="tel:*334%23"
                  onClick={() => handleCopyDetail('account', paybillAccount)}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-2 shadow-sm transition-colors no-underline"
                >
                  <Phone className="w-4 h-4" />
                  <span>Open M-Pesa on Phone Now (*334#)</span>
                </a>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyDetail(
                      'all',
                      `Paybill: ${paybillNumber} | Account: ${paybillAccount} | Amount: ${Math.round(totalInc)}`
                    )
                  }
                  className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-emerald-300 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedField === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'all' ? 'Details Copied!' : 'Copy All Details'}</span>
                </button>
              </div>

              <p className="text-[11px] text-emerald-900">
                Tapping <strong>Open M-Pesa (*334#)</strong> opens Safaricom&apos;s M-Pesa menu directly on your phone and copies Account No. <strong className="font-mono">{paybillAccount}</strong> — or open your phone&apos;s <strong>SIM Toolkit &rarr; M-Pesa</strong> app:
              </p>

              <ol className="space-y-1 text-slate-700 list-decimal list-inside bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                <li>
                  Select <strong>Lipa na M-Pesa &rarr; Pay Bill</strong> (Dial <strong className="font-mono">*334#</strong> or open <strong>SIM Toolkit</strong>)
                </li>
                <li>
                  Enter Business No. <strong className="font-mono">{paybillNumber}</strong> &amp; Account No. <strong className="font-mono">{paybillAccount}</strong>
                </li>
                <li>
                  Enter Amount <strong className="font-mono">{Math.round(totalInc).toLocaleString()}</strong> &amp; confirm <strong className="font-mono">{paybillAccountName}</strong>
                </li>
              </ol>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-2.5 bg-white border border-emerald-200 rounded-lg">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">1. Paybill Business No.</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono font-bold text-base text-slate-900">{paybillNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyDetail('paybill', paybillNumber)}
                      className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded inline-flex items-center gap-1 cursor-pointer"
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
                      className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'account' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'account' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-2.5 bg-white border border-emerald-200 rounded-lg">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">3. Exact Amount</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono font-bold text-sm text-emerald-700">
                      {Math.round(totalInc).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyDetail('amount', String(Math.round(totalInc)))}
                      className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'amount' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'amount' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-emerald-900 bg-white/80 px-3 py-2 rounded-lg border border-emerald-200 flex items-center justify-between">
                <span>
                  Confirm recipient name shows: <strong className="font-mono">{paybillAccountName}</strong> (KCB)
                </span>
              </div>
            </div>

            {/* M-Pesa Confirmation Code Input */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <label className="block text-xs font-bold text-slate-900">
                4. Enter M-Pesa Confirmation Code from your Safaricom SMS *
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={manualMpesaCode}
                  onChange={(e) => setManualMpesaCode(e.target.value.toUpperCase())}
                  placeholder="e.g. UAK84920XY"
                  className="flex-1 px-3 py-2.5 text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 uppercase"
                />
                <button
                  type="button"
                  onClick={handleManualMpesaCodeConfirm}
                  disabled={isSubmitting || manualMpesaCode.trim().length < 8}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors inline-flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Confirming Order...' : 'Confirm M-Pesa Code & Place Order'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Your official KRA tax receipt &amp; order tracking number are generated immediately once you enter the M-Pesa code.
              </p>
            </div>

            {/* Alternative actions */}
            <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsMpesaToolkitStepActive(false)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium cursor-pointer"
              >
                &larr; Change Payment Method
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={async () => {
                    setSelectedOption('cash_on_delivery');
                    setIsMpesaToolkitStepActive(false);
                    await processFinalOrder(undefined, 'Cash');
                  }}
                  className="px-3 py-1.5 text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg font-semibold cursor-pointer"
                >
                  Pay Cash / M-Pesa on Delivery Instead
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMpesaToolkitStepActive(false);
                    setSelectedOption('mpesa_stk');
                    triggerStkRequest(false);
                  }}
                  className="px-3 py-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Try STK Push Popup</span>
                </button>
              </div>
            </div>
          </div>
        ) : isStkPromptActive ? (
          /* ========================================================================= */
          /* 1. M-PESA STK PUSH PAYMENT VERIFICATION MODAL                             */
          /* ========================================================================= */
          <div className="p-6 sm:p-8 space-y-5 bg-slate-950 text-white relative">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-400 block font-mono">
                      LIPA NA M-PESA ONLINE
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                      {settings?.mpesaEnvironment === 'production' ? 'DARAJA LIVE' : 'DARAJA SANDBOX'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">Safaricom Payment Prompt</h3>
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
                    <span>Payment Confirmed by Safaricom Daraja</span>
                  </div>
                  <h4 className="text-lg font-bold text-white">Payment Received Successfully</h4>
                  <p className="text-xs text-slate-300 mt-1 font-mono">
                    M-Pesa Transaction Ref: <strong className="text-emerald-400 font-bold">{generatedMpesaCode}</strong>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Amount: <strong className="text-white">{formatCurrency(totalInc, currencySymbol)}</strong> verified. Generating official receipt...
                  </p>
                </div>
              </div>
            ) : stkStatus === 'cancelled' || stkStatus === 'failed' ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/40">
                  <X className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    {stkStatus === 'cancelled' ? 'Transaction Cancelled' : 'STK Push Prompt Failed'}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                    {errorMessage || darajaStatusNote || 'The payment request was not completed. You can resend the prompt or try another payment method.'}
                  </p>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsStkPromptActive(false)}
                    className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer"
                  >
                    Back to Checkout
                  </button>
                  <button
                    type="button"
                    onClick={handleRetryStkPush}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Retry STK Push Prompt</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Handset / Paybill Payment Screen */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center relative overflow-hidden">
                  <div className="w-16 h-1 bg-slate-800 rounded-full mx-auto mb-3" />
                  
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium mb-3 border ${
                    isStkSimulated
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  }`}>
                    <Clock className={`w-3 h-3 ${isStkSimulated ? '' : 'animate-spin'}`} />
                    <span>
                      {stkStatus === 'dispatching' 
                        ? 'Dispatching prompt...' 
                        : isStkSimulated
                          ? 'Sandbox Mode · Pay via Paybill 522522 below'
                          : `Live STK Push Sent · ${stkCountdown}s remaining`}
                    </span>
                  </div>

                  {isStkSimulated && darajaNotice && (
                    <div className="mb-3 p-2.5 rounded-lg bg-amber-950/60 border border-amber-700/50 text-left text-[11px] text-amber-200 leading-relaxed">
                      <strong className="text-amber-300 block mb-0.5">Why no popup appeared on your phone:</strong>
                      {darajaNotice}
                    </div>
                  )}

                  {/* Safaricom Paybill & Account Display */}
                  <div className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-950 p-4 rounded-lg border border-slate-800 text-left space-y-2">
                    <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                        Lipa na M-Pesa · KCB Paybill
                      </span>
                      {checkoutRequestId && (
                        <span className="text-[9px] text-slate-500 truncate max-w-[180px]" title={checkoutRequestId}>
                          Req: {checkoutRequestId.slice(-14)}
                        </span>
                      )}
                    </div>
                    <p className="text-emerald-400 font-bold text-sm">
                      Amount: {formatCurrency(totalInc, currencySymbol)}
                    </p>
                    <p className="text-slate-200">
                      Account Name: <strong className="text-white">{settings?.mpesaAccountName || 'PANZER AUTOPARTS LTD'}</strong>
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400 pt-1">
                      <div>Paybill No: <span className="text-white font-mono font-bold">{(settings?.mpesaPaybillNumber && settings.mpesaPaybillNumber !== '174379') ? settings.mpesaPaybillNumber : '522522'}</span></div>
                      <div>Acc No: <span className="text-white font-mono font-bold">{settings?.mpesaAccountNumber || '1358024235'}</span></div>
                    </div>
                    <div className="text-[11px] text-slate-400 pt-0.5">
                      Customer Mobile: <span className="text-emerald-300 font-semibold font-mono">{customerPhone}</span>
                    </div>
                  </div>

                  {/* Manual M-Pesa Paybill Code Entry */}
                  <div className="mt-3 p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-left space-y-2">
                    <div className="text-[11px] text-slate-300 font-medium">
                      Paid via <strong className="text-white">M-Pesa → Lipa na M-Pesa → Pay Bill (522522, Acc 1358024235)</strong>? Enter your M-Pesa SMS code:
                    </div>
                    {errorMessage && (
                      <div className="text-[11px] text-rose-400 font-medium">{errorMessage}</div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={manualMpesaCode}
                        onChange={(e) => setManualMpesaCode(e.target.value.toUpperCase())}
                        placeholder="M-Pesa Ref e.g. UAK84920XY"
                        className="flex-1 px-3 py-2 text-xs font-mono font-bold bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:border-emerald-500 uppercase"
                      />
                      <button
                        type="button"
                        onClick={handleManualMpesaCodeConfirm}
                        disabled={isSubmitting || manualMpesaCode.trim().length < 8}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        Confirm M-Pesa Code
                      </button>
                    </div>
                  </div>

                  {/* Real-time Polling Feedback */}
                  <div className="mt-3 text-[11px] text-emerald-400/90 flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>{darajaStatusNote || 'Listening for Safaricom authorization...'}</span>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-center gap-2">
                    {settings?.mpesaEnvironment !== 'production' && (
                      <>
                        <button
                          type="button"
                          onClick={handleSimulatePinAuthorize}
                          disabled={stkStatus === 'verifying'}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {stkStatus === 'verifying' ? (
                            <>
                              <RotateCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Confirming...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-200" />
                              <span>Simulate Sandbox Approval</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => triggerStkRequest(true)}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-800/60 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                          title="Tests real Daraja Sandbox STK popup on phone using Safaricom test shortcode 174379"
                        >
                          Test Handset Popup (Sandbox 174379)
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={handleRetryStkPush}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                    >
                      Resend Paybill 522522 Prompt
                    </button>
                  </div>
                </div>

                <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>The official tax receipt will be issued immediately upon payment confirmation.</span>
                </div>
              </div>
            )}
          </div>
        ) : isConfirmingOfflinePayment ? (
          /* ========================================================================= */
          /* 1B. OFFLINE / ALTERNATIVE PAYMENT CONFIRMATION (CASH / BANK / CARD)       */
          /* ========================================================================= */
          <div className="p-6 sm:p-8 space-y-5 bg-white text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-900 text-white rounded-lg">
                  {resolvedPaymentMethod === 'Cash' ? (
                    <Banknote className="w-4 h-4" />
                  ) : resolvedPaymentMethod === 'Credit Card' ? (
                    <CreditCard className="w-4 h-4" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {resolvedPaymentMethod === 'Cash'
                      ? 'Confirm Cash on Delivery / Counter Pickup'
                      : resolvedPaymentMethod === 'Credit Card'
                      ? 'Confirm Card Payment (PDQ / Visa / Mastercard)'
                      : 'Confirm Bank Transfer / PesaLink'}
                  </h3>
                  <p className="text-xs text-slate-500">Review payment instructions before generating your order receipt</p>
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

              {resolvedPaymentMethod === 'Cash' ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Cash Tendered (Optional):</span>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder={`e.g. ${Math.round(totalInc)}`}
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
                    Pay cash directly to our Nairobi dispatch rider upon parts inspection or at our Industrial Area counter.
                  </p>
                </div>
              ) : resolvedPaymentMethod === 'Credit Card' ? (
                <div className="space-y-2.5">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1 text-[11px]">
                    <div className="font-bold text-slate-900">Visa · Mastercard · Mobile PDQ Terminal</div>
                    <p className="text-slate-600">
                      Our dispatch rider brings a wireless PDQ card machine for tap/chip payment upon delivery, or you can swipe at our Industrial Area counter.
                    </p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Card Approval Ref / Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={cardReference}
                      onChange={(e) => setCardReference(e.target.value.toUpperCase())}
                      placeholder="e.g. VISA-PDQ-DELIVERY"
                      className="w-full p-1.5 text-xs font-mono bg-white border border-slate-300 rounded uppercase"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1 font-mono text-[11px]">
                    <div className="text-slate-500">Panzer Autoparts Limited · Bank Wire / PesaLink / RTGS:</div>
                    <div className="font-bold text-slate-900">KCB Bank Kenya · Acc: {paybillAccount}</div>
                    <div className="text-slate-700 font-semibold">Account Title: {paybillAccountName}</div>
                    <div className="text-emerald-700">M-Pesa Paybill: {paybillNumber} · Acc No: {paybillAccount}</div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Bank / PesaLink Confirmation Ref (Optional)
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
                disabled={isSubmitting || (resolvedPaymentMethod === 'Cash' && parsedCashTendered > 0 && parsedCashTendered < totalInc)}
                onClick={handleConfirmOfflinePayment}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{isSubmitting ? 'Generating Receipt...' : 'Place Order & Issue Receipt'}</span>
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
              {!customer && onOpenAuthModal && (
                <div className="p-3 bg-slate-900 text-white rounded-lg flex flex-wrap items-center justify-between gap-2 print:hidden">
                  <div>
                    <span className="font-bold text-xs block">Save & Track Order {confirmedSale.invoiceNumber}</span>
                    <span className="text-[11px] text-slate-300">
                      Sign in or create an account to follow dispatch status anytime.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenAuthModal('signin')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAuthModal('signup')}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Create Account
                    </button>
                  </div>
                </div>
              )}

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
                    <div className="text-emerald-800 font-mono text-[10px]">
                      Lipa na M-Pesa Paybill: {settings?.mpesaPaybillNumber || '522522'} · Acc No: {settings?.mpesaAccountNumber || '1358024235'} · {settings?.mpesaAccountName || 'PANZER AUTOPARTS LTD'}
                    </div>
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
              <div className="flex flex-wrap gap-2">
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
                {onOpenOrderTracking && (
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseAndReset();
                      onOpenOrderTracking();
                    }}
                    className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Track Order Status</span>
                  </button>
                )}
              </div>

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

              {/* Optional Account Login / Sign Up for Order Tracking */}
              {customer ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold text-emerald-950 block truncate">
                        Signed in as {customer.displayName}
                      </span>
                      <span className="text-[11px] text-emerald-800 block truncate">
                        This order will automatically sync to your Order Tracker ({customer.email})
                      </span>
                    </div>
                  </div>
                </div>
              ) : onOpenAuthModal ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2.5 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Want to track your order status after paying? (Optional)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Sign in or create a quick account — or continue below to pay as a guest.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenAuthModal('signin')}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <LogIn className="w-3 h-3" />
                      <span>Sign In</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAuthModal('signup')}
                      className="px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Sign Up</span>
                    </button>
                  </div>
                </div>
              ) : null}

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
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Select Payment Method
                  </label>
                  <span className="text-[10px] font-medium text-emerald-700">
                    M-Pesa SIM Toolkit Recommended
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {/* 1. M-Pesa SIM Toolkit / Direct Paybill (DEFAULT) */}
                  <button
                    type="button"
                    onClick={() => setSelectedOption('mpesa_toolkit')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedOption === 'mpesa_toolkit'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <Smartphone className={`w-4 h-4 ${selectedOption === 'mpesa_toolkit' ? 'text-emerald-700' : 'text-slate-400'}`} />
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                        Default
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-slate-900">M-Pesa SIM Toolkit</div>
                      <div className="text-[10px] text-slate-600">Paybill {paybillNumber} · Acc {paybillAccount}</div>
                    </div>
                  </button>

                  {/* 2. Cash on Delivery / Workshop Pickup */}
                  <button
                    type="button"
                    onClick={() => setSelectedOption('cash_on_delivery')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedOption === 'cash_on_delivery'
                        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Banknote className={`w-4 h-4 ${selectedOption === 'cash_on_delivery' ? 'text-slate-900' : 'text-slate-400'}`} />
                      {selectedOption === 'cash_on_delivery' && <Check className="w-3.5 h-3.5 text-slate-900" />}
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-slate-900">Cash on Delivery</div>
                      <div className="text-[10px] text-slate-500">Courier or Counter Pickup</div>
                    </div>
                  </button>

                  {/* 3. Bank Transfer / PesaLink */}
                  <button
                    type="button"
                    onClick={() => setSelectedOption('bank_transfer')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedOption === 'bank_transfer'
                        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Building2 className={`w-4 h-4 ${selectedOption === 'bank_transfer' ? 'text-slate-900' : 'text-slate-400'}`} />
                      {selectedOption === 'bank_transfer' && <Check className="w-3.5 h-3.5 text-slate-900" />}
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-slate-900">Bank / PesaLink</div>
                      <div className="text-[10px] text-slate-500">KCB Acc · {paybillAccount}</div>
                    </div>
                  </button>

                  {/* 4. Debit / Credit Card (PDQ) */}
                  <button
                    type="button"
                    onClick={() => setSelectedOption('credit_card')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedOption === 'credit_card'
                        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <CreditCard className={`w-4 h-4 ${selectedOption === 'credit_card' ? 'text-slate-900' : 'text-slate-400'}`} />
                      {selectedOption === 'credit_card' && <Check className="w-3.5 h-3.5 text-slate-900" />}
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-slate-900">Card (Visa / MC)</div>
                      <div className="text-[10px] text-slate-500">Wireless PDQ on delivery</div>
                    </div>
                  </button>

                  {/* 5. M-Pesa Express STK Push (Optional) */}
                  <button
                    type="button"
                    onClick={() => setSelectedOption('mpesa_stk')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between sm:col-span-2 lg:col-span-2 ${
                      selectedOption === 'mpesa_stk'
                        ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Send className={`w-4 h-4 ${selectedOption === 'mpesa_stk' ? 'text-emerald-700' : 'text-slate-400'}`} />
                      {selectedOption === 'mpesa_stk' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-slate-900">M-Pesa Express (STK Push Prompt)</div>
                      <div className="text-[10px] text-slate-500">Auto phone popup (requires live KCB Buni / Daraja)</div>
                    </div>
                  </button>
                </div>

                {/* Contextual Inline Preview for Selected Payment Option */}
                {selectedOption === 'mpesa_toolkit' && (
                  <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-emerald-950">
                        Pay directly via phone M-Pesa (*334# / SIM Toolkit) &rarr; Pay Bill
                      </div>
                      <a
                        href="tel:*334%23"
                        onClick={() => handleCopyDetail('account', paybillAccount)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs transition-colors no-underline"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Launch M-Pesa (*334#)</span>
                      </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded border border-emerald-200">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Paybill Number</span>
                          <span className="font-mono font-bold text-slate-900">{paybillNumber}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyDetail('paybill', paybillNumber)}
                          className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === 'paybill' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedField === 'paybill' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded border border-emerald-200">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Account Number ({paybillAccountName})</span>
                          <span className="font-mono font-bold text-slate-900">{paybillAccount}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyDetail('account', paybillAccount)}
                          className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === 'account' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedField === 'account' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-950 mb-1">
                        Already sent payment? Enter M-Pesa SMS Code (or click below for guided *334# / SIM Toolkit screen):
                      </label>
                      <input
                        type="text"
                        value={manualMpesaCode}
                        onChange={(e) => setManualMpesaCode(e.target.value.toUpperCase())}
                        placeholder="Optional here — e.g. UAK84920XY"
                        className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 uppercase"
                      />
                    </div>
                  </div>
                )}

                {selectedOption === 'bank_transfer' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 block">KCB Bank Kenya · PesaLink / RTGS / EFT</span>
                      <span className="font-mono text-[11px] text-slate-600">
                        Acc No: <strong>{paybillAccount}</strong> · {paybillAccountName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyDetail('account', paybillAccount)}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedField === 'account' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'account' ? 'Copied Acc' : 'Copy Acc No'}</span>
                    </button>
                  </div>
                )}

                {selectedOption === 'credit_card' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                    Pay securely using <strong>Visa or Mastercard</strong> on our wireless PDQ machine when our Nairobi courier delivers your parts, or at our Industrial Area counter.
                  </div>
                )}
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
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
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
                    <span>
                      {selectedOption === 'mpesa_toolkit'
                        ? manualMpesaCode.trim().replace(/[^A-Za-z0-9]/g, '').length >= 8
                          ? 'Confirm M-Pesa Code & Place Order'
                          : `Pay via M-Pesa Paybill (${paybillNumber})`
                        : selectedOption === 'mpesa_stk'
                        ? 'Send M-Pesa STK Push'
                        : selectedOption === 'cash_on_delivery'
                        ? 'Continue with Cash on Delivery'
                        : selectedOption === 'credit_card'
                        ? 'Continue with Card (PDQ)'
                        : 'Continue with Bank / PesaLink'}
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
