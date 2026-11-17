import React, { useState, useMemo } from 'react';
import { SparePart } from '../../types/inventory';
import { ProductCard } from './ProductCard';
import { Search, ArrowUpDown, X, Package } from 'lucide-react';

interface StorefrontCatalogProps {
  parts: SparePart[];
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
    <div id="catalog-section" className="py-6 space-y-6">
      {/* Clean Search Bar followed by Products */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search parts by name, OEM number, or vehicle model..."
            className="w-full text-sm pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 rounded-md cursor-pointer transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 text-xs">
          <span className="text-slate-500 px-1">
            <strong className="text-slate-900 font-mono">{filteredParts.length}</strong> parts
          </span>

          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="featured">Featured / In Stock</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          {(searchQuery || selectedCategory !== 'ALL' || inStockOnly) && (
            <button
              onClick={() => {
                onSearchChange('');
                onSelectCategory('ALL');
                setInStockOnly(false);
              }}
              className="px-2.5 py-2 text-xs text-rose-600 hover:text-rose-700 bg-white border border-slate-200 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer font-medium"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Product Grid */}
      {parts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-md mx-auto my-8">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-1" />
          <h3 className="text-base font-bold text-slate-900">Inventory Catalogue Ready</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            All demo records have been cleared. You can now add your genuine spare parts and stock levels through the Admin Inventory portal.
          </p>
        </div>
      ) : filteredParts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center max-w-md mx-auto my-8">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-1" />
          <h3 className="text-base font-bold text-slate-900">No matching spare parts found</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            We couldn't find any parts matching your current vehicle filter or search term. Try searching by OEM number, part category, or resetting filters.
          </p>
          <button
            onClick={() => {
              onSearchChange('');
              onSelectCategory('ALL');
              setInStockOnly(false);
            }}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            View All Parts
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
