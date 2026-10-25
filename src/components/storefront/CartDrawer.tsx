import React from 'react';
import { SparePart } from '../../types/inventory';
import { formatCurrency } from '../../utils/calculations';
import { X, Trash2, ArrowRight, ShoppingBag, Package } from 'lucide-react';

export interface CartItem {
  part: SparePart;
  quantity: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (partId: string, delta: number) => void;
  onRemoveItem: (partId: string) => void;
  onProceedToCheckout: () => void;
  currencySymbol: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  currencySymbol,
}) => {
  if (!isOpen) return null;

  const totalInc = items.reduce((sum, item) => sum + (item?.part?.retailPriceInc || 0) * (item?.quantity || 0), 0);
  const totalEx = items.reduce((sum, item) => sum + (item?.part?.retailPriceEx || 0) * (item?.quantity || 0), 0);
  const vatAmount = totalInc - totalEx;
  const totalUnits = items.reduce((sum, item) => sum + (item?.quantity || 0), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Your Shopping Cart</h2>
                <p className="text-xs text-slate-500 font-mono">{totalUnits} total unit(s)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-3 stroke-1 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">Your cart is empty</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Browse our auto spare parts catalog to select genuine components for your vehicle.
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Explore Spare Parts
                </button>
              </div>
            ) : (
              items.filter((it) => it && it.part).map(({ part, quantity }) => {
                const lineTotal = (part.retailPriceInc || 0) * (quantity || 1);
                return (
                  <div
                    key={part.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex gap-3 items-center"
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {part.imageUrl ? (
                        <img
                          src={part.imageUrl}
                          alt={part.description}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400 stroke-1" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono font-bold text-slate-900 truncate">
                        {part.partNumber}
                      </div>
                      <div className="text-xs text-slate-700 truncate font-medium">
                        {part.description}
                      </div>
                      <div className="text-[11px] font-mono text-slate-900 font-bold mt-1">
                        {formatCurrency(part.retailPriceInc, currencySymbol)} each
                      </div>
                    </div>

                    {/* Stepper & Total */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center border border-slate-300 rounded-md bg-white overflow-hidden">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(part.id, -1)}
                          className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer font-bold"
                        >
                          -
                        </button>
                        <span className="px-2 py-0.5 text-xs font-mono font-bold text-slate-900">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(part.id, 1)}
                          disabled={quantity >= part.stockQuantity}
                          className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer font-bold"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-slate-900 tabular-nums">
                          {formatCurrency(lineTotal, currencySymbol)}
                        </span>
                        <button
                          onClick={() => onRemoveItem(part.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout Action */}
          {items.length > 0 && (
            <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500 font-mono">
                  <span>Goods Subtotal (Ex-VAT)</span>
                  <span className="tabular-nums">{formatCurrency(totalEx, currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-mono">
                  <span>16% VAT Tax Portion</span>
                  <span className="tabular-nums">{formatCurrency(vatAmount, currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200 font-mono">
                  <span>Order Grand Total (Inc-VAT)</span>
                  <span className="tabular-nums text-base">{formatCurrency(totalInc, currencySymbol)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onProceedToCheckout}
                className="w-full py-3 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>Proceed to Order Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[10px] text-center text-slate-400">
                Payment on delivery, M-Pesa, or direct bank transfer accepted upon dispatch.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
