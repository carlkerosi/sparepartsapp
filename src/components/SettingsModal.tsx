import React, { useState, useEffect } from 'react';
import { InventorySettings, AdminAccount, AdminRole } from '../types/inventory';
import { 
  X, 
  Settings, 
  RotateCcw, 
  Save, 
  Check, 
  AlertTriangle, 
  Download, 
  Upload, 
  Database, 
  RefreshCw, 
  CheckCircle2,
  Users,
  UserPlus,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Key,
  Eye,
  EyeOff,
  Smartphone,
  Copy,
  ExternalLink,
  Lock
} from 'lucide-react';
import { checkFirebaseConnection, FirebaseConnectionStatus } from '../lib/firebase';
import { testDarajaCredentials, updateDarajaConfig, getMpesaStatus, MpesaStatusResponse } from '../services/mpesaService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: InventorySettings;
  onSaveSettings: (settings: InventorySettings) => void;
  onResetData: () => void;
  onBackupJson: () => void;
  onRestoreJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  adminAccounts?: AdminAccount[];
  currentAdmin?: AdminAccount | null;
  onSaveAdminAccount?: (account: AdminAccount) => void;
  onDeleteAdminAccount?: (id: string) => void;
  onSignInGoogle?: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetData,
  onBackupJson,
  onRestoreJson,
  adminAccounts = [],
  currentAdmin,
  onSaveAdminAccount,
  onDeleteAdminAccount,
  onSignInGoogle,
}) => {
  const [form, setForm] = useState<InventorySettings>({ ...settings });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [testingFirebase, setTestingFirebase] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseConnectionStatus | null>(null);

  // Admin Account Creation Form State
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('Panzer@Admin2026');
  const [adminRole, setAdminRole] = useState<AdminRole>('SUPER_ADMIN');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [adminSuccessMsg, setAdminSuccessMsg] = useState<string | null>(null);

  // M-Pesa Daraja Firebase Storage & Test State
  const [serverMpesaStatus, setServerMpesaStatus] = useState<MpesaStatusResponse | null>(null);
  const [testingDaraja, setTestingDaraja] = useState(false);
  const [darajaTestStatus, setDarajaTestStatus] = useState<{ success: boolean; message: string; tokenPreview?: string } | null>(null);
  const [showDarajaSecret, setShowDarajaSecret] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [savingDarajaToFirebase, setSavingDarajaToFirebase] = useState(false);
  const [darajaFirebaseSavedMsg, setDarajaFirebaseSavedMsg] = useState<string | null>(null);

  // Query server for active Daraja credentials on open
  useEffect(() => {
    if (isOpen) {
      getMpesaStatus()
        .then((res) => {
          setServerMpesaStatus(res);
          setForm((prev) => ({
            ...prev,
            mpesaShortcode: (res.shortcode && res.shortcode !== '174379') ? res.shortcode : '522522',
            mpesaAccountNumber: res.accountNumber || prev.mpesaAccountNumber || '1358024235',
            mpesaAccountName: res.accountName || prev.mpesaAccountName || 'PANZER AUTOPARTS LTD',
          }));
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Save public business settings (sanitized, zero secrets stored in localStorage or /settings/current)
    onSaveSettings(form);

    // If new secrets were entered, securely persist them to Firebase Firestore via backend
    if (form.mpesaConsumerKey?.trim() || form.mpesaConsumerSecret?.trim() || form.mpesaPasskey?.trim() || form.mpesaShortcode || form.mpesaAccountNumber) {
      updateDarajaConfig({
        consumerKey: form.mpesaConsumerKey?.trim(),
        consumerSecret: form.mpesaConsumerSecret?.trim(),
        shortcode: form.mpesaShortcode || form.mpesaPaybillNumber || '522522',
        accountNumber: form.mpesaAccountNumber || '1358024235',
        accountName: form.mpesaAccountName || 'PANZER AUTOPARTS LTD',
        passkey: form.mpesaPasskey?.trim(),
        environment: form.mpesaEnvironment || 'sandbox',
      }).catch(console.error);
    }

    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 800);
  };

  const handleSaveDarajaToFirebase = async () => {
    if (!form.mpesaConsumerKey?.trim() && !form.mpesaConsumerSecret?.trim() && !form.mpesaPasskey?.trim()) {
      setDarajaFirebaseSavedMsg('Please enter Consumer Key, Secret or Passkey first.');
      return;
    }
    setSavingDarajaToFirebase(true);
    setDarajaFirebaseSavedMsg(null);
    try {
      const res = await updateDarajaConfig({
        consumerKey: form.mpesaConsumerKey?.trim(),
        consumerSecret: form.mpesaConsumerSecret?.trim(),
        shortcode: form.mpesaShortcode || form.mpesaPaybillNumber || '522522',
        accountNumber: form.mpesaAccountNumber || '1358024235',
        accountName: form.mpesaAccountName || 'PANZER AUTOPARTS LTD',
        passkey: form.mpesaPasskey?.trim(),
        environment: form.mpesaEnvironment || 'sandbox',
      });
      setDarajaFirebaseSavedMsg(res.message || 'Credentials securely stored in Firebase Firestore!');
      const freshStatus = await getMpesaStatus();
      setServerMpesaStatus(freshStatus);
      setTimeout(() => setDarajaFirebaseSavedMsg(null), 4000);
    } catch (err: any) {
      setDarajaFirebaseSavedMsg('Failed to save to Firebase: ' + err.message);
    } finally {
      setSavingDarajaToFirebase(false);
    }
  };

  const handleTestDaraja = async () => {
    const key = form.mpesaConsumerKey?.trim();
    const secret = form.mpesaConsumerSecret?.trim();

    if (!key && !secret && !serverMpesaStatus?.configured) {
      setDarajaTestStatus({
        success: false,
        message: 'Please enter both Consumer Key and Consumer Secret from your Daraja Sandbox app first.',
      });
      return;
    }

    setTestingDaraja(true);
    setDarajaTestStatus(null);
    try {
      const res = await testDarajaCredentials({
        consumerKey: key || '',
        consumerSecret: secret || '',
        environment: form.mpesaEnvironment || 'sandbox',
      });
      setDarajaTestStatus(res);
    } catch (err: any) {
      setDarajaTestStatus({
        success: false,
        message: err.message || 'Failed to authenticate with Safaricom Daraja API.',
      });
    } finally {
      setTestingDaraja(false);
    }
  };

  const handleTestFirebase = async () => {
    setTestingFirebase(true);
    try {
      const res = await checkFirebaseConnection();
      setFirebaseStatus(res);
    } catch {
      setFirebaseStatus({
        connected: false,
        message: 'Connection check timed out or failed.',
      });
    } finally {
      setTestingFirebase(false);
    }
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminName.trim()) return;

    const newAccount: AdminAccount = {
      id: `admin-${Date.now().toString(36)}`,
      displayName: adminName.trim(),
      email: adminEmail.trim().toLowerCase(),
      role: adminRole,
      password: adminPassword.trim() || 'Panzer@Admin2026',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    onSaveAdminAccount?.(newAccount);
    setAdminSuccessMsg(`Admin account created for ${newAccount.displayName} (${newAccount.email})`);
    setAdminName('');
    setAdminEmail('');
    setAdminPassword('Panzer@Admin2026');
    setShowAddAdmin(false);
    setTimeout(() => setAdminSuccessMsg(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-800" />
            <h2 className="text-sm font-bold text-slate-900">Store & Administrative Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {savedNotice && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-1.5 font-medium">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Settings updated successfully!</span>
            </div>
          )}

          {adminSuccessMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-1.5 font-medium">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{adminSuccessMsg}</span>
            </div>
          )}

          {/* ============================================================= */}
          {/* 1. ADMIN ACCOUNTS & ROLE-BASED ACCESS CONTROL                 */}
          {/* ============================================================= */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-700" />
                <span className="font-bold text-slate-900 text-xs">Authorized Administrator Accounts</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddAdmin(!showAddAdmin)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer transition-colors shadow-2xs"
              >
                <UserPlus className="w-3 h-3 text-emerald-600" />
                <span>{showAddAdmin ? 'Cancel' : 'Create Admin'}</span>
              </button>
            </div>

            {/* Admin Accounts List */}
            <div className="space-y-1.5">
              {adminAccounts.map((acc) => {
                const isPrimary = 
                  acc.email.toLowerCase() === 'orders@panzerautoparts.co.ke' || 
                  acc.id === 'admin-operations';
                const isCurrent = currentAdmin?.email.toLowerCase() === acc.email.toLowerCase();

                return (
                  <div
                    key={acc.id}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                        {acc.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-900 truncate">{acc.displayName}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                              Current
                            </span>
                          )}
                          {isPrimary && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                              Primary Admin
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono block truncate">{acc.email}</span>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500 font-mono">
                          <Key className="w-3 h-3 text-slate-400" />
                          <span>Password:</span>
                          <span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            {showPasswordMap[acc.id] ? (acc.password || 'Panzer@Admin2026') : '••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowPasswordMap((prev) => ({ ...prev, [acc.id]: !prev[acc.id] }))}
                            className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                          >
                            {showPasswordMap[acc.id] ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        {acc.role}
                      </span>
                      {!isPrimary && onDeleteAdminAccount && (
                        <button
                          type="button"
                          onClick={() => onDeleteAdminAccount(acc.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Delete Admin Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Inline Add Admin Form */}
            {showAddAdmin && (
              <div className="p-3 bg-white border border-slate-300 rounded-lg space-y-2.5 animate-in fade-in">
                <span className="font-bold text-slate-900 block text-xs">Provision New Admin Account</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Admin Full Name</label>
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="e.g. John Kamau"
                      className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Admin Email</label>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@panzerautoparts.co.ke"
                      className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Admin Password</label>
                    <input
                      type="text"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="e.g. Panzer@Admin2026"
                      className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Role / Clearance</label>
                    <select
                      value={adminRole}
                      onChange={(e) => setAdminRole(e.target.value as AdminRole)}
                      className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
                    >
                      <option value="SUPER_ADMIN">Super Administrator (Full Ledger, Stock & Settings)</option>
                      <option value="INVENTORY_MANAGER">Inventory Manager (Stock, Reordering & Pricing)</option>
                      <option value="SALES_CLERK">Sales Counter Clerk (Point of Sale & Invoices)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddAdmin(false)}
                    className="px-2.5 py-1 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateAdmin}
                    className="px-3 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Save Admin Account</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================= */}
          {/* 2. CURRENCY & EXCHANGE RATES                                  */}
          {/* ============================================================= */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Base Currency Symbol
              </label>
              <input
                type="text"
                required
                value={form.currencySymbol}
                onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Default: KSh</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Currency Code (ISO)
              </label>
              <input
                type="text"
                required
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Default: KES</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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

          {/* ============================================================= */}
          {/* 3. BUSINESS DETAILS FOR INVOICES                              */}
          {/* ============================================================= */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Business / Company Name
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
                Contact Phone / WhatsApp
              </label>
              <input
                type="text"
                value={form.businessPhone}
                onChange={(e) => setForm({ ...form, businessPhone: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Official Business Email
              </label>
              <input
                type="email"
                value={form.businessEmail || ''}
                onChange={(e) => setForm({ ...form, businessEmail: e.target.value })}
                placeholder="orders@panzerautoparts.co.ke"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                BRS Company Reg #
              </label>
              <input
                type="text"
                value={form.businessRegNumber || ''}
                onChange={(e) => setForm({ ...form, businessRegNumber: e.target.value })}
                placeholder="e.g. PVT-EYU7821 / CPR/2021/849204"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                M-Pesa Paybill No.
              </label>
              <input
                type="text"
                value={form.mpesaPaybillNumber || '522522'}
                onChange={(e) => setForm({ ...form, mpesaPaybillNumber: e.target.value })}
                placeholder="522522"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                M-Pesa Account No. (Acc No)
              </label>
              <input
                type="text"
                value={form.mpesaAccountNumber || '1358024235'}
                onChange={(e) => setForm({ ...form, mpesaAccountNumber: e.target.value })}
                placeholder="1358024235"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs font-semibold text-emerald-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Account / Till Name
              </label>
              <input
                type="text"
                value={form.mpesaAccountName || 'PANZER AUTOPARTS LTD'}
                onChange={(e) => setForm({ ...form, mpesaAccountName: e.target.value })}
                placeholder="PANZER AUTOPARTS LTD"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                M-Pesa Buy Goods Till
              </label>
              <input
                type="text"
                value={form.mpesaTillNumber || '522522'}
                onChange={(e) => setForm({ ...form, mpesaTillNumber: e.target.value })}
                placeholder="522522"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
              />
            </div>
          </div>

          {/* ============================================================= */}
          {/* 3B. SAFARICOM M-PESA DARAJA SANDBOX INTEGRATION               */}
          {/* ============================================================= */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>M-Pesa Daraja Sandbox Configuration</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-mono rounded border border-emerald-300">
                      STK Push
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Connect your app from developer.safaricom.co.ke for real customer STK push prompts
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestDaraja}
                  disabled={testingDaraja}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded border border-emerald-300 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${testingDaraja ? 'animate-spin' : ''}`} />
                  <span>{testingDaraja ? 'Testing...' : 'Test Daraja API'}</span>
                </button>
              </div>
            </div>

            {/* Firebase Security & Storage Banner */}
            <div className="p-2.5 bg-emerald-900/5 border border-emerald-300/80 rounded-lg flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-800 space-y-0.5 flex-1">
                <div className="font-bold text-emerald-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>Stored in Firebase Firestore</span>
                    <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-mono rounded border border-emerald-300">
                      /settings/secrets
                    </span>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Server-Side Isolated
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 leading-tight">
                  Your Daraja Consumer Key, Secret, and Passkey are stored securely in your Firebase Firestore database and loaded server-side only. Client browsers cannot read secrets, and they are never stored in browser localStorage.
                </p>
                {serverMpesaStatus?.configured && (
                  <div className="pt-1 flex items-center gap-2 text-[10px] text-emerald-900 font-mono font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                    <span>Active Key in Firestore: {serverMpesaStatus.maskedConsumerKey || 'Configured (Masked)'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Test Status Banner */}
            {darajaTestStatus && (
              <div className={`p-2.5 rounded-lg border flex items-center gap-2 text-xs ${
                darajaTestStatus.success 
                  ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900' 
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {darajaTestStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <div>
                  <div className="font-semibold">{darajaTestStatus.message}</div>
                  {darajaTestStatus.tokenPreview && (
                    <div className="text-[10px] font-mono text-emerald-700 mt-0.5">
                      Bearer Token: {darajaTestStatus.tokenPreview}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Firebase Save Status Message */}
            {darajaFirebaseSavedMsg && (
              <div className="p-2 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>{darajaFirebaseSavedMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Daraja Consumer Key
                </label>
                <input
                  type="text"
                  value={form.mpesaConsumerKey || ''}
                  onChange={(e) => setForm({ ...form, mpesaConsumerKey: e.target.value.trim() })}
                  placeholder={serverMpesaStatus?.maskedConsumerKey ? `Saved: ${serverMpesaStatus.maskedConsumerKey}` : "Paste Consumer Key from Daraja app"}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Daraja Consumer Secret
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowDarajaSecret(!showDarajaSecret)}
                    className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer"
                  >
                    {showDarajaSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showDarajaSecret ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  type={showDarajaSecret ? 'text' : 'password'}
                  value={form.mpesaConsumerSecret || ''}
                  onChange={(e) => setForm({ ...form, mpesaConsumerSecret: e.target.value.trim() })}
                  placeholder={serverMpesaStatus?.configured ? "••••••••••••••••••••••••••••••••" : "Paste Consumer Secret from Daraja app"}
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  M-Pesa Shortcode (Business / Paybill)
                </label>
                <input
                  type="text"
                  value={form.mpesaShortcode || '522522'}
                  onChange={(e) => setForm({ ...form, mpesaShortcode: e.target.value.trim() })}
                  placeholder="522522"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 font-bold"
                />
                <span className="text-[10px] text-emerald-700 mt-0.5 block font-medium">Paybill No: 522522</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  M-Pesa Account No. (AccountReference)
                </label>
                <input
                  type="text"
                  value={form.mpesaAccountNumber || '1358024235'}
                  onChange={(e) => setForm({ ...form, mpesaAccountNumber: e.target.value.trim() })}
                  placeholder="1358024235"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 font-bold text-emerald-800"
                />
                <span className="text-[10px] text-emerald-700 mt-0.5 block font-medium">Acc No: 1358024235 ({form.mpesaAccountName || 'PANZER AUTOPARTS LTD'})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Account / Till Name
                </label>
                <input
                  type="text"
                  value={form.mpesaAccountName || 'PANZER AUTOPARTS LTD'}
                  onChange={(e) => setForm({ ...form, mpesaAccountName: e.target.value.trim() })}
                  placeholder="PANZER AUTOPARTS LTD"
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Merchant account name</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Sandbox Passkey (Lipa na M-Pesa Online)
                </label>
                <input
                  type="password"
                  value={form.mpesaPasskey || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'}
                  onChange={(e) => setForm({ ...form, mpesaPasskey: e.target.value.trim() })}
                  placeholder="bfb279f9aa9bdbcf..."
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Standard Safaricom Sandbox passkey prefilled</span>
              </div>
            </div>

            {/* Save directly to Firebase button */}
            {(form.mpesaConsumerKey || form.mpesaConsumerSecret || form.mpesaPasskey) && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveDarajaToFirebase}
                  disabled={savingDarajaToFirebase}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 shadow-2xs"
                >
                  <Lock className={`w-3.5 h-3.5 ${savingDarajaToFirebase ? 'animate-spin' : ''}`} />
                  <span>{savingDarajaToFirebase ? 'Saving to Firebase...' : 'Save Credentials to Firebase'}</span>
                </button>
              </div>
            )}

            {/* Live Callback Webhook URL */}
            <div className="pt-2 border-t border-emerald-200/80">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Your Live M-Pesa Callback URL (Webhook)
                </label>
                <span className="text-[10px] text-emerald-700 font-medium">Automatic / Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/api/mpesa/callback` : 'https://ais-pre-mv7ldzdjmmo75pxhj6bimh-448542184449.europe-west2.run.app/api/mpesa/callback'}
                  className="w-full p-2 bg-slate-900 text-emerald-400 border border-slate-700 rounded-lg font-mono text-[11px] select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = typeof window !== 'undefined' ? `${window.location.origin}/api/mpesa/callback` : 'https://ais-pre-mv7ldzdjmmo75pxhj6bimh-448542184449.europe-west2.run.app/api/mpesa/callback';
                    navigator.clipboard.writeText(url);
                    setCopiedCallback(true);
                    setTimeout(() => setCopiedCallback(false), 2000);
                  }}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors shadow-2xs"
                >
                  {copiedCallback ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                This URL is built into your backend. If Safaricom's simulator or portal asks for a "CallBackURL", paste this link.
              </p>
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
              Default is 1234. Used when double-clicking the Panzer Autoparts logo to enter admin mode.
            </span>
          </div>

          {/* ============================================================= */}
          {/* 4. CLOUD DATABASE SYNCHRONIZATION                             */}
          {/* ============================================================= */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cloud Database Synchronization</span>
              </span>
              <button
                type="button"
                onClick={handleTestFirebase}
                disabled={testingFirebase}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 cursor-pointer transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${testingFirebase ? 'animate-spin' : ''}`} />
                <span>{testingFirebase ? 'Testing Connection...' : 'Test Database Connection'}</span>
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-slate-500">Live Status:</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  <span>Cloud Database Active</span>
                </span>
              </div>

              {firebaseStatus && (
                <div className={`mt-2 p-2.5 rounded-lg border flex items-center gap-2 ${
                  firebaseStatus.connected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-medium text-xs">{firebaseStatus.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================= */}
          {/* 5. DATA BACKUP & RESTORE                                      */}
          {/* ============================================================= */}
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

          {/* ============================================================= */}
          {/* 6. CLEAR INVENTORY & DEMO DATA                                */}
          {/* ============================================================= */}
          <div className="pt-3 border-t border-slate-200">
            <span className="block font-semibold text-rose-700 mb-1">
              Clear All Inventory & Demo Records
            </span>
            <p className="text-[11px] text-slate-500 mb-2">
              Remove all spare parts, suppliers, sales records, and stock movements to start with a clean, empty inventory for entering your actual data. Store credentials, Paybill settings, and admin logins are preserved.
            </p>
            {!showResetConfirm ? (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-1.5 text-xs text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear All Catalog & Sales Data</span>
              </button>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-rose-800 font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Are you sure? This will wipe all current parts, suppliers, sales records, and audit logs.</span>
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
                    Yes, Clear Everything
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">
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
