import React, { useState, useMemo } from 'react';
import { SparePart } from '../../types/inventory';
import { ProductCard } from './ProductCard';
import { Search, ArrowUpDown, X, Package, Loader2 } from 'lucide-react';

interface StorefrontCatalogProps {
  parts: SparePart[];
  isLoading?: boolean;
  currencySymbol: string;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddToCart: (part: SparePart, quantity: number) => void;
  onQuickView: (part: SparePart) => void;
  cartQuantities: Record<string, number>;
}

export const StorefrontCatalog: React.FC<StorefrontCatalogProps> = ({
  parts,
  isLoading = false,
  currencySymbol,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onAddToCart,
  onQuickView,
  cartQuantities,
}) => {
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');

  // Filter parts
  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      // Category filter
      if (selectedCategory !== 'ALL' && part.category !== selectedCategory) {
        return false;
      }
      // Stock filter
      if (inStockOnly && part.stockQuantity <= 0) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNumber = part.partNumber.toLowerCase().includes(q);
        const matchDesc = part.description.toLowerCase().includes(q);
        const matchOem = part.oemReference?.toLowerCase().includes(q) || false;
        const matchVehicle = part.vehicleCompatibility?.toLowerCase().includes(q) || false;
        const matchSupplier = part.supplier?.toLowerCase().includes(q) || false;
        const matchCat = part.category.toLowerCase().includes(q);

        return matchNumber || matchDesc || matchOem || matchVehicle || matchSupplier || matchCat;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.retailPriceInc - b.retailPriceInc;
      if (sortBy === 'price-desc') return b.retailPriceInc - a.retailPriceInc;
      if (sortBy === 'name') return a.description.localeCompare(b.description);
      // default: in stock first
      return (b.stockQuantity > 0 ? 1 : 0) - (a.stockQuantity > 0 ? 1 : 0);
    });
  }, [parts, selectedCategory, inStockOnly, searchQuery, sortBy]);

  return (
    <div id="catalog-section" className="py-4 sm:py-6 space-y-5 sm:space-y-6">
      {/* Clean Search Bar & Filters followed by Products */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search parts by name, OEM #, or Range Rover model..."
            className="w-full text-sm pl-10 pr-10 min-h-[42px] bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-2 rounded-md cursor-pointer transition-colors"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap text-xs">
          <span className="text-slate-500 px-1 whitespace-nowrap">
            <strong className="text-slate-900 font-mono">{filteredParts.length}</strong> parts
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setInStockOnly((v) => !v)}
              className={`px-3 min-h-[40px] rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                inStockOnly
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              In Stock Only
            </button>

            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 min-h-[40px] text-xs shadow-2xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'featured' | 'price-asc' | 'price-desc' | 'name')}
                aria-label="Sort spare parts"
                className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer py-1"
              >
                <option value="featured">Featured / In Stock</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>

            {(searchQuery || selectedCategory !== 'ALL' || inStockOnly) && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  onSelectCategory('ALL');
                  setInStockOnly(false);
                }}
                className="px-3 min-h-[40px] text-xs text-rose-600 hover:text-rose-700 bg-white border border-slate-200 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Grid / Loading State */}
      {isLoading && parts.length === 0 ? (
        <div className="space-y-5">
          <div className="flex items-center justify-center gap-2.5 py-2 text-xs sm:text-sm font-medium text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
            <span>Loading genuine spare parts catalogue...</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col animate-pulse"
              >
                <div className="w-full aspect-4/3 bg-slate-100 border-b border-slate-100 relative">
                  <div className="absolute top-2.5 right-2.5 h-5 w-20 bg-slate-200/80 rounded" />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="h-3 w-28 bg-slate-200 rounded" />
                    <div className="h-4 w-full bg-slate-200 rounded" />
                    <div className="h-4 w-3/4 bg-slate-100 rounded" />
                    <div className="h-3 w-2/3 bg-slate-100 rounded" />
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-end justify-between gap-2">
                    <div className="space-y-1.5">
                      <div className="h-2.5 w-16 bg-slate-200 rounded" />
                      <div className="h-5 w-24 bg-slate-200 rounded" />
                    </div>
                    <div className="h-10 w-20 bg-slate-200 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : parts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center max-w-md mx-auto my-8">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-1" />
          <h3 className="text-base font-bold text-slate-900">Catalogue Updating Soon</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            New genuine Range Rover spare parts are being added to our Nairobi hub inventory. Please check back shortly or contact our parts desk for direct assistance.
          </p>
        </div>
      ) : filteredParts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 sm:p-12 text-center max-w-md mx-auto my-8">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-1" />
          <h3 className="text-base font-bold text-slate-900">No matching spare parts found</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            We couldn't find any parts matching your current vehicle filter or search term. Try searching by OEM number, part category, or resetting filters.
          </p>
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onSelectCategory('ALL');
              setInStockOnly(false);
            }}
            className="mt-4 px-4 min-h-[40px] text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            View All Parts
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredParts.map((part) => (
            <ProductCard
              key={part.id}
              part={part}
              currencySymbol={currencySymbol}
              onAddToCart={onAddToCart}
              onQuickView={onQuickView}
              cartQuantity={cartQuantities[part.id] || 0}
            />
          ))}
        </div>
      )}
    </div>
  );
};
