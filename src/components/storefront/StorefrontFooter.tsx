import React from 'react';
import { ShieldCheck, Phone, MapPin, Mail, Lock } from 'lucide-react';
import { InventorySettings } from '../../types/inventory';

interface StorefrontFooterProps {
  settings: InventorySettings;
  onOpenAdmin: () => void;
}

export const StorefrontFooter: React.FC<StorefrontFooterProps> = ({
  settings,
  onOpenAdmin,
}) => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: Brand & Kenyan Company Bio */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-white text-slate-900 font-bold flex items-center justify-center text-xs shadow-xs">
                AR
              </div>
              <div>
                <span className="text-white font-bold tracking-tight text-sm block">Apex Range Rover Spares</span>
                <span className="text-[10px] text-emerald-400 font-medium">Kenyan Registered Automotive Importer</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Apex Range Rover Spares Kenya Ltd is a registered Kenyan automotive company operating from Enterprise Road, Industrial Area, Nairobi. We specialize strictly in genuine OEM and certified Tier-1 replacement parts for Range Rover (Vogue, Sport, Velar, and Evoque), with transparent landed costing in Kenyan Shillings (KSh) and rapid dispatch to Nairobi workshops.
            </p>
          </div>

          {/* Col 2: Kenyan Hub & Dispatch Contact */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase flex items-center gap-1.5">
              <span>Nairobi Central Hub</span>
            </h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{settings.businessAddress || 'Enterprise Road, Commercial Centre, Industrial Area, Nairobi, Kenya'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Mobile / WhatsApp: <strong className="text-slate-200 font-mono">{settings.businessPhone || '+254 722 849 204'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Nairobi Landline: <span className="text-slate-300 font-mono">+254 20 234 8920</span></span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{settings.businessEmail || 'orders@apexspares.co.ke'}</span>
              </div>
              <div className="text-[11px] text-slate-500 pt-1">
                Mon - Fri: 8:00 AM - 5:30 PM · Sat: 8:30 AM - 2:00 PM (EAT)
              </div>
            </div>
          </div>

          {/* Col 3: Kenyan Business Numbers & Compliance */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase">
              Kenyan Business & M-Pesa Numbers
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-400 font-mono">
              <li className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <span className="text-[10px] text-emerald-400 uppercase block font-sans font-semibold">Lipa na M-Pesa Paybill / Business No:</span>
                <strong className="text-white text-xs">{settings.mpesaPaybillNumber || '849204'}</strong> · Acc: <span className="text-slate-300">Part SKU</span>
              </li>
              <li className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <span className="text-[10px] text-emerald-400 uppercase block font-sans font-semibold">M-Pesa Buy Goods Till No:</span>
                <strong className="text-white text-xs">{settings.mpesaTillNumber || '948201'}</strong>
              </li>
              <li className="pt-0.5">
                <span className="font-sans text-[11px] text-slate-400">BRS Company Reg:</span>{' '}
                <strong className="text-slate-200">{settings.businessRegNumber || 'PVT-EYU7821 / CPR/2021/849204'}</strong>
              </li>
              <li>
                <span className="font-sans text-[11px] text-slate-400">KRA e-TIMS PIN:</span>{' '}
                <strong className="text-slate-200">{settings.businessTaxId || 'P051892048X'}</strong>
              </li>
              <li>
                <span className="font-sans text-[11px] text-slate-400">Nairobi County SBP:</span>{' '}
                <span className="text-slate-300">SBP-NRB-2026-084920</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Admin Portal Link */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase">Staff & Inventory Portal</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Authorized warehouse personnel can access back-office Range Rover inventory, landed cost computations, and sales ledgers.
            </p>
            <button
              onClick={onOpenAdmin}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer text-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Inventory Portal</span>
            </button>
            <span className="block text-[10px] text-slate-500 mt-1">
              Double-click the logo on any page to enter PIN (1234)
            </span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>
            © {new Date().getFullYear()} {settings.businessName || 'Apex Range Rover Spares Kenya Ltd'}. Incorporated in Kenya under the Companies Act 2015.
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Kenyan Company</span>
            </span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span>Registered Automotive Importer</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <button
              onClick={onOpenAdmin}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Admin Access (1234)
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
