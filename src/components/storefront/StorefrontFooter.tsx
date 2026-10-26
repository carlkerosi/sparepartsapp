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
          {/* Col 1: Brand & Bio */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-white text-slate-900 font-bold flex items-center justify-center text-xs">
                PP
              </div>
              <span className="text-white font-bold tracking-tight text-sm">PartPulse Spares</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Premier Range Rover spare parts specialist in Nairobi, Kenya. Sourcing genuine Brembo brake discs & pads, wear sensors, parking brake shoes, aluminum water pumps, expansion tanks, ZF transmission pans, oil coolers, and OEM filters.
            </p>
          </div>

          {/* Col 2: Hub & Contact */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase">Central Hub</h4>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{settings.businessAddress || 'Enterprise Road, Industrial Area, Nairobi, Kenya'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{settings.businessPhone || '+254 722 849 204'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>orders@partpulse.co.ke</span>
              </div>
            </div>
          </div>

          {/* Col 3: Sourcing & Compliance */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase">Tax & Provenance</h4>
            <ul className="space-y-1 text-xs text-slate-400">
              <li>KRA PIN: <strong className="text-slate-300 font-mono">{settings.businessTaxId || 'P051892048X'}</strong></li>
              <li>Standard 16% VAT Included</li>
              <li>EAC Customs Duty Compliant</li>
              <li>Direct Japanese & German OEM Supply</li>
            </ul>
          </div>

          {/* Col 4: Admin Portal Link */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase">Staff & Inventory</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Authorized warehouse personnel can access the back-office inventory catalog, landed cost calculations, and supplier management.
            </p>
            <button
              onClick={onOpenAdmin}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer text-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Inventory Portal</span>
            </button>
            <span className="block text-[10px] text-slate-400">
              Shortcut: Double-click the logo on any page
            </span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>
            © {new Date().getFullYear()} {settings.businessName || 'PartPulse Automotive Ltd'}. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span>Genuine Auto Parts</span>
            <span aria-hidden="true">·</span>
            <span>Nairobi Dispatch</span>
            <span aria-hidden="true">·</span>
            <button
              onClick={onOpenAdmin}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Admin Login (Code 1234)
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
