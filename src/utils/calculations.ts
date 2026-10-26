import { SparePart, SaleRecord } from '../types/inventory';

export function formatCurrency(amount: number, symbol = 'KSh'): string {
  if (isNaN(amount) || amount === null || amount === undefined) return `${symbol} 0`;
  const hasDecimals = Math.abs(amount % 1) >= 0.01;
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
  if (symbol === '$' || symbol === '£' || symbol === '€') {
    return `${symbol}${formatted}`;
  }
  return `${symbol} ${formatted}`;
}

export function formatNumber(num: number): string {
  if (isNaN(num) || num === null || num === undefined) return '0';
  return num.toLocaleString('en-US');
}

export function calculateLandedCost(
  fobUsd: number,
  exchangeRateUsdToKsh: number = 130,
  freightPercent: number = 15,
  dutyPercent: number = 25,
  portClearanceKsh: number = 250
): number {
  const baseKsh = (fobUsd || 0) * exchangeRateUsdToKsh;
  const freight = (baseKsh * freightPercent) / 100;
  const duty = (baseKsh * dutyPercent) / 100;
  return Number((baseKsh + freight + duty + portClearanceKsh).toFixed(2));
}

export function calculatePriceFromMarkup(
  cost: number,
  markupPercent: number,
  taxRatePercent: number = 16
): { ex: number; inc: number } {
  const ex = Number((cost * (1 + markupPercent / 100)).toFixed(2));
  const inc = Number((ex * (1 + taxRatePercent / 100)).toFixed(2));
  return { ex, inc };
}

export function calculatePriceFromMargin(
  cost: number,
  marginPercent: number,
  taxRatePercent: number = 16
): { ex: number; inc: number } {
  if (marginPercent >= 100) marginPercent = 99.9;
  const ex = Number((cost / (1 - marginPercent / 100)).toFixed(2));
  const inc = Number((ex * (1 + taxRatePercent / 100)).toFixed(2));
  return { ex, inc };
}

export function calculateIncFromEx(ex: number, taxRatePercent: number = 16): number {
  return Number((ex * (1 + taxRatePercent / 100)).toFixed(2));
}

export function calculateExFromInc(inc: number, taxRatePercent: number = 16): number {
  return Number((inc / (1 + taxRatePercent / 100)).toFixed(2));
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export function getStockStatus(stock: number, minStock: number): StockStatus {
  if (stock <= 0) return 'OUT_OF_STOCK';
  if (stock <= minStock) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export function getStockStatusLabel(status: StockStatus): string {
  switch (status) {
    case 'OUT_OF_STOCK':
      return 'Out of Stock';
    case 'LOW_STOCK':
      return 'Low Stock Alert';
    case 'IN_STOCK':
      return 'In Stock';
  }
}

export interface InventoryMetrics {
  totalSkus: number;
  totalUnits: number;
  totalFobValueUsd: number;
  totalLandedValueUsd: number;
  totalRetailValueEx: number;
  totalRetailValueInc: number;
  unrealizedProfit: number;
  unrealizedMarginPercent: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export function calculateInventoryMetrics(parts: SparePart[]): InventoryMetrics {
  let totalUnits = 0;
  let totalFobValueUsd = 0;
  let totalLandedValueUsd = 0;
  let totalRetailValueEx = 0;
  let totalRetailValueInc = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const p of parts) {
    const qty = Math.max(0, p.stockQuantity);
    totalUnits += qty;
    totalFobValueUsd += (p.unitCostFobUsd || 0) * qty;
    totalLandedValueUsd += (p.unitCostLanded || 0) * qty;
    totalRetailValueEx += (p.retailPriceEx || 0) * qty;
    totalRetailValueInc += (p.retailPriceInc || 0) * qty;

    if (p.stockQuantity <= 0) {
      outOfStockCount++;
    } else if (p.stockQuantity <= p.minStockLevel) {
      lowStockCount++;
    }
  }

  const unrealizedProfit = totalRetailValueEx - totalLandedValueUsd;
  const unrealizedMarginPercent = totalRetailValueEx > 0 
    ? (unrealizedProfit / totalRetailValueEx) * 100 
    : 0;

  return {
    totalSkus: parts.length,
    totalUnits,
    totalFobValueUsd: Number(totalFobValueUsd.toFixed(2)),
    totalLandedValueUsd: Number(totalLandedValueUsd.toFixed(2)),
    totalRetailValueEx: Number(totalRetailValueEx.toFixed(2)),
    totalRetailValueInc: Number(totalRetailValueInc.toFixed(2)),
    unrealizedProfit: Number(unrealizedProfit.toFixed(2)),
    unrealizedMarginPercent: Number(unrealizedMarginPercent.toFixed(1)),
    lowStockCount,
    outOfStockCount,
  };
}

export interface SalesMetrics {
  totalSalesCount: number;
  totalUnitsSold: number;
  totalRevenueEx: number;
  totalRevenueInc: number;
  totalCogsLanded: number;
  totalGrossProfit: number;
  overallMarginPercent: number;
}

export function calculateSalesMetrics(sales: SaleRecord[]): SalesMetrics {
  let totalUnitsSold = 0;
  let totalRevenueEx = 0;
  let totalRevenueInc = 0;
  let totalCogsLanded = 0;
  let totalGrossProfit = 0;

  for (const s of sales) {
    totalUnitsSold += s.totalUnits || 0;
    totalRevenueEx += s.subtotalEx || 0;
    totalRevenueInc += s.totalInc || 0;
    totalCogsLanded += s.totalCogsLanded || 0;
    totalGrossProfit += s.totalGrossProfit || 0;
  }

  const overallMarginPercent = totalRevenueEx > 0 
    ? (totalGrossProfit / totalRevenueEx) * 100 
    : 0;

  return {
    totalSalesCount: sales.length,
    totalUnitsSold,
    totalRevenueEx: Number(totalRevenueEx.toFixed(2)),
    totalRevenueInc: Number(totalRevenueInc.toFixed(2)),
    totalCogsLanded: Number(totalCogsLanded.toFixed(2)),
    totalGrossProfit: Number(totalGrossProfit.toFixed(2)),
    overallMarginPercent: Number(overallMarginPercent.toFixed(1)),
  };
}
