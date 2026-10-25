import React, { useState } from 'react';
import { InventorySettings } from '../types/inventory';
import { X, Settings, RotateCcw, Save, Check, AlertTriangle, Download, Upload } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: InventorySettings;
  onSaveSettings: (settings: InventorySettings) => void;
  onResetData: () => void;
  onBackupJson: () => void;
  onRestoreJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetData,
  onBackupJson,
  onRestoreJson,
}) => {
  const [form, setForm] = useState<InventorySettings>({ ...settings });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-800" />
            <h2 className="text-sm font-bold text-slate-900">Store & Currency Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {savedNotice && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Settings successfully updated!</span>
            </div>
          )}

          {/* Currency, Exchange Rate & Tax */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                required
                value={form.currencySymbol}
                onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                placeholder="KSh, $, €"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                USD to KSh Rate
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={form.usdToKshRate || 130}
                onChange={(e) => setForm({ ...form, usdToKshRate: parseFloat(e.target.value) || 130 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">1 USD = {form.usdToKshRate || 130} KSh</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                VAT / Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={form.defaultTaxRatePercent}
                onChange={(e) => setForm({ ...form, defaultTaxRatePercent: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Standard VAT rate</span>
            </div>
          </div>

          {/* Business Details for Invoices */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Business / Workshop Name
            </label>
            <input
              type="text"
              required
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Physical Warehouse Address
            </label>
            <input
              type="text"
              value={form.businessAddress}
              onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={form.businessPhone}
                onChange={(e) => setForm({ ...form, businessPhone: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tax PIN / Registration #
              </label>
              <input
                type="text"
                value={form.businessTaxId}
                onChange={(e) => setForm({ ...form, businessTaxId: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Admin Access Code (Double-click logo shortcut)
            </label>
            <input
              type="text"
              value={form.adminAccessCode || '1234'}
              onChange={(e) => setForm({ ...form, adminAccessCode: e.target.value })}
              placeholder="1234"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono tracking-widest text-slate-900"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Default is 1234. Used when double-clicking the PartPulse logo to enter admin mode.
            </span>
          </div>

          {/* Data Backup & Restore */}
          <div className="pt-3 border-t border-slate-200">
            <span className="block font-semibold text-slate-700 mb-2">
              Database Backup & Portability
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onBackupJson}
                className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Export Full Backup (JSON)</span>
              </button>

              <label className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer text-center">
                <Upload className="w-3.5 h-3.5 text-slate-600" />
                <span>Restore Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={onRestoreJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Reset Demo Data */}
          <div className="pt-3 border-t border-slate-200">
            <span className="block font-semibold text-rose-700 mb-1">
              Reset System Data
            </span>
            <p className="text-[11px] text-slate-500 mb-2">
              Reset inventory catalog, stock levels, and sales ledger back to the preloaded automotive demonstration database.
            </p>
            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-1.5 text-xs text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Sample Catalog</span>
              </button>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Are you sure? This will replace your current edits with initial sample parts.</span>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-2.5 py-1 text-xs text-slate-600 bg-white border border-slate-200 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResetData();
                      setShowResetConfirm(false);
                      onClose();
                    }}
                    className="px-3 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded cursor-pointer"
                  >
                    Yes, Reset Everything
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
