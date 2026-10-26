import React, { useState, useEffect } from 'react';
import { SparePart, Supplier } from '../types/inventory';
import { calculateLandedCost, calculateIncFromEx, calculateExFromInc, formatCurrency } from '../utils/calculations';
import { X, Package, Calculator, Check, AlertCircle, DollarSign, Layers, Building2, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';

interface PartModalProps {
  isOpen: boolean;
  onClose: () => void;
  partToEdit?: SparePart | null;
  suppliers: Supplier[];
  initialSupplierId?: string;
  currencySymbol: string;
  defaultTaxRate: number;
  usdToKshRate?: number;
  onSavePart: (partData: Omit<SparePart, 'id' | 'lastUpdated'>, id?: string) => void;
}

export const PartModal: React.FC<PartModalProps> = ({
  isOpen,
  onClose,
  partToEdit,
  suppliers,
  initialSupplierId,
  currencySymbol,
  defaultTaxRate,
  usdToKshRate = 130,
  onSavePart,
}) => {
  const [partNumber, setPartNumber] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Braking');
  const [unitCostFobUsd, setUnitCostFobUsd] = useState<number>(0);
  const [unitCostLanded, setUnitCostLanded] = useState<number>(0);
  const [retailPriceEx, setRetailPriceEx] = useState<number>(0);
  const [retailPriceInc, setRetailPriceInc] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number>(10);
  const [minStockLevel, setMinStockLevel] = useState<number>(5);
  const [location, setLocation] = useState('Rack A-01');
  const [oemReference, setOemReference] = useState('');
  const [vehicleCompatibility, setVehicleCompatibility] = useState('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [supplier, setSupplier] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Built-in landed cost calculator state
  const [showCostCalc, setShowCostCalc] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(usdToKshRate || 130);
  const [freightPercent, setFreightPercent] = useState(15);
  const [dutyPercent, setDutyPercent] = useState(25);
  const [clearanceKsh, setClearanceKsh] = useState(250);

  // Pricing helper state
  const [markupPercent, setMarkupPercent] = useState(60);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (partToEdit) {
      setPartNumber(partToEdit.partNumber);
      setDescription(partToEdit.description);
      setCategory(partToEdit.category || 'Braking');
      setImageUrl(partToEdit.imageUrl || '');
      setUnitCostFobUsd(partToEdit.unitCostFobUsd);
      setUnitCostLanded(partToEdit.unitCostLanded);
      setRetailPriceEx(partToEdit.retailPriceEx);
      setRetailPriceInc(partToEdit.retailPriceInc || calculateIncFromEx(partToEdit.retailPriceEx, defaultTaxRate));
      setStockQuantity(partToEdit.stockQuantity);
      setMinStockLevel(partToEdit.minStockLevel);
      setLocation(partToEdit.location || '');
      setOemReference(partToEdit.oemReference || '');
      setVehicleCompatibility(partToEdit.vehicleCompatibility || '');
      setSupplierId(partToEdit.supplierId || '');
      setSupplier(partToEdit.supplier || '');
    } else {
      setPartNumber('');
      setDescription('');
      setCategory('Braking');
      setUnitCostFobUsd(15.00);
      const landed = calculateLandedCost(15.00, usdToKshRate || 130, 15, 25, 250);
      setUnitCostLanded(landed);
      const ex = Number((landed * 1.6).toFixed(2));
      setRetailPriceEx(ex);
      setRetailPriceInc(calculateIncFromEx(ex, defaultTaxRate));
      setStockQuantity(10);
      setMinStockLevel(4);
      setLocation('Rack A-01');
      setOemReference('');
      setVehicleCompatibility('');
      setImageUrl('');

      if (initialSupplierId) {
        const found = suppliers.find((s) => s.id === initialSupplierId);
        setSupplierId(initialSupplierId);
        setSupplier(found ? found.name : '');
      } else if (suppliers.length > 0) {
        setSupplierId(suppliers[0].id);
        setSupplier(suppliers[0].name);
      } else {
        setSupplierId('');
        setSupplier('');
      }
    }
    setErrorMsg(null);
  }, [partToEdit, isOpen, defaultTaxRate, initialSupplierId, suppliers, usdToKshRate]);

  if (!isOpen) return null;

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Image file exceeds 2MB limit. Please select a smaller photo or provide a URL.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setImageUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Auto calculate Landed cost in KSh when triggered
  const handleApplyCalculatedLandedCost = () => {
    const calculated = calculateLandedCost(unitCostFobUsd, exchangeRate, freightPercent, dutyPercent, clearanceKsh);
    setUnitCostLanded(calculated);
    // Suggest retail price
    const suggestedEx = Number((calculated * (1 + markupPercent / 100)).toFixed(2));
    setRetailPriceEx(suggestedEx);
    setRetailPriceInc(calculateIncFromEx(suggestedEx, defaultTaxRate));
    setShowCostCalc(false);
  };

  // Retail Price Ex change
  const handleExPriceChange = (newEx: number) => {
    setRetailPriceEx(newEx);
    setRetailPriceInc(calculateIncFromEx(newEx, defaultTaxRate));
  };

  // Retail Price Inc change
  const handleIncPriceChange = (newInc: number) => {
    setRetailPriceInc(newInc);
    setRetailPriceEx(calculateExFromInc(newInc, defaultTaxRate));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partNumber.trim()) {
      setErrorMsg('Part number is required.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Part description is required.');
      return;
    }
    if (unitCostFobUsd < 0 || unitCostLanded < 0 || retailPriceEx < 0) {
      setErrorMsg('Costs and prices must be positive numbers.');
      return;
    }

    onSavePart(
      {
        partNumber: partNumber.trim().toUpperCase(),
        description: description.trim(),
        category,
        imageUrl: imageUrl.trim() || undefined,
        unitCostFobUsd: Number(unitCostFobUsd),
        unitCostLanded: Number(unitCostLanded),
        retailPriceEx: Number(retailPriceEx),
        retailPriceInc: Number(retailPriceInc),
        stockQuantity: Number(stockQuantity),
        minStockLevel: Number(minStockLevel),
        location: location.trim(),
        oemReference: oemReference.trim() || undefined,
        vehicleCompatibility: vehicleCompatibility.trim() || undefined,
        supplierId: supplierId || undefined,
        supplier: supplier.trim() || undefined,
      },
      partToEdit ? partToEdit.id : undefined
    );

    onClose();
  };

  // Current margin calculation
  const grossProfit = retailPriceEx - unitCostLanded;
  const marginPercent = retailPriceEx > 0 ? (grossProfit / retailPriceEx) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {partToEdit ? 'Edit Spare Part Specifications' : 'Add New Spare Part to Inventory'}
              </h2>
              <p className="text-xs text-slate-500">
                Track FOB origin cost, landed clearance cost, and retail pricing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Identification */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Part Number *
              </label>
              <input
                type="text"
                required
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="e.g. BRK-TY-04465"
                className="w-full text-xs font-mono font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
              >
                <option value="Braking">Braking (Pads, Discs, Calipers)</option>
                <option value="Engine">Engine (Belts, Gaskets, Plugs, Pistons)</option>
                <option value="Filtration">Filtration (Oil, Fuel, Air, Cabin)</option>
                <option value="Electrical">Electrical (Alternators, Starters, Sensors)</option>
                <option value="Suspension">Suspension & Steering (Shocks, Tie Rods)</option>
                <option value="Transmission">Transmission & Drivetrain (Clutch, Axles)</option>
                <option value="Cooling">Cooling (Radiators, Pumps, Thermostats)</option>
                <option value="Exhaust">Exhaust & Emission</option>
                <option value="Body & Hardware">Body, Fasteners & Hardware</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Part Description *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Front Ceramic Brake Pad Set with Stainless Shims"
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                OEM Reference / Interchange #
              </label>
              <input
                type="text"
                value={oemReference}
                onChange={(e) => setOemReference(e.target.value)}
                placeholder="e.g. LR033302 / LR020362 / 09.C881.11"
                className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vehicle Compatibility
              </label>
              <input
                type="text"
                value={vehicleCompatibility}
                onChange={(e) => setVehicleCompatibility(e.target.value)}
                placeholder="e.g. Range Rover Sport L494 (3.0 V6 / 4.4 SDV8), Vogue L405"
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
              />
            </div>
          </div>

          {/* Part Product Image Option */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Product Image (Storefront & Catalog)</span>
              </span>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Image</span>
                </button>
              )}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              <div className="sm:col-span-2 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Enter Image URL (https://... or /src/assets/...)"
                    className="flex-1 text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                  />
                  <label className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="shrink-0 font-medium">Range Rover Presets:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setImageUrl('/src/assets/images/part_ceramic_brake_pads_1792926667949.jpg')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] transition-colors cursor-pointer"
                    >
                      Brake Discs & Pads
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUrl('/src/assets/images/part_spin_oil_filter_1792926668402.jpg')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] transition-colors cursor-pointer"
                    >
                      Filters & Trans Pan
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUrl('/src/assets/images/range_rover_air_suspension_1792927570074.jpg')}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] transition-colors cursor-pointer"
                    >
                      Water Pump & Tank
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview Thumbnail */}
              <div className="sm:col-span-1">
                <div className="w-full aspect-4/3 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden relative">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Part preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-center p-2 text-slate-400">
                      <ImageIcon className="w-6 h-6 mx-auto mb-1 stroke-1" />
                      <span className="text-[10px] block">No image selected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Cost & Pricing Matrix */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Cost & Selling Price Structure (KSh)
              </span>
              <button
                type="button"
                onClick={() => setShowCostCalc(!showCostCalc)}
                className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer font-medium"
              >
                <Calculator className="w-3.5 h-3.5 text-slate-500" />
                <span>{showCostCalc ? 'Hide Landed Cost Calculator' : 'Auto-Calculate Landed Cost'}</span>
              </button>
            </div>

            {/* Landed Cost Calculator Dropdown */}
            {showCostCalc && (
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 mb-3 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-800">
                    Landed Cost Factor Parameters (FOB USD Converted to KSh + Freight + EAC Duty + Port Clearance)
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    1 USD = {exchangeRate} KSh
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">USD/KSh Rate</label>
                    <input
                      type="number"
                      step="0.5"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 130)}
                      className="w-full text-xs font-mono font-semibold p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Freight Factor %</label>
                    <input
                      type="number"
                      step="0.5"
                      value={freightPercent}
                      onChange={(e) => setFreightPercent(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-mono p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">EAC Duty / Tax %</label>
                    <input
                      type="number"
                      step="0.5"
                      value={dutyPercent}
                      onChange={(e) => setDutyPercent(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-mono p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Clearance (KSh)</label>
                    <input
                      type="number"
                      step="10"
                      value={clearanceKsh}
                      onChange={(e) => setClearanceKsh(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-mono p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Target Markup %</label>
                    <input
                      type="number"
                      step="1"
                      value={markupPercent}
                      onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs font-mono p-1.5 bg-white border border-slate-200 rounded"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-500 font-mono">
                    Est. Landed: <span className="font-bold text-slate-900">{currencySymbol} {calculateLandedCost(unitCostFobUsd, exchangeRate, freightPercent, dutyPercent, clearanceKsh).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCalculatedLandedCost}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Apply Landed & Retail Prices
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Unit Cost FOB USD */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit Cost (FOB) USD *
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={unitCostFobUsd}
                    onChange={(e) => setUnitCostFobUsd(parseFloat(e.target.value) || 0)}
                    className="w-full pl-6 pr-2 py-2 text-xs font-mono tabular-nums font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Unit Cost Landed KSh */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit Cost (Landed) {currencySymbol} *
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={unitCostLanded}
                    onChange={(e) => setUnitCostLanded(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-2 py-2 text-xs font-mono tabular-nums font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Selling Price Per Unit Ex (KSh) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selling Price Ex-VAT ({currencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={retailPriceEx}
                    onChange={(e) => handleExPriceChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-2 py-2 text-xs font-mono tabular-nums font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Selling Price Per Unit Inc (KSh) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selling Price Inc-VAT ({currencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={retailPriceInc}
                    onChange={(e) => handleIncPriceChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-2 py-2 text-xs font-mono tabular-nums font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Calculated Margin Preview */}
            <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200 font-mono tabular-nums">
              <span>Gross Profit Per Unit: {formatCurrency(grossProfit, currencySymbol)}</span>
              <span className={`font-semibold ${marginPercent >= 40 ? 'text-emerald-700' : 'text-slate-700'}`}>
                Profit Margin: {marginPercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Section 3: Stock Levels & Location */}
          <div className="pt-2 border-t border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
              Warehouse Stock & Physical Placement
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Stock on Hand *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                  className="w-full text-xs font-mono tabular-nums font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Min Reorder Threshold *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={minStockLevel}
                  onChange={(e) => setMinStockLevel(parseInt(e.target.value) || 1)}
                  className="w-full text-xs font-mono tabular-nums font-bold p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Storage Bin / Rack Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Rack B-04 / Bin 12"
                  className="w-full text-xs font-mono p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Primary Supplier (Vendor Linking)</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => {
                  const selId = e.target.value;
                  setSupplierId(selId);
                  const matched = suppliers.find((s) => s.id === selId);
                  if (matched) {
                    setSupplier(matched.name);
                  }
                }}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer font-medium"
              >
                <option value="">-- No Primary Supplier Assigned --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.code}] {s.name} · {s.country} (Terms: {s.paymentTerms}, {s.leadTimeDays}d lead)
                  </option>
                ))}
              </select>

              {/* Quick display of selected supplier terms */}
              {supplierId && (
                <div className="mt-1.5 p-2 bg-slate-100 rounded text-[11px] text-slate-600 flex items-center justify-between">
                  {(() => {
                    const sel = suppliers.find((s) => s.id === supplierId);
                    if (!sel) return null;
                    return (
                      <>
                        <span>Contact: <strong>{sel.contactPerson || sel.email}</strong></span>
                        <span>Terms: <strong>{sel.paymentTerms}</strong> ({sel.shippingTerms})</span>
                        <span>Lead: <strong>{sel.leadTimeDays} days</strong></span>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>{partToEdit ? 'Save Changes' : 'Add to Inventory'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
