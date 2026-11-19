import React, { useState, useEffect } from 'react';
import { SparePart } from '../../types/inventory';
import { formatCurrency } from '../../utils/calculations';
import { X, ShoppingBag, Check, ShieldCheck, Truck, Package } from 'lucide-react';

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

  useEffect(() => {
    setImageError(false);
    setQuantity(1);
    setAddedSuccess(false);
  }, [part?.id, part?.imageUrl]);

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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono truncate">
            <span>{part.category}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">Part #{part.partNumber}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close specifications"
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 flex-1 overflow-y-auto">
          {/* Left Column: Product Photo & Trust Badges */}
          <div className="md:col-span-6 space-y-4">
            <div className="w-full aspect-4/3 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center relative p-3">
              {part.imageUrl && !imageError ? (
                <img
                  src={part.imageUrl}
                  alt={part.description}
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg w-full h-full">
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

              {/* Customer Retail Price Display */}
              <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                      Retail Price (VAT Inclusive)
                    </span>
                    <div className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                      {formatCurrency(part.retailPriceInc, currencySymbol)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-emerald-700 block">
                      {isOutOfStock ? 'Restocking Soon' : 'In Stock · Nairobi Hub'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono block">
                      Ex-VAT: {formatCurrency(part.retailPriceEx, currencySymbol)}
                    </span>
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
                    aria-label="Decrease quantity"
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-40 cursor-pointer font-bold"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 text-xs font-mono font-bold text-slate-900 bg-white min-w-[36px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(remainingStock, quantity + 1))}
                    disabled={quantity >= remainingStock}
                    aria-label="Increase quantity"
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-40 cursor-pointer font-bold"
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
                  className={`flex-1 min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
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
                      <span>Add to Cart ({formatCurrency(part.retailPriceInc * quantity, currencySymbol)})</span>
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
