import React, { useState, useEffect, useMemo } from 'react';
import { SparePart, SaleRecord, SaleItem } from '../types/inventory';
import { formatCurrency, calculateIncFromEx, calculateExFromInc } from '../utils/calculations';
import { 
  X, 
  ShoppingCart, 
  Search, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Receipt, 
  DollarSign,
  User,
  Car,
  FileText
} from 'lucide-react';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts: SparePart[];
  currencySymbol: string;
  defaultTaxRate: number;
  initialPart?: SparePart | null;
  onCompleteSale: (sale: Omit<SaleRecord, 'id' | 'invoiceNumber' | 'timestamp'>) => void;
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
  onCompleteSale,
}) => {
  const [cart, setCart] = useState<CartItemState[]>([]);
  const [partSearch, setPartSearch] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehicleRef, setVehicleRef] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<SaleRecord['paymentMethod']>('Mobile Money');
  const [mpesaReceiptCode, setMpesaReceiptCode] = useState('');
  const [cashTendered, setCashTendered] = useState('');
  const [salesPerson, setSalesPerson] = useState('Carl (Lead Counter)');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      mpesaReceiptNumber: paymentMethod === 'Mobile Money' ? (mpesaReceiptCode.trim() || `SHB${Math.floor(10000 + Math.random() * 90000)}KZ`) : undefined,
      salesPerson,
      notes: notes.trim() || (paymentMethod === 'Cash' && cashTendered ? `Tendered: KSh ${cashTendered}` : undefined),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-lg">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Spare Parts Sale (POS)</h2>
              <p className="text-xs text-slate-500">
                Instantly deduct inventory in real-time and post to sales ledger
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
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
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
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
                placeholder="e.g. Hilux 2.8 KDC-109Z"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method (Kenya Standard)
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer font-medium"
              >
                <option value="Mobile Money">Lipa na M-Pesa (STK Push Prompt)</option>
                <option value="Cash">Cash (Counter Cash / On-Delivery)</option>
                <option value="Bank Transfer">Bank Wire / RTGS / EFT</option>
                <option value="Credit Card">Debit / Credit Card</option>
                <option value="Store Credit">Store Credit / Account</option>
              </select>
            </div>
          </div>

          {/* M-Pesa or Cash contextual helper in POS */}
          {paymentMethod === 'Mobile Money' ? (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-emerald-900 block">M-Pesa STK Push Simulation</span>
                <span className="text-[11px] text-emerald-700">Till: 849204 · Dispatches prompt directly to customer's mobile</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={mpesaReceiptCode}
                  onChange={(e) => setMpesaReceiptCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SHB91024KZ"
                  className="px-2.5 py-1 text-xs font-mono font-bold bg-white border border-emerald-300 rounded focus:outline-none uppercase w-32"
                />
                <button
                  type="button"
                  onClick={() => setMpesaReceiptCode(`SHB${Math.floor(10000 + Math.random() * 90000)}KZ`)}
                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-medium cursor-pointer"
                >
                  Simulate STK Push
                </button>
              </div>
            </div>
          ) : paymentMethod === 'Cash' ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-800">Counter Cash Tendered:</span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder={`Amount e.g. ${Math.ceil(totalInc / 1000) * 1000}`}
                  className="px-2.5 py-1 text-xs font-mono bg-white border border-slate-300 rounded focus:outline-none w-36"
                />
                {parseFloat(cashTendered) > totalInc && (
                  <span className="text-emerald-700 font-mono font-bold">
                    Change Due: {formatCurrency(parseFloat(cashTendered) - totalInc, currencySymbol)}
                  </span>
                )}
              </div>
            </div>
          ) : null}

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
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Total Items: <span className="font-mono font-semibold text-slate-900">{totalUnits} units</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitSale}
              disabled={cart.length === 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Complete Sale & Deduct Stock</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
