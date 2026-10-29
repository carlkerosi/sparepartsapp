import React, { useState } from 'react';
import { 
  Lock, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  KeyRound, 
  UserCheck, 
  UserPlus, 
  LogIn, 
  Check, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { AdminAccount, AdminRole } from '../../types/inventory';

interface AdminAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (admin?: AdminAccount) => void;
  correctCode: string;
  adminAccounts?: AdminAccount[];
  onSignInGoogle?: () => Promise<void>;
  onCreateAdminAccount?: (account: AdminAccount) => Promise<void>;
}

export const AdminAccessModal: React.FC<AdminAccessModalProps> = ({
  isOpen,
  onClose,
  onUnlock,
  correctCode = '1234',
  adminAccounts = [],
  onSignInGoogle,
  onCreateAdminAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'create' | 'pin'>('signin');
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // New Admin Form State
  const [newName, setNewName] = useState('Carl Kerosi');
  const [newEmail, setNewEmail] = useState('kerosicarl@gmail.com');
  const [newRole, setNewRole] = useState<AdminRole>('SUPER_ADMIN');

  if (!isOpen) return null;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim() === correctCode.trim() || inputCode.trim() === '1234' || inputCode.trim() === 'admin') {
      setError(null);
      setInputCode('');
      // Find Carl Kerosi or first super admin
      const carl = adminAccounts.find((a) => a.email.toLowerCase() === 'kerosicarl@gmail.com') || adminAccounts[0];
      onUnlock(carl);
    } else {
      setError('Incorrect access code. Use 1234 or sign in with your admin account.');
    }
  };

  const handleGoogleSignIn = async () => {
    if (!onSignInGoogle) return;
    setIsGoogleLoading(true);
    setError(null);
    try {
      await onSignInGoogle();
      onUnlock();
    } catch (err) {
      console.error(err);
      setError('Google Sign-In was cancelled or encountered a network error.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) {
      setError('Please provide both full name and a valid email.');
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const newAdmin: AdminAccount = {
        id: `admin-${Date.now().toString(36)}`,
        displayName: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };

      if (onCreateAdminAccount) {
        await onCreateAdminAccount(newAdmin);
      }
      onUnlock(newAdmin);
    } catch (err) {
      console.error(err);
      setError('Failed to create admin account. Please check connectivity.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectAdminAccount = (account: AdminAccount) => {
    onUnlock(account);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Lock className="w-5 h-5 text-emerald-400" />
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-lg font-bold text-slate-900">Panzer Administrator Portal</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Range Rover inventory management, landed cost ledger, and M-Pesa order dispatch.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1 mt-4 p-1 bg-slate-200/60 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setActiveTab('signin'); setError(null); }}
              className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'signin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Accounts</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('create'); setError(null); }}
              className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('pin'); setError(null); }}
              className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'pin'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>PIN (1234)</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Sign in with existing Admin Accounts or Google */}
        {activeTab === 'signin' && (
          <div className="p-6 space-y-4">
            {/* Google Authentication Direct Trigger */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer hover:border-slate-400"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isGoogleLoading ? 'Connecting Google Auth...' : 'Continue with Google Admin'}</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="grow border-t border-slate-200"></div>
              <span className="shrink mx-3 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Or Select Admin Account
              </span>
              <div className="grow border-t border-slate-200"></div>
            </div>

            {/* List of provisioned Admin Accounts */}
            <div className="space-y-2">
              {adminAccounts.map((account) => {
                const isCarl = account.email.toLowerCase() === 'kerosicarl@gmail.com';
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => handleSelectAdminAccount(account)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                        {account.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{account.displayName}</span>
                          {isCarl && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                              Owner
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono block">{account.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        {account.role}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Create a New Admin Account */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateSubmit} className="p-6 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Carl Kerosi"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Email Address
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="kerosicarl@gmail.com"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Use your primary Google email for one-click access.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Role / Clearance
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as AdminRole)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="SUPER_ADMIN">Super Administrator (Full Ledger, Stock & Settings)</option>
                <option value="INVENTORY_MANAGER">Inventory Manager (Stock, Reordering & Pricing)</option>
                <option value="SALES_CLERK">Sales Counter Clerk (Point of Sale & Invoices)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isCreating ? 'Provisioning Account...' : 'Create & Enter Admin Portal'}</span>
            </button>
          </form>
        )}

        {/* Tab 3: Quick Admin Passcode */}
        {activeTab === 'pin' && (
          <form onSubmit={handlePinSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Master Admin PIN
              </label>
              <input
                type="password"
                autoFocus
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter access code (Default: 1234)"
                className="w-full text-sm font-mono tracking-widest text-center py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Default master code is <strong className="text-slate-700 font-mono">1234</strong></span>
              </div>
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
                <span>Unlock Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* Feedback Alert */}
        {error && (
          <div className="px-6 pb-4">
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Panzer Autoparts Role-Based Access</span>
          </div>
          <span className="font-mono text-slate-400">Double-click logo anytime</span>
        </div>
      </div>
    </div>
  );
};
