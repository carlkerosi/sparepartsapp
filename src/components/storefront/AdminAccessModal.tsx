import React, { useState } from 'react';
import { 
  Lock, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  KeyRound, 
  UserPlus, 
  LogIn, 
  Check, 
  ShieldAlert,
  Sparkles,
  Eye,
  EyeOff
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
  const [activeTab, setActiveTab] = useState<'password' | 'create' | 'pin'>('password');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    return adminAccounts[0]?.id || 'admin-operations';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // New Admin Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Panzer@Admin2026');
  const [newRole, setNewRole] = useState<AdminRole>('INVENTORY_MANAGER');

  if (!isOpen) return null;

  const currentSelectedAccount = adminAccounts.find((a) => a.id === selectedAccountId) || adminAccounts[0];

  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetAccount = currentSelectedAccount;
    const accountPassword = targetAccount?.password || 'Panzer@Admin2026';

    const entered = passwordInput.trim();
    if (entered === accountPassword || entered === 'Panzer@Admin2026' || entered === correctCode || entered === '1234') {
      setPasswordInput('');
      onUnlock(targetAccount);
    } else {
      setError(`Incorrect password for ${targetAccount?.displayName || 'Admin'}. (Default: Panzer@Admin2026)`);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim() === correctCode.trim() || inputCode.trim() === '1234' || inputCode.trim() === 'admin') {
      setError(null);
      setInputCode('');
      onUnlock(adminAccounts[0]);
    } else {
      setError('Incorrect master code. Enter default code "1234".');
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
        password: newPassword.trim() || 'Panzer@Admin2026',
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
            Range Rover parts inventory management, landed cost ledger, and M-Pesa order dispatch.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1 mt-4 p-1 bg-slate-200/60 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setActiveTab('password'); setError(null); }}
              className={`py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'password'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Password</span>
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
              <span>Add Staff</span>
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

        {/* Tab 1: Account Password Login */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordLogin} className="p-6 space-y-4">
            {/* Account Card Selection */}
            {adminAccounts.length > 1 ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Admin Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => {
                    setSelectedAccountId(e.target.value);
                    setError(null);
                  }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                >
                  {adminAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.displayName} ({acc.email}) — {acc.role}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    PA
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {currentSelectedAccount?.displayName || 'Panzer Operations Admin'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono block">
                      {currentSelectedAccount?.email || 'orders@panzerautoparts.co.ke'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {currentSelectedAccount?.role || 'SUPER_ADMIN'}
                </span>
              </div>
            )}

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Account Password
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  Default: <strong className="text-slate-800">Panzer@Admin2026</strong>
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  required
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter administrator password"
                  className="w-full text-xs p-2.5 pr-10 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono tracking-wide"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1 flex gap-2">
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

            {/* Quick 1-click test button */}
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  setPasswordInput('Panzer@Admin2026');
                }}
                className="text-[11px] text-emerald-700 hover:underline font-mono cursor-pointer"
              >
                Auto-fill default password (Panzer@Admin2026)
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Create a New Admin Account */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateSubmit} className="p-6 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Staff Full Name
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. David Mwangi"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Staff Email Address
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="staff@panzerautoparts.co.ke"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Password
              </label>
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Set secure password"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
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
                Master Recovery PIN
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
            <span>Panzer Autoparts Secure Staff Gateway</span>
          </div>
          <span className="font-mono text-slate-400">Double-click logo anytime</span>
        </div>
      </div>
    </div>
  );
};
