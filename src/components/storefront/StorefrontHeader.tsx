import React from 'react';
import { ShoppingBag, Search, Shield, UserCheck, Package } from 'lucide-react';
import { CustomerProfile } from '../../types/inventory';

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
  currentCustomer?: CustomerProfile | null;
  customerOrderCount?: number;
  onOpenAuthModal?: (mode: 'signin' | 'signup') => void;
  onOpenOrderTracking?: () => void;
}

export const StorefrontHeader: React.FC<StorefrontHeaderProps> = ({
  onDoubleClickLogo,
  selectedCategory,
  onSelectCategory,
  cartItemCount,
  currencySymbol: _currencySymbol,
  onOpenCart,
  searchQuery,
  onSearchChange,
  currentCustomer,
  customerOrderCount = 0,
  onOpenAuthModal,
  onOpenOrderTracking,
}) => {
  const CATEGORIES = [
    'ALL',
    'Braking',
    'Cooling',
    'Transmission',
    'Filtration',
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-6 h-14 sm:h-16">
            {/* Zone 1: Single Brand Wordmark with double-click admin access */}
            <div className="flex items-center gap-2 shrink-0 min-w-0">
              <button
                onDoubleClick={onDoubleClickLogo}
                title="Panzer Autoparts Limited - Double-click logo for Admin Inventory & Costing"
                className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer focus:outline-none min-w-0"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs sm:text-sm tracking-wider shadow-xs transition-transform group-hover:scale-105 shrink-0">
                  PA
                </div>
                <div className="min-w-0">
                  <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 group-hover:text-slate-800 transition-colors truncate block">
                    <span className="sm:hidden">Panzer Parts</span>
                    <span className="hidden sm:inline">Panzer Autoparts Limited</span>
                  </span>
                  <span className="hidden sm:block text-[10px] text-slate-400 group-hover:text-slate-600 transition-colors">
                    Nairobi, Kenya · Double-click for Admin
                  </span>
                </div>
              </button>
            </div>

            {/* Zone 2: Desktop Category Navigation Links */}
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
                    {cat === 'ALL' ? 'All Catalogue' : cat}
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: Search, Order Tracking / Client Account & Shopping Bag Cart */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              {/* Quick Search Input */}
              <div className="relative hidden md:block w-44 xl:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search part #, Vogue, brake pads..."
                  className="w-full text-xs pl-8 pr-3 py-2 bg-slate-100 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors"
                />
              </div>

              {/* Client Order Tracking / Optional Sign In Button */}
              {currentCustomer ? (
                <button
                  type="button"
                  onClick={onOpenOrderTracking}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 min-h-[40px] text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  title={`Signed in as ${currentCustomer.email} — Click to track your orders`}
                >
                  <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="max-w-[68px] sm:max-w-[96px] truncate">
                    {currentCustomer.displayName.split(' ')[0]}
                  </span>
                  <span className="text-emerald-700 font-mono text-[11px]">
                    ({customerOrderCount})
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onOpenOrderTracking}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 min-h-[40px] text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="Track an order or view your order history"
                    aria-label="Track Orders"
                  >
                    <Package className="w-4 h-4 text-slate-600 shrink-0" />
                    <span className="hidden sm:inline">Track Orders</span>
                  </button>
                  {onOpenAuthModal && (
                    <button
                      type="button"
                      onClick={() => onOpenAuthModal('signin')}
                      className="inline-flex items-center px-2.5 sm:px-3 min-h-[40px] text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              )}

              {/* Shopping Cart Button */}
              <button
                onClick={onOpenCart}
                aria-label="Open Shopping Cart"
                className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 min-h-[40px] text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span className="hidden xs:inline sm:inline">Cart</span>
                {cartItemCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-white text-slate-900 rounded font-mono text-[11px] font-bold leading-none">
                    {cartItemCount}
                  </span>
                )}
              </button>

              {/* Discreet Admin shortcut button */}
              <button
                onClick={onDoubleClickLogo}
                title="Admin Inventory Portal (Access Code Required)"
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                aria-label="Admin Portal"
              >
                <Shield className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile & Tablet Category Bar (scrolls naturally below sticky top bar so sticky height stays compact) */}
      <div className="lg:hidden border-b border-slate-200/80 px-3 sm:px-6 py-2 bg-slate-50/90 overflow-x-auto flex items-center gap-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-3.5 min-h-[38px] text-xs whitespace-nowrap rounded-lg font-medium transition-colors shrink-0 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            {cat === 'ALL' ? 'All Catalogue' : cat}
          </button>
        ))}
      </div>
    </>
  );
};
