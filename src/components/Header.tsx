import React from 'react';
import { 
  Package, 
  ShoppingCart, 
  Receipt, 
  ArrowUpDown, 
  AlertTriangle, 
  BarChart3, 
  Plus, 
  Settings, 
  Download,
  Building2,
  Store
} from 'lucide-react';

export type ActiveTab = 'inventory' | 'pos' | 'sales' | 'movements' | 'reorder' | 'suppliers' | 'valuation';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenNewSale: () => void;
  onOpenNewPart: () => void;
  onOpenSettings: () => void;
  onExitToStore?: () => void;
  lowStockCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenNewSale,
  onOpenNewPart,
  onOpenSettings,
  onExitToStore,
  lowStockCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      {/* Universal 3-Zone Top Bar Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg tracking-wider shadow-sm">
              PP
            </div>
            <a 
              href="#inventory" 
              onClick={(e) => { e.preventDefault(); onTabChange('inventory'); }}
              className="text-lg font-bold tracking-tight text-slate-900 hover:text-slate-800 transition-colors whitespace-nowrap"
            >
              PartPulse
            </a>
          </div>

          {/* Zone 2: Navigation Links (single line, whitespace-nowrap) */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => onTabChange('inventory')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 cursor-pointer ${
                activeTab === 'inventory' 
                  ? 'text-slate-900 border-slate-900 font-semibold' 
                  : 'border-transparent text-slate-600'
              }`}
            >
              Inventory Catalog
            </button>

            <button
              onClick={() => onTabChange('pos')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pos' 
                  ? 'text-slate-900 border-slate-900 font-semibold' 
                  : 'border-transparent text-slate-600'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Point of Sale</span>
            </button>

            <button
              onClick={() => onTabChange('sales')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'sales' 
                  ? 'text-slate-900 border-slate-900 font-semibold' 
                  : 'border-transparent text-slate-600'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Sales Ledger</span>
            </button>

            <button
              onClick={() => onTabChange('movements')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'movements' 
                  ? 'text-slate-900 border-slate-900 font-semibold' 
                  : 'border-transparent text-slate-600'
              }`}
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>Stock Movements</span>
            </button>

            <button
              onClick={() => onTabChange('reorder')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'reorder' 
                  ? 'text-slate-900 border-slate-900 font-semibold' 
                  : 'border-transparent text-slate-600'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${lowStockCount > 0 ? 'text-amber-600' : ''}`} />
              <span>Reorder & Restock</span>
              {lowStockCount > 0 && (
                <span className="text-xs font-mono tabular-nums font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  {lowStockCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('suppliers')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'suppliers' 
                  ? 'text-slate-900 border-slate-900 font-semibold' 
                  : 'border-transparent text-slate-600'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Suppliers</span>
            </button>

            <button
              onClick={() => onTabChange('valuation')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'valuation' 
                  ? 'text-slate-900 border-slate-900 font-semibold' 
                  : 'border-transparent text-slate-600'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Valuation & Margins</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action & Settings */}
          <div className="flex items-center gap-2.5 shrink-0">
            {onExitToStore && (
              <button
                onClick={onExitToStore}
                title="Exit back to Customer E-Commerce Storefront"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Storefront View</span>
              </button>
            )}

            <button
              onClick={onOpenSettings}
              title="Store Settings & Tax Rates"
              aria-label="Settings"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenNewPart}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Part</span>
            </button>

            <button
              onClick={onOpenNewSale}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Record Sale</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Secondary Bar */}
        <div className="lg:hidden flex items-center gap-1 py-2 overflow-x-auto border-t border-slate-100 text-xs font-medium text-slate-600 scrollbar-none">
          <button
            onClick={() => onTabChange('inventory')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'inventory' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
            }`}
          >
            Inventory
          </button>
          <button
            onClick={() => onTabChange('pos')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'pos' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
            }`}
          >
            Sell Parts
          </button>
          <button
            onClick={() => onTabChange('sales')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'sales' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
            }`}
          >
            Sales Ledger
          </button>
          <button
            onClick={() => onTabChange('movements')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'movements' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
            }`}
          >
            Movements
          </button>
          <button
            onClick={() => onTabChange('reorder')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'reorder' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
            }`}
          >
            Reorder {lowStockCount > 0 && `(${lowStockCount})`}
          </button>
          <button
            onClick={() => onTabChange('suppliers')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'suppliers' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
            }`}
          >
            Suppliers
          </button>
          <button
            onClick={() => onTabChange('valuation')}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap ${
              activeTab === 'valuation' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
            }`}
          >
            Valuation
          </button>
        </div>
      </div>
    </header>
  );
};
