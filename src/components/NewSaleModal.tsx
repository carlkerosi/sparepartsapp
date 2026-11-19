import React, { useState, useEffect, useMemo } from 'react';
import { SparePart, SaleRecord, SaleItem, InventorySettings } from '../types/inventory';
import { formatCurrency, calculateIncFromEx } from '../utils/calculations';
import {
  X,
  ShoppingCart,
  Search,
  Trash2,
  AlertCircle,
  User,
  Car,
  ShieldCheck,
  Check,
  Smartphone,
} from 'lucide-react';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: SparePart[];
  currencySymbol: string;
  defaultTaxRate: number;
  initialPart?: SparePart | null;
  settings?: InventorySettings;
  onCompleteSale: (sale: Omit<SaleRecord, 'id' | 'invoiceNumber' | 'timestamp'>) => void;
  onOpenMpesaSettings?: () => void;
}

interface CartItemState {
  part: SparePart;
  quantity: number;
  unitPriceEx: number;
  unitPriceInc: number;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  parts,
  currencySymbol,
  defaultTaxRate,
  initialPart,
  settings,
  onCompleteSale,
}) => {
  const [cart, setCart] = useState<CartItemState[]>([]);
  const [partSearch, setPartSearch] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehicleRef, setVehicleRef] = useState('');
  const paymentMethod: SaleRecord['paymentMethod'] = 'Mobile Money';
  const [mpesaReceiptCode, setMpesaReceiptCode] = useState('');
  const salesPerson = 'Panzer Operations (Lead Counter)';
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMpesaConfirmed, setIsMpesaConfirmed] = useState(false);

  // Reset confirmation code state on open
  useEffect(() => {
    if (isOpen) {
      setIsMpesaConfirmed(false);
      setMpesaReceiptCode('');
    }
  }, [isOpen]);

  // Initialize or update with initialPart if passed
  useEffect(() => {
    if (initialPart) {
      setCart([
        {
          part: initialPart,
          quantity: 1,
          unitPriceEx: initialPart.retailPriceEx,
          unitPriceInc: initialPart.retailPriceInc || calculateIncFromEx(initialPart.retailPriceEx, defaultTaxRate),
        },
      ]);
    } else if (isOpen && cart.length === 0) {
      setCart([]);
    }
    setErrorMsg(null);
  }, [initialPart, isOpen]);

  // Search filter for parts selector
  const searchResults = useMemo(() => {
    if (!partSearch.trim()) return [];
    const q = partSearch.toLowerCase();
    return parts
      .filter((p) => {
        return (
          p.partNumber.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.oemReference || '').toLowerCase().includes(q) ||
          (p.vehicleCompatibility || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [parts, partSearch]);

  if (!isOpen) return null;

  // Add item to cart
  const handleAddToCart = (part: SparePart) => {
    if (part.stockQuantity <= 0) {
      setErrorMsg(`Part ${part.partNumber} is out of stock!`);
      return;
    }

    const existingIndex = cart.findIndex((item) => item.part.id === part.id);
    if (existingIndex >= 0) {
      const existing = cart[existingIndex];
      if (existing.quantity + 1 > part.stockQuantity) {
        setErrorMsg(`Cannot sell more than available stock (${part.stockQuantity} units).`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex] = {
        ...existing,
        quantity: existing.quantity + 1,
      };
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          part,
          quantity: 1,
          unitPriceEx: part.retailPriceEx,
          unitPriceInc: part.retailPriceInc || calculateIncFromEx(part.retailPriceEx, defaultTaxRate),
        },
      ]);
    }
    setPartSearch('');
    setErrorMsg(null);
  };

  // Update item quantity
  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const item = cart[index];
    if (newQty > item.part.stockQuantity) {
      setErrorMsg(`Maximum stock available for ${item.part.partNumber} is ${item.part.stockQuantity}.`);
      return;
    }
    const updated = [...cart];
    updated[index] = { ...item, quantity: newQty };
    setCart(updated);
    setErrorMsg(null);
  };

  // Update item price ex
  const handleUpdatePriceEx = (index: number, newEx: number) => {
    const updated = [...cart];
    const newInc = calculateIncFromEx(newEx, defaultTaxRate);
    updated[index] = {
      ...updated[index],
      unitPriceEx: newEx,
      unitPriceInc: newInc,
    };
    setCart(updated);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
  };

  // Calculate totals
  const totalUnits = cart.reduce((acc, it) => acc + it.quantity, 0);
  const subtotalEx = cart.reduce((acc, it) => acc + it.quantity * it.unitPriceEx, 0);
  const totalInc = cart.reduce((acc, it) => acc + it.quantity * it.unitPriceInc, 0);
  const taxAmount = totalInc - subtotalEx;
  const totalCogsLanded = cart.reduce((acc, it) => acc + it.quantity * it.part.unitCostLanded, 0);
  const totalGrossProfit = subtotalEx - totalCogsLanded;
  const marginPercent = subtotalEx > 0 ? (totalGrossProfit / subtotalEx) * 100 : 0;

  // Handle Checkout
  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setErrorMsg('Please select at least one spare part to sell.');
      return;
    }

    // Verify stock availability
    for (const item of cart) {
      if (item.quantity > item.part.stockQuantity) {
        setErrorMsg(`Stock deficit: ${item.part.partNumber} only has ${item.part.stockQuantity} in stock.`);
        return;
      }
    }

    const saleItems: SaleItem[] = cart.map((it) => {
      const lineTotalEx = Number((it.quantity * it.unitPriceEx).toFixed(2));
      const lineTotalInc = Number((it.quantity * it.unitPriceInc).toFixed(2));
      const grossProfit = Number((lineTotalEx - it.quantity * it.part.unitCostLanded).toFixed(2));
      const margin = lineTotalEx > 0 ? (grossProfit / lineTotalEx) * 100 : 0;

      return {
        partId: it.part.id,
        partNumber: it.part.partNumber,
        description: it.part.description,
        quantity: it.quantity,
        unitCostFobUsd: it.part.unitCostFobUsd,
        unitCostLanded: it.part.unitCostLanded,
        unitPriceEx: it.unitPriceEx,
        unitPriceInc: it.unitPriceInc,
        lineTotalEx,
        lineTotalInc,
        grossProfit,
        marginPercent: Number(margin.toFixed(1)),
      };
    });

    const mpesaRef =
      mpesaReceiptCode.trim() ||
      `S${Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 24)]).join('')}${Math.floor(10000 + Math.random() * 90000)}`;

    onCompleteSale({
      customerName: customerName.trim() || 'Walk-in Customer',
      customerPhone: customerPhone.trim() || undefined,
      vehicleRef: vehicleRef.trim() || undefined,
      items: saleItems,
      totalUnits,
      subtotalEx: Number(subtotalEx.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalInc: Number(totalInc.toFixed(2)),
      totalCogsLanded: Number(totalCogsLanded.toFixed(2)),
      totalGrossProfit: Number(totalGrossProfit.toFixed(2)),
      marginPercent: Number(marginPercent.toFixed(1)),
      paymentMethod,
      mpesaReceiptNumber: mpesaRef,
      salesPerson,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[94vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-slate-900 text-white rounded-lg shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">Record Spare Parts Sale (POS)</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Instantly deduct inventory and post to sales ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Part Search and Fast Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Select Spare Parts to Sell
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                placeholder="Type part number, description, or OEM reference to add..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white text-slate-900 transition-colors"
              />
            </div>

            {/* Dropdown Suggestions */}
            {searchResults.length > 0 && (
              <div className="mt-1 bg-white border border-slate-200 rounded-lg shadow-md max-h-56 overflow-y-auto divide-y divide-slate-100 z-10">
                {searchResults.map((part) => (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => handleAddToCart(part)}
                    className="w-full p-2.5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 cursor-pointer text-xs"
                  >
                    <div>
                      <span className="font-mono font-semibold text-slate-900 mr-2">
                        {part.partNumber}
                      </span>
                      <span className="text-slate-600">{part.description}</span>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Landed: {formatCurrency(part.unitCostLanded, currencySymbol)} · Retail Ex: {formatCurrency(part.retailPriceEx, currencySymbol)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono tabular-nums font-bold text-xs">
                        {part.stockQuantity > 0 ? (
                          <span className="text-emerald-700">{part.stockQuantity} in stock</span>
                        ) : (
                          <span className="text-rose-600 font-semibold">Out of Stock</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {part.location || 'Rack'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Sale Items ({cart.length})
              </h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-rose-600 hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-xs">
                <ShoppingCart className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                <span>No parts added yet. Use the search bar above to select parts.</span>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[640px] text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Part # & Details</th>
                      <th className="py-2.5 px-2 text-center w-28">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Landed ({currencySymbol})</th>
                      <th className="py-2.5 px-3 text-right">Selling Ex ({currencySymbol})</th>
                      <th className="py-2.5 px-3 text-right">Selling Inc ({currencySymbol})</th>
                      <th className="py-2.5 px-3 text-right">Line Total Ex ({currencySymbol})</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((item, idx) => {
                      const lineEx = item.quantity * item.unitPriceEx;
                      const lineCogs = item.quantity * item.part.unitCostLanded;
                      const lineProfit = lineEx - lineCogs;

                      return (
                        <tr key={item.part.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <div className="font-mono font-semibold text-slate-900">
                              {item.part.partNumber}
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1">
                              {item.part.description}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Avail: {item.part.stockQuantity} · Loc: {item.part.location}
                            </div>
                          </td>

                          {/* Quantity Editor */}
                          <td className="py-2.5 px-2 text-center">
                            <div className="inline-flex items-center border border-slate-200 rounded bg-white">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(idx, item.quantity - 1)}
                                className="px-2 py-1 text-slate-600 hover:bg-slate-100 cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                max={item.part.stockQuantity}
                                value={item.quantity}
                                onChange={(e) => handleUpdateQuantity(idx, parseInt(e.target.value) || 1)}
                                className="w-10 text-center font-mono tabular-nums text-xs font-semibold focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(idx, item.quantity + 1)}
                                disabled={item.quantity >= item.part.stockQuantity}
                                className="px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Landed Cost */}
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500">
                            {formatCurrency(item.part.unitCostLanded, currencySymbol)}
                          </td>

                          {/* Unit Price Ex */}
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center justify-end">
                              <span className="text-slate-400 text-xs mr-0.5">{currencySymbol}</span>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unitPriceEx}
                                onChange={(e) => handleUpdatePriceEx(idx, parseFloat(e.target.value) || 0)}
                                className="w-20 text-right font-mono tabular-nums text-xs font-semibold p-1 border border-slate-200 rounded focus:ring-1 focus:ring-slate-900 focus:outline-none"
                              />
                            </div>
                          </td>

                          {/* Unit Price Inc */}
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                            {formatCurrency(item.unitPriceInc, currencySymbol)}
                          </td>

                          {/* Line Total Ex & Profit */}
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            <div className="font-semibold text-slate-900">
                              {formatCurrency(lineEx, currencySymbol)}
                            </div>
                            <div className="text-[10px] text-emerald-700 font-medium">
                              +{formatCurrency(lineProfit, currencySymbol)}
                            </div>
                          </td>

                          {/* Remove */}
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Customer & Transaction Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Customer Name</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer / Fleet Name"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-slate-400" />
                <span>Vehicle / Reg / Job #</span>
              </label>
              <input
                type="text"
                value={vehicleRef}
                onChange={(e) => setVehicleRef(e.target.value)}
                placeholder="e.g. Range Rover Vogue L405 KDA 482B"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method (Manual M-Pesa Paybill)
              </label>
              <div className="w-full text-xs p-2 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-lg font-semibold flex items-center justify-between">
                <span>Lipa na M-Pesa · Paybill {(settings?.mpesaPaybillNumber && settings.mpesaPaybillNumber !== '174379') ? settings.mpesaPaybillNumber : '522522'}</span>
                <span className="font-mono text-[11px] text-emerald-800">Acc: {settings?.mpesaAccountNumber || '1358024235'}</span>
              </div>
            </div>
          </div>

          {/* Manual M-Pesa Paybill Confirmation Panel in POS */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-bold text-emerald-950 block">
                    Manual Lipa na M-Pesa Paybill (SIM Toolkit / *334#)
                  </span>
                  <span className="text-[11px] text-emerald-800 block">
                    Paybill: <strong className="font-mono">{(settings?.mpesaPaybillNumber && settings.mpesaPaybillNumber !== '174379') ? settings.mpesaPaybillNumber : '522522'}</strong> · Acc No: <strong className="font-mono">{settings?.mpesaAccountNumber || '1358024235'}</strong> · {settings?.mpesaAccountName || 'PANZER AUTOPARTS LTD'}
                  </span>
                </div>
              </div>
              <span className="font-mono font-bold text-emerald-900">
                Amount: {formatCurrency(totalInc, currencySymbol)}
              </span>
            </div>

            <div className="p-2.5 bg-white border border-emerald-200 rounded-md flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                {isMpesaConfirmed ? (
                  <span className="text-emerald-700 flex items-center gap-1 font-bold">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>M-Pesa Receipt Code Entered</span>
                  </span>
                ) : (
                  <span className="text-slate-700">Enter Customer M-Pesa SMS Confirmation Code:</span>
                )}
              </div>

              <input
                type="text"
                value={mpesaReceiptCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setMpesaReceiptCode(val);
                  setIsMpesaConfirmed(val.trim().length >= 8);
                }}
                placeholder="e.g. UAK84920XY"
                className="px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 uppercase w-full sm:w-44 min-h-[40px]"
              />
            </div>
          </div>

          {/* Optional Customer Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Phone (Optional)
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 0712 345 678"
                className="w-full text-xs p-2.5 min-h-[40px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white font-mono"
              />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">Counter Staff</span>
              <span className="font-semibold text-slate-800">{salesPerson}</span>
            </div>
          </div>

          {/* Real-Time Financial Totals Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Subtotal (Ex-Tax)</span>
                <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                  {formatCurrency(subtotalEx, currencySymbol)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">VAT / Tax ({defaultTaxRate}%)</span>
                <span className="text-sm font-bold font-mono tabular-nums text-slate-700">
                  {formatCurrency(taxAmount, currencySymbol)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Payable (Inc-Tax)</span>
                <span className="text-base font-bold font-mono tabular-nums text-slate-900">
                  {formatCurrency(totalInc, currencySymbol)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Gross Profit Realized</span>
                <span className="text-base font-bold font-mono tabular-nums text-emerald-700">
                  +{formatCurrency(totalGrossProfit, currencySymbol)}{' '}
                  <span className="text-xs font-normal">({marginPercent.toFixed(1)}%)</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs text-slate-500">
            Total Items: <span className="font-mono font-semibold text-slate-900">{totalUnits} units</span>
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[42px] text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitSale}
              disabled={cart.length === 0}
              className="px-5 py-2.5 min-h-[42px] text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Confirm Payment &amp; Issue Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
