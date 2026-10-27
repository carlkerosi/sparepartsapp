export interface Supplier {
  id: string;
  name: string;
  code: string; // e.g. "SUP-DENSO", "SUP-AKEBONO"
  contactPerson: string;
  email: string;
  phone: string;
  website?: string;
  physicalAddress?: string;
  country: string;
  paymentTerms: string; // e.g. "Net 30 Days", "Net 60 Days", "Letter of Credit (LC)", "Cash in Advance (FOB)", "Net 15 Days"
  currency: string; // "USD", "EUR", "JPY"
  leadTimeDays: number; // e.g. 21
  shippingTerms: string; // e.g. "FOB Yokohama", "FOB Shanghai", "CIF Mombasa", "EXW Stuttgart"
  notes?: string;
  rating: number; // 1 to 5
  status: 'ACTIVE' | 'INACTIVE' | 'UNDER_REVIEW';
  createdAt: string;
  updatedAt: string;
}

export interface SparePart {
  id: string;
  partNumber: string;
  description: string;
  category: string;
  unitCostFobUsd: number; // FOB Cost in USD
  unitCostLanded: number; // Landed Cost (FOB + Freight + Duty + Clearance)
  retailPriceEx: number;  // Retail Price per unit Ex-Tax/VAT
  retailPriceInc: number; // Retail Price per unit Inc-Tax/VAT
  stockQuantity: number;  // Real-time stock on hand
  minStockLevel: number;  // Low stock threshold
  location: string;       // Bin / Rack / Shelf
  oemReference?: string;  // OEM cross-reference
  vehicleCompatibility?: string; // e.g. "Toyota Hilux / Land Cruiser Prado 2.8L"
  supplierId?: string;    // Foreign key to Supplier model
  supplier?: string;      // Cached/display supplier name
  imageUrl?: string;      // Product image URL or data URI
  lastUpdated: string;
}

export interface SaleItem {
  partId: string;
  partNumber: string;
  description: string;
  imageUrl?: string;
  quantity: number;
  unitCostFobUsd: number;
  unitCostLanded: number;
  unitPriceEx: number;
  unitPriceInc: number;
  lineTotalEx: number;
  lineTotalInc: number;
  grossProfit: number; // lineTotalEx - (quantity * unitCostLanded)
  marginPercent: number; // (grossProfit / lineTotalEx) * 100
}

export interface SaleRecord {
  id: string;
  invoiceNumber: string;
  timestamp: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress?: string;
  vehicleRef?: string; // Vehicle Reg / Model / Job card
  items: SaleItem[];
  totalUnits: number;
  subtotalEx: number;
  taxAmount: number;
  totalInc: number;
  totalCogsLanded: number;
  totalGrossProfit: number;
  marginPercent: number;
  paymentMethod: 'Cash' | 'Credit Card' | 'Bank Transfer' | 'Store Credit' | 'Mobile Money';
  mpesaReceiptNumber?: string;
  salesPerson?: string;
  notes?: string;
}

export type MovementType = 'SALE' | 'PURCHASE_RECEIPT' | 'ADJUSTMENT' | 'RETURN';

export interface StockMovement {
  id: string;
  partId: string;
  partNumber: string;
  description: string;
  timestamp: string;
  type: MovementType;
  quantityDelta: number; // negative for sales/decrements, positive for restock
  previousStock: number;
  newStock: number;
  referenceDoc: string; // e.g. Invoice #, PO #, Reason
  user?: string;
  notes?: string;
}

export interface InventorySettings {
  currency: string;
  currencySymbol: string;
  usdToKshRate: number; // e.g. 130 KSh per 1 USD
  defaultTaxRatePercent: number; // e.g. 16% VAT
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessTaxId: string;
  businessRegNumber?: string; // Kenyan Company Reg No (e.g. PVT-EYU7821 / CPR/2021/849204)
  mpesaPaybillNumber?: string; // Lipa na M-Pesa Business No. (Paybill)
  mpesaTillNumber?: string; // Lipa na M-Pesa Buy Goods Till No.
  businessEmail?: string;
  adminAccessCode?: string; // Default '1234'
}

