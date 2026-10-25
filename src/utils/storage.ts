import { SparePart, SaleRecord, StockMovement, InventorySettings, Supplier } from '../types/inventory';
import { INITIAL_PARTS, INITIAL_SALES, INITIAL_MOVEMENTS, DEFAULT_SETTINGS, INITIAL_SUPPLIERS } from '../data/initialData';

const STORAGE_KEYS = {
  SUPPLIERS: 'partpulse_suppliers_v2',
  PARTS: 'partpulse_parts_v2',
  SALES: 'partpulse_sales_v2',
  MOVEMENTS: 'partpulse_movements_v2',
  SETTINGS: 'partpulse_settings_v2',
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
    if (!Array.isArray(parsed) || !parsed.some((p: SparePart) => p.id?.startsWith('part-rr-'))) {
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

export function resetAllData(): { suppliers: Supplier[]; parts: SparePart[]; sales: SaleRecord[]; movements: StockMovement[] } {
  saveSuppliers(INITIAL_SUPPLIERS);
  saveParts(INITIAL_PARTS);
  saveSales(INITIAL_SALES);
  saveMovements(INITIAL_MOVEMENTS);
  saveSettings(DEFAULT_SETTINGS);
  return {
    suppliers: INITIAL_SUPPLIERS,
    parts: INITIAL_PARTS,
    sales: INITIAL_SALES,
    movements: INITIAL_MOVEMENTS,
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
