import { SparePart, SaleRecord, StockMovement, InventorySettings, Supplier, AdminAccount } from '../types/inventory';
import { INITIAL_PARTS, INITIAL_SALES, INITIAL_MOVEMENTS, DEFAULT_SETTINGS, INITIAL_SUPPLIERS, INITIAL_ADMINS } from '../data/initialData';

const STORAGE_KEYS = {
  SUPPLIERS: 'panzer_suppliers_v5',
  PARTS: 'panzer_parts_v5',
  SALES: 'panzer_sales_v5',
  MOVEMENTS: 'panzer_movements_v5',
  SETTINGS: 'panzer_settings_v5',
  ADMINS: 'panzer_admins_v5',
};

export function loadSuppliers(): Supplier[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    if (!raw) {
      saveSuppliers(INITIAL_SUPPLIERS);
      return INITIAL_SUPPLIERS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load suppliers from localStorage', err);
    return INITIAL_SUPPLIERS;
  }
}

export function saveSuppliers(suppliers: Supplier[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  } catch (err) {
    console.error('Failed to save suppliers to localStorage', err);
  }
}

export function loadParts(): SparePart[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PARTS);
    if (!raw) {
      saveParts(INITIAL_PARTS);
      return INITIAL_PARTS;
    }
    const parsed = JSON.parse(raw);
    const hasStrictRangeRoverCatalog = parsed.some((p: SparePart) => p.id === 'part-rr-brk-disc-f');
    if (!Array.isArray(parsed) || !hasStrictRangeRoverCatalog) {
      saveParts(INITIAL_PARTS);
      return INITIAL_PARTS;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load parts from localStorage', err);
    return INITIAL_PARTS;
  }
}

export function saveParts(parts: SparePart[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PARTS, JSON.stringify(parts));
  } catch (err) {
    console.error('Failed to save parts to localStorage', err);
  }
}

export function loadSales(): SaleRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SALES);
    if (!raw) {
      saveSales(INITIAL_SALES);
      return INITIAL_SALES;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load sales from localStorage', err);
    return INITIAL_SALES;
  }
}

export function saveSales(sales: SaleRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  } catch (err) {
    console.error('Failed to save sales to localStorage', err);
  }
}

export function loadMovements(): StockMovement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    if (!raw) {
      saveMovements(INITIAL_MOVEMENTS);
      return INITIAL_MOVEMENTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load movements from localStorage', err);
    return INITIAL_MOVEMENTS;
  }
}

export function saveMovements(movements: StockMovement[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
  } catch (err) {
    console.error('Failed to save movements to localStorage', err);
  }
}

export function loadSettings(): InventorySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Failed to load settings from localStorage', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: InventorySettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to localStorage', err);
  }
}

export function loadAdminAccounts(): AdminAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ADMINS);
    if (!raw) {
      saveAdminAccounts(INITIAL_ADMINS);
      return INITIAL_ADMINS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveAdminAccounts(INITIAL_ADMINS);
      return INITIAL_ADMINS;
    }
    // Ensure Carl Kerosi is always included
    const hasCarl = parsed.some((a: AdminAccount) => a.email.toLowerCase() === 'kerosicarl@gmail.com');
    if (!hasCarl) {
      const merged = [INITIAL_ADMINS[0], ...parsed];
      saveAdminAccounts(merged);
      return merged;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load admin accounts from localStorage', err);
    return INITIAL_ADMINS;
  }
}

export function saveAdminAccounts(admins: AdminAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ADMINS, JSON.stringify(admins));
  } catch (err) {
    console.error('Failed to save admin accounts to localStorage', err);
  }
}

export function resetAllData(): { suppliers: Supplier[]; parts: SparePart[]; sales: SaleRecord[]; movements: StockMovement[]; admins: AdminAccount[] } {
  saveSuppliers(INITIAL_SUPPLIERS);
  saveParts(INITIAL_PARTS);
  saveSales(INITIAL_SALES);
  saveMovements(INITIAL_MOVEMENTS);
  saveSettings(DEFAULT_SETTINGS);
  saveAdminAccounts(INITIAL_ADMINS);
  return {
    suppliers: INITIAL_SUPPLIERS,
    parts: INITIAL_PARTS,
    sales: INITIAL_SALES,
    movements: INITIAL_MOVEMENTS,
    admins: INITIAL_ADMINS,
  };
}

export function exportPartsCsv(parts: SparePart[]): void {
  const headers = [
    'Part Number',
    'Description',
    'Category',
    'FOB Cost (USD)',
    'Landed Cost',
    'Retail Price Ex',
    'Retail Price Inc',
    'Stock Qty',
    'Min Stock',
    'Location',
    'OEM Reference',
    'Vehicle Compatibility',
    'Supplier',
    'Last Updated',
  ];

  const rows = parts.map((p) => [
    `"${p.partNumber.replace(/"/g, '""')}"`,
    `"${p.description.replace(/"/g, '""')}"`,
    `"${(p.category || '').replace(/"/g, '""')}"`,
    p.unitCostFobUsd.toFixed(2),
    p.unitCostLanded.toFixed(2),
    p.retailPriceEx.toFixed(2),
    p.retailPriceInc.toFixed(2),
    p.stockQuantity,
    p.minStockLevel,
    `"${(p.location || '').replace(/"/g, '""')}"`,
    `"${(p.oemReference || '').replace(/"/g, '""')}"`,
    `"${(p.vehicleCompatibility || '').replace(/"/g, '""')}"`,
    `"${(p.supplier || '').replace(/"/g, '""')}"`,
    p.lastUpdated,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadBlob(csvContent, `parts_inventory_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
}

export function exportSalesCsv(sales: SaleRecord[]): void {
  const headers = [
    'Invoice Number',
    'Date & Time',
    'Customer Name',
    'Vehicle/Job Ref',
    'Payment Method',
    'Part Number',
    'Part Description',
    'Qty Sold',
    'Unit FOB Cost USD',
    'Unit Landed Cost',
    'Unit Price Ex',
    'Unit Price Inc',
    'Line Total Ex',
    'Line Total Inc',
    'Gross Profit',
    'Margin %',
  ];

  const rows: string[] = [];

  for (const s of sales) {
    for (const it of s.items) {
      rows.push(
        [
          `"${s.invoiceNumber}"`,
          `"${s.timestamp}"`,
          `"${s.customerName.replace(/"/g, '""')}"`,
          `"${(s.vehicleRef || '').replace(/"/g, '""')}"`,
          `"${s.paymentMethod}"`,
          `"${it.partNumber.replace(/"/g, '""')}"`,
          `"${it.description.replace(/"/g, '""')}"`,
          it.quantity,
          it.unitCostFobUsd.toFixed(2),
          it.unitCostLanded.toFixed(2),
          it.unitPriceEx.toFixed(2),
          it.unitPriceInc.toFixed(2),
          it.lineTotalEx.toFixed(2),
          it.lineTotalInc.toFixed(2),
          it.grossProfit.toFixed(2),
          it.marginPercent.toFixed(1),
        ].join(',')
      );
    }
  }

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  downloadBlob(csvContent, `spare_parts_sales_records_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type: `${type};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
