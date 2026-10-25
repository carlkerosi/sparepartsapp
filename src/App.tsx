import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SparePart, SaleRecord, StockMovement, InventorySettings, MovementType, Supplier, SaleItem } from './types/inventory';
import { 
  loadParts, 
  saveParts, 
  loadSales, 
  saveSales, 
  loadMovements, 
  saveMovements, 
  loadSettings, 
  saveSettings, 
  loadSuppliers,
  saveSuppliers,
  resetAllData, 
  exportPartsCsv, 
  exportSalesCsv 
} from './utils/storage';
import { testConnection } from './lib/firebase';
import { 
  subscribeSuppliers, 
  subscribeParts, 
  subscribeSales, 
  subscribeMovements,
  saveSupplierToFirestore,
  deleteSupplierFromFirestore,
  savePartToFirestore,
  deletePartFromFirestore,
  saveSaleToFirestore,
  saveMovementToFirestore
} from './services/firebaseService';
import { calculateInventoryMetrics, calculateSalesMetrics, calculateIncFromEx } from './utils/calculations';
import { Header, ActiveTab } from './components/Header';
import { StatSummaryStrip } from './components/StatSummaryStrip';
import { InventoryTable } from './components/InventoryTable';
import { PartModal } from './components/PartModal';
import { NewSaleModal } from './components/NewSaleModal';
import { InvoiceReceiptModal } from './components/InvoiceReceiptModal';
import { SalesLedger } from './components/SalesLedger';
import { StockMovementLog } from './components/StockMovementLog';
import { ReorderRestockModal } from './components/ReorderRestockModal';
import { ValuationAnalytics } from './components/ValuationAnalytics';
import { StockAdjustModal } from './components/StockAdjustModal';
import { SettingsModal } from './components/SettingsModal';
import { SuppliersManagement } from './components/SuppliersManagement';
import { SupplierModal } from './components/SupplierModal';
import { SupplierPartsDrawer } from './components/SupplierPartsDrawer';

// Storefront Customer Components
import { StorefrontHeader } from './components/storefront/StorefrontHeader';
import { StorefrontHero } from './components/storefront/StorefrontHero';
import { StorefrontCatalog } from './components/storefront/StorefrontCatalog';
import { StorefrontFooter } from './components/storefront/StorefrontFooter';
import { CartDrawer, CartItem } from './components/storefront/CartDrawer';
import { ProductDetailModal } from './components/storefront/ProductDetailModal';
import { CheckoutModal } from './components/storefront/CheckoutModal';
import { AdminAccessModal } from './components/storefront/AdminAccessModal';
import { ShoppingCart } from 'lucide-react';

export default function App() {
  // Primary database state (initialized from local storage, synced with Firebase in real time)
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => loadSuppliers());
  const [parts, setParts] = useState<SparePart[]>(() => loadParts());
  const [sales, setSales] = useState<SaleRecord[]>(() => loadSales());
  const [movements, setMovements] = useState<StockMovement[]>(() => loadMovements());
  const [settings, setSettings] = useState<InventorySettings>(() => loadSettings());

  // Application View Mode: Customer 'storefront' vs Admin 'admin'
  const [viewMode, setViewMode] = useState<'storefront' | 'admin'>('storefront');
  const [isAdminAccessModalOpen, setIsAdminAccessModalOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastNotification({ text, type });
    setTimeout(() => setToastNotification(null), 4000);
  }, []);

  // Storefront Specific States
  const [storefrontCategory, setStorefrontCategory] = useState<string>('ALL');
  const [storefrontSearch, setStorefrontSearch] = useState<string>('');
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('partpulse_cart_v2');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (it) => it && it.part && typeof it.part.id === 'string' && typeof it.quantity === 'number'
      );
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<SparePart | null>(null);
  const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);

  // Admin UI Navigation state
  const [activeTab, setActiveTab] = useState<ActiveTab>('inventory');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK'>('ALL');

  // Supplier modal controls
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [isSupplierPartsDrawerOpen, setIsSupplierPartsDrawerOpen] = useState(false);
  const [activeSupplierForDrawer, setActiveSupplierForDrawer] = useState<Supplier | null>(null);
  const [prefilledSupplierIdForPart, setPrefilledSupplierIdForPart] = useState<string | undefined>(undefined);

  // Sales modal controls
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
  const [saleInitialPart, setSaleInitialPart] = useState<SparePart | null>(null);

  // Part modal controls
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [partToEdit, setPartToEdit] = useState<SparePart | null>(null);

  // Invoice modal controls
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeReceiptSale, setActiveReceiptSale] = useState<SaleRecord | null>(null);

  // Stock Adjust modal controls
  const [isStockAdjustModalOpen, setIsStockAdjustModalOpen] = useState(false);
  const [stockAdjustPart, setStockAdjustPart] = useState<SparePart | null>(null);
  const [stockAdjustDelta, setStockAdjustDelta] = useState<number>(1);

  // Settings modal controls
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // 1. Firebase Live Synchronization & Test Probe
  useEffect(() => {
    testConnection().catch(console.warn);

    // Subscribe to Firestore collections in real time
    const unsubSuppliers = subscribeSuppliers(
      (newSuppliers) => {
        setSuppliers(newSuppliers);
        saveSuppliers(newSuppliers);
      },
      (err) => console.warn('Using local suppliers cache:', err)
    );

    const unsubParts = subscribeParts(
      (newParts) => {
        setParts(newParts);
        saveParts(newParts);
      },
      (err) => console.warn('Using local parts cache:', err)
    );

    const unsubSales = subscribeSales(
      (newSales) => {
        setSales(newSales);
        saveSales(newSales);
      },
      (err) => console.warn('Using local sales cache:', err)
    );

    const unsubMovements = subscribeMovements(
      (newMovements) => {
        setMovements(newMovements);
        saveMovements(newMovements);
      },
      (err) => console.warn('Using local movements cache:', err)
    );

    return () => {
      unsubSuppliers();
      unsubParts();
      unsubSales();
      unsubMovements();
    };
  }, []);

  // Sync state to local storage for instant availability
  useEffect(() => {
    saveSuppliers(suppliers);
  }, [suppliers]);

  useEffect(() => {
    saveParts(parts);
  }, [parts]);

  useEffect(() => {
    saveSales(sales);
  }, [sales]);

  useEffect(() => {
    saveMovements(movements);
  }, [movements]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Persist customer cart
  useEffect(() => {
    try {
      localStorage.setItem('partpulse_cart_v2', JSON.stringify(cartItems));
    } catch (e) {
      console.warn('Could not persist cart:', e);
    }
  }, [cartItems]);

  // Real-time inventory metrics
  const inventoryMetrics = useMemo(() => calculateInventoryMetrics(parts), [parts]);

  // Cart Quantities Lookup
  const cartQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    cartItems.forEach((it) => {
      if (it?.part?.id) {
        map[it.part.id] = (map[it.part.id] || 0) + (it.quantity || 0);
      }
    });
    return map;
  }, [cartItems]);

  const cartTotalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const price = item?.part?.retailPriceInc || 0;
      const qty = item?.quantity || 0;
      return sum + price * qty;
    }, 0);
  }, [cartItems]);

  const cartItemCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item?.quantity || 0), 0);
  }, [cartItems]);

  // -------------------------------------------------------------
  // STOREFRONT CUSTOMER ACTIONS
  // -------------------------------------------------------------
  const handleAddToCart = useCallback((part: SparePart, quantity: number = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((it) => it.part.id === part.id);
      if (existing) {
        const newQty = Math.min(part.stockQuantity, existing.quantity + quantity);
        return prev.map((it) => (it.part.id === part.id ? { ...it, quantity: newQty } : it));
      } else {
        const initQty = Math.min(part.stockQuantity, quantity);
        return [...prev, { part, quantity: initQty }];
      }
    });
  }, []);

  const handleUpdateCartQuantity = useCallback((partId: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((it) => {
          if (it.part.id === partId) {
            const nextQty = it.quantity + delta;
            if (nextQty <= 0) return null;
            const boundedQty = Math.min(it.part.stockQuantity, nextQty);
            return { ...it, quantity: boundedQty };
          }
          return it;
        })
        .filter((it): it is CartItem => it !== null);
    });
  }, []);

  const handleRemoveFromCart = useCallback((partId: string) => {
    setCartItems((prev) => prev.filter((it) => it.part.id !== partId));
  }, []);

  const handleQuickViewPart = useCallback((part: SparePart) => {
    setSelectedProductForDetail(part);
    setIsProductDetailOpen(true);
  }, []);

  // Customer Checkout: Places order, deducts stock, creates Invoice in Sales Ledger
  const handlePlaceCustomerOrder = useCallback(
    async (orderPayload: {
      customerName: string;
      customerPhone: string;
      vehicleRef?: string;
      deliveryAddress: string;
      paymentMethod: 'Mobile Money' | 'Cash' | 'Bank Transfer' | 'Credit Card';
      mpesaReceiptNumber?: string;
      notes?: string;
    }): Promise<SaleRecord> => {
      const now = new Date();
      const invoiceNumber = `INV-${now.getFullYear()}-${1000 + sales.length + 1}`;

      const saleItems: SaleItem[] = cartItems.map(({ part, quantity }) => {
        const lineTotalEx = part.retailPriceEx * quantity;
        const lineTotalInc = part.retailPriceInc * quantity;
        const costLandedTotal = part.unitCostLanded * quantity;
        const grossProfit = lineTotalEx - costLandedTotal;
        const marginPercent = lineTotalEx > 0 ? (grossProfit / lineTotalEx) * 100 : 0;

        return {
          partId: part.id,
          partNumber: part.partNumber,
          description: part.description,
          imageUrl: part.imageUrl,
          quantity,
          unitCostFobUsd: part.unitCostFobUsd,
          unitCostLanded: part.unitCostLanded,
          unitPriceEx: part.retailPriceEx,
          unitPriceInc: part.retailPriceInc,
          lineTotalEx,
          lineTotalInc,
          grossProfit,
          marginPercent,
        };
      });

      const totalUnits = saleItems.reduce((acc, it) => acc + it.quantity, 0);
      const subtotalEx = saleItems.reduce((acc, it) => acc + it.lineTotalEx, 0);
      const totalInc = saleItems.reduce((acc, it) => acc + it.lineTotalInc, 0);
      const taxAmount = totalInc - subtotalEx;
      const totalCogsLanded = saleItems.reduce((acc, it) => acc + it.quantity * it.unitCostLanded, 0);
      const totalGrossProfit = subtotalEx - totalCogsLanded;
      const marginPercent = subtotalEx > 0 ? (totalGrossProfit / subtotalEx) * 100 : 0;

      const newSaleRecord: SaleRecord = {
        id: `sale-${Date.now()}`,
        invoiceNumber,
        timestamp: now.toISOString(),
        customerName: orderPayload.customerName,
        customerPhone: orderPayload.customerPhone,
        deliveryAddress: orderPayload.deliveryAddress,
        vehicleRef: orderPayload.vehicleRef,
        items: saleItems,
        totalUnits,
        subtotalEx,
        taxAmount,
        totalInc,
        totalCogsLanded,
        totalGrossProfit,
        marginPercent,
        paymentMethod: orderPayload.paymentMethod,
        mpesaReceiptNumber: orderPayload.mpesaReceiptNumber,
        salesPerson: 'Online Customer Storefront',
        notes: `Delivery: ${orderPayload.deliveryAddress}. ${orderPayload.notes || ''}`.trim(),
      };

      // 1. Deduct stock in real-time
      const newMovements: StockMovement[] = [];
      const updatedParts = parts.map((part) => {
        const cartMatch = cartItems.find((it) => it.part.id === part.id);
        if (!cartMatch) return part;

        const previousStock = part.stockQuantity;
        const newStock = Math.max(0, part.stockQuantity - cartMatch.quantity);

        const mov: StockMovement = {
          id: `mov-${Date.now()}-${part.id}`,
          partId: part.id,
          partNumber: part.partNumber,
          description: part.description,
          timestamp: now.toISOString(),
          type: 'SALE',
          quantityDelta: -cartMatch.quantity,
          previousStock,
          newStock,
          referenceDoc: `Online Order ${invoiceNumber}`,
          user: 'Storefront Checkout',
          notes: `Customer Order by ${orderPayload.customerName}`,
        };

        newMovements.push(mov);

        return {
          ...part,
          stockQuantity: newStock,
          lastUpdated: now.toISOString(),
        };
      });

      // 2. Commit local state
      setParts(updatedParts);
      setSales([newSaleRecord, ...sales]);
      setMovements([...newMovements, ...movements]);
      setCartItems([]); // Empty cart upon successful order

      // 3. Persist to Firebase Firestore
      try {
        await saveSaleToFirestore(newSaleRecord);
        for (const mov of newMovements) {
          await saveMovementToFirestore(mov);
        }
        for (const it of cartItems) {
          const updated = updatedParts.find((p) => p.id === it.part.id);
          if (updated) await savePartToFirestore(updated);
        }
      } catch (e) {
        console.warn('Firebase order sync queued:', e);
      }

      return newSaleRecord;
    },
    [cartItems, sales, parts, movements]
  );

  // -------------------------------------------------------------
  // SUPPLIER ACTIONS
  // -------------------------------------------------------------
  const handleSaveSupplier = useCallback(
    async (
      supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>,
      existingId?: string
    ) => {
      const now = new Date().toISOString();
      let targetSupplier: Supplier;

      if (existingId) {
        const existing = suppliers.find((s) => s.id === existingId);
        targetSupplier = {
          ...supplierData,
          id: existingId,
          createdAt: existing?.createdAt || now,
          updatedAt: now,
        };
        const updated = suppliers.map((s) => (s.id === existingId ? targetSupplier : s));
        setSuppliers(updated);
        saveSuppliers(updated);
      } else {
        const newId = `sup-${Date.now()}`;
        targetSupplier = {
          ...supplierData,
          id: newId,
          createdAt: now,
          updatedAt: now,
        };
        const updated = [targetSupplier, ...suppliers];
        setSuppliers(updated);
        saveSuppliers(updated);
      }

      // Persist to Firebase Firestore
      try {
        await saveSupplierToFirestore(targetSupplier);
      } catch (err) {
        console.warn('Firebase sync queued/cached locally for supplier', err);
      }
    },
    [suppliers]
  );

  const handleDeleteSupplier = useCallback(
    async (supplierId: string) => {
      const target = suppliers.find((s) => s.id === supplierId);
      if (!target) return;

      const linkedCount = parts.filter((p) => p.supplierId === supplierId).length;
      const confirmMsg = linkedCount > 0
        ? `Supplier "${target.name}" has ${linkedCount} parts linked to it. Are you sure you want to remove this vendor?`
        : `Are you sure you want to delete supplier "${target.name}"?`;

      if (confirm(confirmMsg)) {
        const updated = suppliers.filter((s) => s.id !== supplierId);
        setSuppliers(updated);
        saveSuppliers(updated);

        // Also clean up link on parts
        const updatedParts = parts.map((p) => {
          if (p.supplierId === supplierId) {
            return { ...p, supplierId: undefined };
          }
          return p;
        });
        setParts(updatedParts);
        saveParts(updatedParts);

        try {
          await deleteSupplierFromFirestore(supplierId);
        } catch (err) {
          console.warn('Firebase supplier delete cached:', err);
        }
      }
    },
    [suppliers, parts]
  );

  const handleViewSupplierParts = useCallback((supplier: Supplier) => {
    setActiveSupplierForDrawer(supplier);
    setIsSupplierPartsDrawerOpen(true);
  }, []);

  const handleAddPartForSupplier = useCallback((supplier: Supplier) => {
    setPartToEdit(null);
    setPrefilledSupplierIdForPart(supplier.id);
    setIsPartModalOpen(true);
  }, []);

  // -------------------------------------------------------------
  // SALE ACTIONS (Admin Fast Counter & Manual Sales)
  // -------------------------------------------------------------
  const handleCompleteSale = useCallback(
    async (saleData: Omit<SaleRecord, 'id' | 'invoiceNumber' | 'timestamp'>) => {
      const now = new Date();
      const invoiceNumber = `INV-${now.getFullYear()}-${1000 + sales.length + 1}`;
      const newSaleRecord: SaleRecord = {
        ...saleData,
        id: `sale-${Date.now()}`,
        invoiceNumber,
        timestamp: now.toISOString(),
      };

      // 1. Deduct stock in real-time
      const newMovements: StockMovement[] = [];
      const updatedParts = parts.map((part) => {
        const soldItem = saleData.items.find((it) => it.partId === part.id);
        if (!soldItem) return part;

        const previousStock = part.stockQuantity;
        const newStock = Math.max(0, part.stockQuantity - soldItem.quantity);

        const mov: StockMovement = {
          id: `mov-${Date.now()}-${part.id}`,
          partId: part.id,
          partNumber: part.partNumber,
          description: part.description,
          timestamp: now.toISOString(),
          type: 'SALE',
          quantityDelta: -soldItem.quantity,
          previousStock,
          newStock,
          referenceDoc: `Invoice ${invoiceNumber}`,
          user: saleData.salesPerson || 'Counter Attendant',
          notes: `Sold to ${saleData.customerName}`,
        };

        newMovements.push(mov);

        return {
          ...part,
          stockQuantity: newStock,
          lastUpdated: now.toISOString(),
        };
      });

      // 2. Commit local state
      setParts(updatedParts);
      setSales([newSaleRecord, ...sales]);
      setMovements([...newMovements, ...movements]);

      // 3. Persist to Firebase Firestore
      try {
        await saveSaleToFirestore(newSaleRecord);
        for (const mov of newMovements) {
          await saveMovementToFirestore(mov);
        }
        for (const it of saleData.items) {
          const updated = updatedParts.find((p) => p.id === it.partId);
          if (updated) await savePartToFirestore(updated);
        }
      } catch (e) {
        console.warn('Firebase sale sync queued/cached:', e);
      }

      // 4. Open receipt modal
      setActiveReceiptSale(newSaleRecord);
      setIsReceiptModalOpen(true);
    },
    [parts, sales, movements]
  );

  // -------------------------------------------------------------
  // PART ACTIONS (Save, Update, Delete)
  // -------------------------------------------------------------
  const handleSavePart = useCallback(
    async (partData: Omit<SparePart, 'id' | 'lastUpdated'>, existingId?: string) => {
      const now = new Date().toISOString();
      let savedPart: SparePart;

      if (existingId) {
        const existingPart = parts.find((p) => p.id === existingId);
        savedPart = {
          ...partData,
          id: existingId,
          lastUpdated: now,
        };

        const updatedParts = parts.map((p) => (p.id === existingId ? savedPart : p));
        setParts(updatedParts);
        saveParts(updatedParts);

        if (existingPart && existingPart.stockQuantity !== partData.stockQuantity) {
          const delta = partData.stockQuantity - existingPart.stockQuantity;
          const mov: StockMovement = {
            id: `mov-${Date.now()}`,
            partId: existingId,
            partNumber: partData.partNumber,
            description: partData.description,
            timestamp: now,
            type: 'ADJUSTMENT',
            quantityDelta: delta,
            previousStock: existingPart.stockQuantity,
            newStock: partData.stockQuantity,
            referenceDoc: 'Manual Part Edit',
            user: 'Manager',
            notes: 'Stock quantity edited in part specification modal',
          };
          setMovements((prev) => [mov, ...prev]);
          saveMovementToFirestore(mov).catch(console.warn);
        }
      } else {
        const newPartId = `part-${Date.now()}`;
        savedPart = {
          ...partData,
          id: newPartId,
          lastUpdated: now,
        };

        const updatedParts = [savedPart, ...parts];
        setParts(updatedParts);
        saveParts(updatedParts);

        if (savedPart.stockQuantity > 0) {
          const mov: StockMovement = {
            id: `mov-${Date.now()}`,
            partId: newPartId,
            partNumber: savedPart.partNumber,
            description: savedPart.description,
            timestamp: now,
            type: 'PURCHASE_RECEIPT',
            quantityDelta: savedPart.stockQuantity,
            previousStock: 0,
            newStock: savedPart.stockQuantity,
            referenceDoc: 'Initial SKU Registration',
            user: 'Manager',
            notes: 'Initial opening stock registered',
          };
          setMovements((prev) => [mov, ...prev]);
          saveMovementToFirestore(mov).catch(console.warn);
        }
      }

      // Sync to Firebase
      try {
        await savePartToFirestore(savedPart);
      } catch (err) {
        console.warn('Firebase part save cached:', err);
      }
    },
    [parts]
  );

  const handleDeletePart = useCallback(
    async (partId: string) => {
      const target = parts.find((p) => p.id === partId);
      if (!target) return;
      if (confirm(`Are you sure you want to delete "${target.partNumber} - ${target.description}" from inventory?`)) {
        const updated = parts.filter((p) => p.id !== partId);
        setParts(updated);
        saveParts(updated);
        try {
          await deletePartFromFirestore(partId);
        } catch (err) {
          console.warn('Firebase part delete cached:', err);
        }
      }
    },
    [parts]
  );

  // -------------------------------------------------------------
  // STOCK ADJUSTMENT ACTIONS
  // -------------------------------------------------------------
  const handleOpenAdjustStock = useCallback((part: SparePart, delta: number) => {
    setStockAdjustPart(part);
    setStockAdjustDelta(delta);
    setIsStockAdjustModalOpen(true);
  }, []);

  const handleConfirmStockAdjust = useCallback(
    async (part: SparePart, delta: number, type: MovementType, reason: string, notes: string) => {
      const now = new Date().toISOString();
      const previousStock = part.stockQuantity;
      const newStock = Math.max(0, previousStock + delta);

      const updatedPart: SparePart = {
        ...part,
        stockQuantity: newStock,
        lastUpdated: now,
      };

      const updatedParts = parts.map((p) => (p.id === part.id ? updatedPart : p));

      const newMovement: StockMovement = {
        id: `mov-${Date.now()}`,
        partId: part.id,
        partNumber: part.partNumber,
        description: part.description,
        timestamp: now,
        type,
        quantityDelta: delta,
        previousStock,
        newStock,
        referenceDoc: reason,
        user: 'Staff',
        notes: notes || undefined,
      };

      setParts(updatedParts);
      setMovements([newMovement, ...movements]);

      try {
        await savePartToFirestore(updatedPart);
        await saveMovementToFirestore(newMovement);
      } catch (err) {
        console.warn('Firebase stock adjustment cached:', err);
      }
    },
    [parts, movements]
  );

  // -------------------------------------------------------------
  // REORDER & RESTOCK SHIPMENT ACTIONS
  // -------------------------------------------------------------
  const handleReceiveShipment = useCallback(
    async (
      partId: string,
      quantityReceived: number,
      referenceDoc: string,
      updatedFobUsd?: number,
      updatedLandedCost?: number,
      notes?: string
    ) => {
      const now = new Date().toISOString();
      let partRef: SparePart | null = null;

      const updatedParts = parts.map((p) => {
        if (p.id === partId) {
          const newStock = p.stockQuantity + quantityReceived;
          const updated: SparePart = {
            ...p,
            stockQuantity: newStock,
            unitCostFobUsd: updatedFobUsd !== undefined ? updatedFobUsd : p.unitCostFobUsd,
            unitCostLanded: updatedLandedCost !== undefined ? updatedLandedCost : p.unitCostLanded,
            lastUpdated: now,
          };
          partRef = updated;
          return updated;
        }
        return p;
      });

      if (partRef) {
        const prevStock = (partRef as SparePart).stockQuantity - quantityReceived;
        const newMovement: StockMovement = {
          id: `mov-${Date.now()}`,
          partId,
          partNumber: (partRef as SparePart).partNumber,
          description: (partRef as SparePart).description,
          timestamp: now,
          type: 'PURCHASE_RECEIPT',
          quantityDelta: quantityReceived,
          previousStock: prevStock,
          newStock: prevStock + quantityReceived,
          referenceDoc,
          user: 'Receiving Team',
          notes: notes || undefined,
        };

        setParts(updatedParts);
        setMovements([newMovement, ...movements]);

        try {
          await savePartToFirestore(partRef);
          await saveMovementToFirestore(newMovement);
        } catch (err) {
          console.warn('Firebase receive shipment cached:', err);
        }
      }
    },
    [parts, movements]
  );

  // Fast Sell trigger from Table row
  const handleFastSellFromRow = useCallback((part: SparePart) => {
    setSaleInitialPart(part);
    setIsNewSaleModalOpen(true);
  }, []);

  // Reset Data to sample
  const handleResetData = useCallback(() => {
    const data = resetAllData();
    setSuppliers(data.suppliers);
    setParts(data.parts);
    setSales(data.sales);
    setMovements(data.movements);
    setSettings(loadSettings());
  }, []);

  // Backup JSON
  const handleBackupJson = useCallback(() => {
    const bundle = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      suppliers,
      parts,
      sales,
      movements,
      settings,
    };
    const jsonStr = JSON.stringify(bundle, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partpulse_full_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [suppliers, parts, sales, movements, settings]);

  const handleRestoreJson = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data.suppliers)) setSuppliers(data.suppliers);
        if (Array.isArray(data.parts)) setParts(data.parts);
        if (Array.isArray(data.sales)) setSales(data.sales);
        if (Array.isArray(data.movements)) setMovements(data.movements);
        if (data.settings) setSettings(data.settings);
        showToast('Database restored successfully!', 'success');
      } catch {
        showToast('Invalid JSON backup file.', 'error');
      }
    };
    reader.readAsText(file);
  }, [showToast]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. CUSTOMER STOREFRONT VIEW (DEFAULT)                                     */}
      {/* ========================================================================= */}
      {viewMode === 'storefront' ? (
        <div className="flex-1 flex flex-col">
          {/* Storefront Navbar with Double-Click Logo Admin Shortcut */}
          <StorefrontHeader
            onDoubleClickLogo={() => setIsAdminAccessModalOpen(true)}
            selectedCategory={storefrontCategory}
            onSelectCategory={setStorefrontCategory}
            cartItemCount={cartItemCount}
            cartTotalAmount={cartTotalAmount}
            currencySymbol={settings.currencySymbol}
            onOpenCart={() => setIsCartOpen(true)}
            searchQuery={storefrontSearch}
            onSearchChange={setStorefrontSearch}
          />

          {/* Storefront Hero with Vehicle Fitment Selector */}
          <StorefrontHero
            onSearchVehicle={(query) => {
              setStorefrontSearch(query);
              const el = document.getElementById('catalog-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            onExploreCatalog={() => {
              const el = document.getElementById('catalog-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          />

          {/* Storefront Catalog Grid */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
            <StorefrontCatalog
              parts={parts}
              currencySymbol={settings.currencySymbol}
              selectedCategory={storefrontCategory}
              onSelectCategory={setStorefrontCategory}
              searchQuery={storefrontSearch}
              onSearchChange={setStorefrontSearch}
              onAddToCart={handleAddToCart}
              onQuickView={handleQuickViewPart}
              cartQuantities={cartQuantities}
            />
          </main>

          {/* Storefront Customer Footer */}
          <StorefrontFooter
            settings={settings}
            onOpenAdmin={() => setIsAdminAccessModalOpen(true)}
          />
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. ADMIN INVENTORY & LEDGER BACKEND VIEW                                  */
        /* ========================================================================= */
        <div className="flex-1 flex flex-col">
          {/* Universal 3-Zone Admin Top Bar with Exit to Storefront button */}
          <Header
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              if (tab === 'pos') {
                setSaleInitialPart(null);
                setIsNewSaleModalOpen(true);
              }
            }}
            onOpenNewSale={() => {
              setSaleInitialPart(null);
              setIsNewSaleModalOpen(true);
            }}
            onOpenNewPart={() => {
              setPartToEdit(null);
              setPrefilledSupplierIdForPart(undefined);
              setIsPartModalOpen(true);
            }}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
            onExitToStore={() => setViewMode('storefront')}
            lowStockCount={inventoryMetrics.lowStockCount}
          />

          {/* Main Content Viewport */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Real-time KPI Metric Summary Strip (visible on Inventory view) */}
            {activeTab === 'inventory' && (
              <StatSummaryStrip
                metrics={inventoryMetrics}
                currencySymbol={settings.currencySymbol}
                onFilterLowStock={() => setStatusFilter('LOW_STOCK')}
                onFilterOutOfStock={() => setStatusFilter('OUT_OF_STOCK')}
              />
            )}

            {/* Tab 1: Inventory Catalog */}
            {activeTab === 'inventory' && (
              <InventoryTable
                parts={parts}
                suppliers={suppliers}
                currencySymbol={settings.currencySymbol}
                onFastSell={handleFastSellFromRow}
                onEditPart={(part) => {
                  setPartToEdit(part);
                  setPrefilledSupplierIdForPart(part.supplierId);
                  setIsPartModalOpen(true);
                }}
                onDeletePart={handleDeletePart}
                onAdjustStock={(part, delta) => handleOpenAdjustStock(part, delta)}
                onOpenNewPart={() => {
                  setPartToEdit(null);
                  setPrefilledSupplierIdForPart(undefined);
                  setIsPartModalOpen(true);
                }}
                onExportCsv={() => exportPartsCsv(parts)}
                selectedStatusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
              />
            )}

            {/* Tab 2: Point of Sale Terminal */}
            {activeTab === 'pos' && (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center max-w-lg mx-auto my-12 shadow-xs">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Point of Sale Terminal</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Launch the live sales counter to search spare parts, check real-time stock availability, apply discounts, and generate instant tax invoices.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setSaleInitialPart(null);
                      setIsNewSaleModalOpen(true);
                    }}
                    className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-sm"
                  >
                    Open Fast Sales Counter
                  </button>
                  <button
                    onClick={() => setActiveTab('sales')}
                    className="w-full py-2 px-4 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    View Sales Ledger History
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: Sales Ledger */}
            {activeTab === 'sales' && (
              <SalesLedger
                sales={sales}
                currencySymbol={settings.currencySymbol}
                onViewReceipt={(sale) => {
                  setActiveReceiptSale(sale);
                  setIsReceiptModalOpen(true);
                }}
                onExportCsv={() => exportSalesCsv(sales)}
                onOpenNewSale={() => {
                  setSaleInitialPart(null);
                  setIsNewSaleModalOpen(true);
                }}
              />
            )}

            {/* Tab 4: Stock Movement Audit Log */}
            {activeTab === 'movements' && (
              <StockMovementLog
                movements={movements}
                onOpenNewSale={() => {
                  setSaleInitialPart(null);
                  setIsNewSaleModalOpen(true);
                }}
                onOpenRestock={() => setActiveTab('reorder')}
              />
            )}

            {/* Tab 5: Reorder & Restock Dashboard */}
            {activeTab === 'reorder' && (
              <ReorderRestockModal
                parts={parts}
                suppliers={suppliers}
                currencySymbol={settings.currencySymbol}
                onReceiveShipment={handleReceiveShipment}
              />
            )}

            {/* Tab 6: Suppliers Management Directory */}
            {activeTab === 'suppliers' && (
              <SuppliersManagement
                suppliers={suppliers}
                parts={parts}
                currencySymbol={settings.currencySymbol}
                onOpenNewSupplier={() => {
                  setSupplierToEdit(null);
                  setIsSupplierModalOpen(true);
                }}
                onEditSupplier={(sup) => {
                  setSupplierToEdit(sup);
                  setIsSupplierModalOpen(true);
                }}
                onDeleteSupplier={handleDeleteSupplier}
                onViewSupplierParts={handleViewSupplierParts}
                onAddPartForSupplier={handleAddPartForSupplier}
              />
            )}

            {/* Tab 7: Financial Valuation & Margins */}
            {activeTab === 'valuation' && (
              <ValuationAnalytics
                parts={parts}
                sales={sales}
                currencySymbol={settings.currencySymbol}
                onSelectCategory={() => {
                  setActiveTab('inventory');
                }}
                onFilterLowStock={() => {
                  setActiveTab('inventory');
                  setStatusFilter('LOW_STOCK');
                }}
              />
            )}
          </main>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SHARED MODALS & OVERLAYS                                                  */}
      {/* ========================================================================= */}

      {/* Admin Access PIN Modal (Triggered by double-clicking the logo) */}
      <AdminAccessModal
        isOpen={isAdminAccessModalOpen}
        onClose={() => setIsAdminAccessModalOpen(false)}
        correctCode={settings.adminAccessCode || '1234'}
        onUnlock={() => {
          setIsAdminAccessModalOpen(false);
          setViewMode('admin');
        }}
      />

      {/* Storefront Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        currencySymbol={settings.currencySymbol}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveFromCart}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Storefront Product Detail Specification Modal */}
      <ProductDetailModal
        isOpen={isProductDetailOpen}
        onClose={() => {
          setIsProductDetailOpen(false);
          setSelectedProductForDetail(null);
        }}
        part={selectedProductForDetail}
        currencySymbol={settings.currencySymbol}
        onAddToCart={handleAddToCart}
        cartQuantity={selectedProductForDetail ? (cartQuantities[selectedProductForDetail.id] || 0) : 0}
      />

      {/* Storefront Checkout & Order Placement Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cartItems}
        currencySymbol={settings.currencySymbol}
        defaultTaxRate={settings.defaultTaxRatePercent}
        onPlaceOrder={handlePlaceCustomerOrder}
        onViewInvoiceReceipt={(sale) => {
          setActiveReceiptSale(sale);
          setIsReceiptModalOpen(true);
        }}
      />

      {/* Admin Supplier Modal */}
      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => {
          setIsSupplierModalOpen(false);
          setSupplierToEdit(null);
        }}
        supplierToEdit={supplierToEdit}
        onSaveSupplier={handleSaveSupplier}
      />

      {/* Admin Supplier Linked Parts Drawer */}
      <SupplierPartsDrawer
        isOpen={isSupplierPartsDrawerOpen}
        onClose={() => {
          setIsSupplierPartsDrawerOpen(false);
          setActiveSupplierForDrawer(null);
        }}
        supplier={activeSupplierForDrawer}
        parts={parts}
        currencySymbol={settings.currencySymbol}
        onFastSell={handleFastSellFromRow}
        onEditPart={(p) => {
          setIsSupplierPartsDrawerOpen(false);
          setPartToEdit(p);
          setPrefilledSupplierIdForPart(p.supplierId);
          setIsPartModalOpen(true);
        }}
        onAddPartForThisSupplier={(sup) => {
          setIsSupplierPartsDrawerOpen(false);
          handleAddPartForSupplier(sup);
        }}
      />

      {/* Admin New Sale POS Modal */}
      <NewSaleModal
        isOpen={isNewSaleModalOpen}
        onClose={() => {
          setIsNewSaleModalOpen(false);
          setSaleInitialPart(null);
        }}
        parts={parts}
        currencySymbol={settings.currencySymbol}
        defaultTaxRate={settings.defaultTaxRatePercent}
        initialPart={saleInitialPart}
        onCompleteSale={handleCompleteSale}
      />

      {/* Admin Add / Edit Part Modal (with Image upload and Presets) */}
      <PartModal
        isOpen={isPartModalOpen}
        onClose={() => {
          setIsPartModalOpen(false);
          setPartToEdit(null);
          setPrefilledSupplierIdForPart(undefined);
        }}
        partToEdit={partToEdit}
        suppliers={suppliers}
        initialSupplierId={prefilledSupplierIdForPart}
        currencySymbol={settings.currencySymbol}
        defaultTaxRate={settings.defaultTaxRatePercent}
        usdToKshRate={settings.usdToKshRate || 130}
        onSavePart={handleSavePart}
      />

      {/* Printable Tax Invoice / Receipt Modal (Shared between Admin & Customer) */}
      <InvoiceReceiptModal
        sale={activeReceiptSale}
        settings={settings}
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setActiveReceiptSale(null);
        }}
      />

      {/* Admin Quick Stock Adjust Modal */}
      <StockAdjustModal
        isOpen={isStockAdjustModalOpen}
        onClose={() => {
          setIsStockAdjustModalOpen(false);
          setStockAdjustPart(null);
        }}
        part={stockAdjustPart}
        initialDelta={stockAdjustDelta}
        onConfirmAdjust={handleConfirmStockAdjust}
      />

      {/* Admin System Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
        onResetData={handleResetData}
        onBackupJson={handleBackupJson}
        onRestoreJson={handleRestoreJson}
      />

      {/* Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-2">
          <div
            className={`px-4 py-3 rounded-lg shadow-xl border text-xs font-medium flex items-center gap-3 ${
              toastNotification.type === 'success'
                ? 'bg-slate-900 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950 border-rose-500/40 text-rose-200'
            }`}
          >
            <span>{toastNotification.text}</span>
            <button
              onClick={() => setToastNotification(null)}
              className="text-slate-400 hover:text-white cursor-pointer ml-1 text-sm font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
