import React, { useState } from 'react';
import { SparePart } from '../../types/inventory';
import { formatCurrency } from '../../utils/calculations';
import { ShoppingBag, Eye, Check, AlertTriangle, Package, ShieldCheck } from 'lucide-react';

interface ProductCardProps {
  part: SparePart;
  currencySymbol: string;
  onAddToCart: (part: SparePart, quantity: number) => void;
  onQuickView: (part: SparePart) => void;
  cartQuantity: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  part,
  currencySymbol,
  onAddToCart,
  onQuickView,
  cartQuantity,
}) => {
  const [imageError, setImageError] = useState(false);
  const [addedAnim, setAddedAnim] = useState(false);

  const isOutOfStock = part.stockQuantity <= 0;
  const isLowStock = !isOutOfStock && part.stockQuantity <= part.minStockLevel;
  const isAvailable = part.stockQuantity > cartQuantity;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock || !isAvailable) return;
    onAddToCart(part, 1);
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 1200);
  };

  // Category fallback iconography / colors
  const getCategoryFallback = () => {
    switch (part.category) {
      case 'Braking':
        return 'Braking Component';
      case 'Filtration':
        return 'Precision Filtration';
      case 'Electrical':
        return 'Rotating Electrical';
      case 'Suspension':
        return 'Chassis Suspension';
      case 'Cooling':
        return 'Thermal Management';
      case 'Transmission':
        return 'Drivetrain & Clutch';
      default:
        return 'Automotive Hardware';
    }
  };

  return (
    <div
      onClick={() => onQuickView(part)}
      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col group cursor-pointer"
    >
      {/* Product Image Frame */}
      <div className="relative w-full aspect-4/3 bg-slate-100 overflow-hidden flex items-center justify-center">
        {part.imageUrl && !imageError ? (
          <img
            src={part.imageUrl}
            alt={part.description}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-100 to-slate-200/80">
            <Package className="w-10 h-10 text-slate-400 mb-2 stroke-1" />
            <span className="text-xs font-semibold text-slate-700">{getCategoryFallback()}</span>
            <span className="text-[11px] font-mono text-slate-500 mt-0.5">{part.partNumber}</span>
          </div>
        )}

        {/* Quick View Floating Overlay Button */}
        <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(part);
            }}
            className="px-3 py-1.5 bg-white/95 text-slate-900 rounded-lg text-xs font-semibold shadow-sm hover:bg-white flex items-center gap-1.5 transition-transform scale-95 group-hover:scale-100"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Specifications</span>
          </button>
        </div>

        {/* Stock Badge */}
        <div className="absolute top-2.5 right-2.5">
          {isOutOfStock ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white rounded">
              Out of Stock
            </span>
          ) : isLowStock ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500 text-white rounded">
              Only {part.stockQuantity} Left
            </span>
          ) : (
            <span className="text-[10px] font-medium px-2 py-0.5 bg-white/90 backdrop-blur-xs text-slate-700 rounded border border-slate-200">
              In Stock ({part.stockQuantity})
            </span>
          )}
        </div>
      </div>

      {/* Product Information Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Metadata line without pills */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <span>{part.category}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{part.partNumber}</span>
            {part.supplier && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate max-w-[120px]">{part.supplier}</span>
              </>
            )}
          </div>

          {/* Part Title */}
          <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-slate-800 transition-colors">
            {part.description}
          </h3>

          {/* Vehicle Compatibility */}
          {part.vehicleCompatibility && (
            <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">
              Fits: <strong className="text-slate-700 font-normal">{part.vehicleCompatibility}</strong>
            </div>
          )}

          {/* OEM Cross Reference */}
          {part.oemReference && (
            <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
              OEM: {part.oemReference}
            </div>
          )}
        </div>

        {/* Pricing & Add To Cart Button */}
        <div className="pt-3 border-t border-slate-100 flex items-end justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-0.5">
              Selling Price (Inc 16% VAT)
            </span>
            <div className="text-base sm:text-lg font-black text-slate-900 font-mono tabular-nums leading-none">
              {formatCurrency(part.retailPriceInc, currencySymbol)}
            </div>
            <div className="text-[10px] text-slate-600 mt-1 font-mono tabular-nums flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-emerald-700">Landed: {formatCurrency(part.unitCostLanded, currencySymbol)}</span>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500">Ex-VAT: {formatCurrency(part.retailPriceEx, currencySymbol)}</span>
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={isOutOfStock || !isAvailable}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              isOutOfStock
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : addedAnim
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
            }`}
          >
            {addedAnim ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
