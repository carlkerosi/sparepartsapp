import React from 'react';
import { ShoppingBag, Search, Shield, Wrench } from 'lucide-react';
import { formatCurrency } from '../../utils/calculations';

interface StorefrontHeaderProps {
  onDoubleClickLogo: () => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  cartItemCount: number;
  cartTotalAmount: number;
  currencySymbol: string;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const StorefrontHeader: React.FC<StorefrontHeaderProps> = ({
  onDoubleClickLogo,
  selectedCategory,
  onSelectCategory,
  cartItemCount,
  cartTotalAmount,
  currencySymbol,
  onOpenCart,
  searchQuery,
  onSearchChange,
}) => {
  const CATEGORIES = [
    'ALL',
    'Braking',
    'Cooling',
    'Transmission',
    'Filtration',
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top Banner Notice */}
      <div className="bg-slate-900 text-slate-300 px-4 py-1.5 text-[11px] text-center font-medium">
        <span>Range Rover Genuine & OEM Spares · Nairobi Hub & Express Dispatch · Landed Costing in KSh</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single Brand Wordmark with double-click admin access */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onDoubleClick={onDoubleClickLogo}
              title="Panzer Autoparts Limited - Double-click logo for Admin Inventory & Costing"
              className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-sm transition-transform group-hover:scale-105">
                PA
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-slate-800 transition-colors whitespace-nowrap block">
                  Panzer Autoparts Limited
                </span>
                <span className="text-[10px] text-slate-400 group-hover:text-slate-600 transition-colors block">
                  Nairobi, Kenya · Double-click for Admin
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links (single line, whitespace-nowrap) */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto py-1">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => onSelectCategory(cat)}
                  className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 cursor-pointer ${
                    isActive
                      ? 'text-slate-900 border-slate-900 font-semibold'
                      : 'border-transparent text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {cat === 'ALL' ? 'All Catalog' : cat}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Search & Shopping Bag Cart */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Quick Search Input */}
            <div className="relative hidden md:block w-48 xl:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search part #, Vogue, brake pads, water pump..."
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-100 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
              />
            </div>

            {/* Shopping Cart Button */}
            <button
              onClick={onOpenCart}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Cart</span>
              {cartItemCount > 0 && (
                <span className="px-1.5 py-0.2 bg-white text-slate-900 rounded font-mono text-[11px] font-bold">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Discreet Admin shortcut button as an additional friendly affordance */}
            <button
              onClick={onDoubleClickLogo}
              title="Admin Inventory Portal (Access Code Required)"
              className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Admin Portal"
            >
              <Shield className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Category Bar */}
      <div className="lg:hidden border-t border-slate-200/80 px-4 py-2 bg-slate-50 overflow-x-auto flex items-center gap-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-3 py-1 text-xs whitespace-nowrap rounded-md font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            {cat === 'ALL' ? 'All Catalog' : cat}
          </button>
        ))}
      </div>
    </header>
  );
};
