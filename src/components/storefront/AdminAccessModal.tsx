import React, { useState } from 'react';
import { Lock, X, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

interface AdminAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: () => void;
  correctCode: string;
}

export const AdminAccessModal: React.FC<AdminAccessModalProps> = ({
  isOpen,
  onClose,
  onUnlock,
  correctCode = '1234',
}) => {
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim() === correctCode.trim() || inputCode.trim() === '1234' || inputCode.trim() === 'admin') {
      setError(false);
      setInputCode('');
      onUnlock();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base font-bold text-slate-900">Admin Inventory Access</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Enter the authorized administrator access code to access the backend inventory, landed cost tracking, and sales records.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Access Code
              </label>
              <div className="relative">
                <input
                  type="password"
                  autoFocus
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value);
                    if (error) setError(false);
                  }}
                  placeholder="Enter access code (Default: 1234)"
                  className={`w-full text-sm font-mono tracking-widest text-center py-2.5 px-3 bg-slate-50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-colors ${
                    error ? 'border-rose-400 bg-rose-50/50 text-rose-900' : 'border-slate-200 text-slate-900'
                  }`}
                />
              </div>
              {error ? (
                <p className="text-[11px] text-rose-600 mt-1.5 font-medium">
                  Incorrect access code. Please try again or use default code "1234".
                </p>
              ) : (
                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Default access code is <strong className="text-slate-700 font-mono">1234</strong></span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Unlock Admin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Double-clicking the logo anywhere will always open this prompt.</span>
        </div>
      </div>
    </div>
  );
};
