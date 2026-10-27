import React, { useState } from 'react';
import { SparePart } from '../../types/inventory';
import { formatCurrency } from '../../utils/calculations';
import { X, ShoppingBag, Check, ShieldCheck, Truck, Package, Building2, Wrench } from 'lucide-react';

interface ProductDetailModalProps {
  part: SparePart | null;
  isOpen: boolean;
  onClose: () => void;
  currencySymbol: string;
  onAddToCart: (part: SparePart, quantity: number) => void;
  cartQuantity: number;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  part,
  isOpen,
  onClose,
  currencySymbol,
  onAddToCart,
  cartQuantity,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [imageError, setImageError] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  if (!isOpen || !part) return null;

  const isOutOfStock = part.stockQuantity <= 0;
  const remainingStock = Math.max(0, part.stockQuantity - cartQuantity);

  const handleAddToCart = () => {
    if (isOutOfStock || remainingStock <= 0) return;
    onAddToCart(part, quantity);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>{part.category}</span>
            <span aria-hidden="true">·</span>
            <span>Part #{part.partNumber}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 max-h-[80vh] overflow-y-auto">
          {/* Left Column: Product Photo & Trust Badges */}
          <div className="md:col-span-6 space-y-4">
            <div className="w-full aspect-4/3 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center relative">
              {part.imageUrl && !imageError ? (
                <img
                  src={part.imageUrl}
                  alt={part.description}
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-50 to-slate-200">
                  <Package className="w-16 h-16 text-slate-400 mb-2 stroke-1" />
                  <span className="text-sm font-semibold text-slate-800">{part.category} Spare</span>
                  <span className="text-xs font-mono text-slate-500 mt-1">{part.partNumber}</span>
                </div>
              )}

              {/* Stock Indicator */}
              <div className="absolute top-3 left-3">
                {isOutOfStock ? (
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-900 text-white rounded">
                    Out of Stock
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2.5 py-1 bg-white/95 backdrop-blur-xs text-slate-800 rounded border border-slate-200 shadow-xs">
                    {part.stockQuantity} units in stock (Nairobi Hub)
                  </span>
                )}
              </div>
            </div>

            {/* Quick Guarantees */}
            <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>100% Genuine OEM or Certified Tier-1 Aftermarket</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Immediate pickup in Nairobi Industrial Area or express courier</span>
              </div>
            </div>
          </div>

          {/* Right Column: Specifications & Purchasing Controls */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-snug">
                {part.description}
              </h2>

              {/* Price & Landed Cost Breakdown Display */}
              <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">Selling Price</span>
                    <div className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                      {formatCurrency(part.retailPriceInc, currencySymbol)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 block">Total Landed Cost</span>
                    <div className="text-lg font-bold text-emerald-800 font-mono tabular-nums">
                      {formatCurrency(part.unitCostLanded, currencySymbol)}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-mono">
                  <div>
                    <span className="text-slate-400">FOB Port Sourcing:</span> ${part.unitCostFobUsd.toFixed(2)} USD
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Conversion Baseline:</span> 1 USD = 130 KSh
                  </div>
                  <div className="col-span-2 text-[10px] text-slate-500 italic">
                    * Landed Cost includes FOB sourcing + Air/Sea Freight + KRA Import Duty (25%) + Railway Development Levy (2%) + Port & ICD handling.
                  </div>
                </div>
              </div>

              {/* Specifications Table */}
              <div className="mt-4 border-t border-slate-100 pt-3 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Part Number</span>
                  <span className="font-mono font-bold text-slate-900">{part.partNumber}</span>
                </div>

                {part.oemReference && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">OEM Cross-Ref</span>
                    <span className="font-mono text-slate-800 text-right max-w-[200px] truncate">{part.oemReference}</span>
                  </div>
                )}

                {part.vehicleCompatibility && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Vehicle Fitment</span>
                    <span className="text-slate-900 font-medium text-right max-w-[220px]">{part.vehicleCompatibility}</span>
                  </div>
                )}

                {part.supplier && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Vendor / Sourcing</span>
                    <span className="text-slate-800">{part.supplier}</span>
                  </div>
                )}

                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Warehouse Location</span>
                  <span className="font-mono text-slate-600">{part.location || 'Central Depot'}</span>
                </div>
              </div>
            </div>

            {/* Purchase CTA module */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Quantity</span>
                <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="px-3 py-1 text-slate-600 hover:bg-slate-200 disabled:opacity-40 cursor-pointer font-bold"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 text-xs font-mono font-bold text-slate-900 bg-white min-w-[32px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(remainingStock, quantity + 1))}
                    disabled={quantity >= remainingStock}
                    className="px-3 py-1 text-slate-600 hover:bg-slate-200 disabled:opacity-40 cursor-pointer font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || remainingStock <= 0}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                    isOutOfStock || remainingStock <= 0
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : addedSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {addedSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Added to Cart!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Add to Shopping Cart ({formatCurrency(part.retailPriceInc * quantity, currencySymbol)})</span>
                    </>
                  )}
                </button>
              </div>

              {cartQuantity > 0 && (
                <div className="text-[11px] text-center text-slate-500 font-mono">
                  You already have {cartQuantity} unit(s) of this part in your cart.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
