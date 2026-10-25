import React, { useState, useMemo } from 'react';
import { SparePart } from '../../types/inventory';
import { ProductCard } from './ProductCard';
import { Search, Filter, ArrowUpDown, Check, X, SlidersHorizontal, Package } from 'lucide-react';

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

  // Unique categories with counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: parts.length };
    parts.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [parts]);

  const CATEGORIES = [
    'ALL',
    'Braking',
    'Filtration',
    'Electrical',
    'Suspension',
    'Engine',
    'Transmission',
    'Cooling',
  ];

  return (
    <div id="catalog-section" className="py-8 space-y-6">
      {/* Category Pills & Filter Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Automotive Spares Catalog
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span>Showing <strong className="text-slate-800 font-mono">{filteredParts.length}</strong> items</span>
            <span aria-hidden="true">·</span>
            <span>Real-time Nairobi Inventory</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* In-Stock Only Toggle */}
          <button
            onClick={() => setInStockOnly(!inStockOnly)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
              inStockOnly
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center ${inStockOnly ? 'bg-white text-slate-900' : 'border border-slate-300'}`}>
              {inStockOnly && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </div>
            <span>In-Stock Only</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer py-0.5"
            >
              <option value="featured">Featured / Stock First</option>
              <option value="price-asc">Selling Price: Low to High (KSh)</option>
              <option value="price-desc">Selling Price: High to Low (KSh)</option>
              <option value="name">Product Name (A-Z)</option>
            </select>
          </div>

          {/* Reset Filters button if query or filters active */}
          {(searchQuery || selectedCategory !== 'ALL' || inStockOnly) && (
            <button
              onClick={() => {
                onSearchChange('');
                onSelectCategory('ALL');
                setInStockOnly(false);
              }}
              className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Search/Filter Pill Indicator */}
      {searchQuery && (
        <div className="bg-slate-100 px-3.5 py-2 rounded-lg flex items-center justify-between text-xs text-slate-700">
          <span>
            Search results for: <strong>"{searchQuery}"</strong> ({filteredParts.length} matches)
          </span>
          <button
            onClick={() => onSearchChange('')}
            className="text-slate-500 hover:text-slate-900 font-medium cursor-pointer"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Product Grid */}
      {filteredParts.length === 0 ? (
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
