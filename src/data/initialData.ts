import { SparePart, SaleRecord, StockMovement, InventorySettings, Supplier, AdminAccount } from '../types/inventory';

export const DEFAULT_SETTINGS: InventorySettings = {
  currency: 'KES',
  currencySymbol: 'KSh',
  usdToKshRate: 130, // 1 USD = 130 KSh
  defaultTaxRatePercent: 16, // 16% standard VAT
  businessName: 'Panzer Autoparts Limited',
  businessAddress: 'Enterprise Road, Commercial Centre, Industrial Area, Nairobi, Kenya',
  businessPhone: '+254 722 849 204',
  businessTaxId: 'P051892048X', // KRA e-TIMS PIN
  businessRegNumber: 'PVT-EYU7821 / CPR/2021/849204', // Kenyan Company Reg No
  mpesaPaybillNumber: '522522', // M-Pesa Business / Paybill Number
  mpesaTillNumber: '522522', // Lipa na M-Pesa Buy Goods Till
  mpesaShortcode: '522522', // Direct prompts to Paybill 522522
  mpesaAccountNumber: '1358024235', // Account Number under Paybill 522522
  mpesaAccountName: 'PANZER AUTOPARTS LTD', // Account / Till Name
  mpesaPasskey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919', // Standard Sandbox passkey
  mpesaEnvironment: 'sandbox',
  businessEmail: 'orders@panzerautoparts.co.ke',
  adminAccessCode: '1234',
};

// Clean initial collections ready for actual user data entry (no demo data)
export const INITIAL_SUPPLIERS: Supplier[] = [];

export const INITIAL_PARTS: SparePart[] = [];

export const INITIAL_SALES: SaleRecord[] = [];

export const INITIAL_MOVEMENTS: StockMovement[] = [];

export const INITIAL_ADMINS: AdminAccount[] = [
  {
    id: 'admin-operations',
    email: 'orders@panzerautoparts.co.ke',
    displayName: 'Panzer Operations Admin',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    password: 'Panzer@Admin2026',
    createdAt: '2026-10-29T08:00:00Z',
    lastLogin: '2026-10-30T01:00:00Z',
  },
  {
    id: 'admin-kerosi',
    email: 'kerosicarl@gmail.com',
    displayName: 'Carl Kerosi (Super Admin)',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    password: 'Panzer@Admin2026',
    createdAt: '2026-10-29T08:00:00Z',
    lastLogin: '2026-10-30T01:00:00Z',
  },
];
