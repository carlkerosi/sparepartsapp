import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Supplier, SparePart, SaleRecord, StockMovement } from '../types/inventory';
import { INITIAL_SUPPLIERS, INITIAL_PARTS, INITIAL_SALES, INITIAL_MOVEMENTS } from '../data/initialData';

const COLLECTIONS = {
  SUPPLIERS: 'suppliers',
  PARTS: 'parts',
  SALES: 'sales',
  MOVEMENTS: 'movements',
};

// 1. Subscribe to Suppliers (Real-time sync)
export function subscribeSuppliers(
  onUpdate: (suppliers: Supplier[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = COLLECTIONS.SUPPLIERS;
  const colRef = collection(db, path);

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial suppliers to Firestore
        try {
          const batch = writeBatch(db);
          for (const s of INITIAL_SUPPLIERS) {
            batch.set(doc(db, path, s.id), s);
          }
          await batch.commit();
        } catch (e) {
          console.warn('Initial supplier seeding skipped:', e);
        }
        onUpdate(INITIAL_SUPPLIERS);
        return;
      }

      const items: Supplier[] = [];
      snapshot.forEach((d) => {
        items.push({ ...(d.data() as Supplier), id: d.id });
      });
      items.sort((a, b) => a.name.localeCompare(b.name));
      onUpdate(items);
    },
    (err) => {
      console.warn('Firestore onSnapshot suppliers error, falling back:', err);
      onError?.(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

// 2. Subscribe to Spare Parts
export function subscribeParts(
  onUpdate: (parts: SparePart[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = COLLECTIONS.PARTS;
  const colRef = collection(db, path);

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial parts to Firestore
        try {
          const batch = writeBatch(db);
          for (const p of INITIAL_PARTS) {
            batch.set(doc(db, path, p.id), p);
          }
          await batch.commit();
        } catch (e) {
          console.warn('Initial parts seeding skipped:', e);
        }
        onUpdate(INITIAL_PARTS);
        return;
      }

      const items: SparePart[] = [];
      snapshot.forEach((d) => {
        items.push({ ...(d.data() as SparePart), id: d.id });
      });

      // If Firestore contains outdated data without the Range Rover specific parts catalog, sync initial parts
      const hasSpecificCatalog = items.some((p) => p.id === 'part-rr-brk-disc-f');
      if (!hasSpecificCatalog && INITIAL_PARTS.length > 0) {
        try {
          const batch = writeBatch(db);
          for (const p of INITIAL_PARTS) {
            batch.set(doc(db, path, p.id), p);
          }
          await batch.commit();
        } catch (e) {
          console.warn('Range Rover specific parts sync to Firestore failed:', e);
        }
        onUpdate(INITIAL_PARTS);
        return;
      }

      onUpdate(items);
    },
    (err) => {
      console.warn('Firestore onSnapshot parts error:', err);
      onError?.(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

// 3. Subscribe to Sales Records
export function subscribeSales(
  onUpdate: (sales: SaleRecord[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = COLLECTIONS.SALES;
  const colRef = collection(db, path);

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        try {
          const batch = writeBatch(db);
          for (const s of INITIAL_SALES) {
            batch.set(doc(db, path, s.id), s);
          }
          await batch.commit();
        } catch (e) {
          console.warn('Initial sales seeding skipped:', e);
        }
        onUpdate(INITIAL_SALES);
        return;
      }

      const items: SaleRecord[] = [];
      snapshot.forEach((d) => {
        items.push({ ...(d.data() as SaleRecord), id: d.id });
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(items);
    },
    (err) => {
      console.warn('Firestore onSnapshot sales error:', err);
      onError?.(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

// 4. Subscribe to Stock Movements
export function subscribeMovements(
  onUpdate: (movements: StockMovement[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = COLLECTIONS.MOVEMENTS;
  const colRef = collection(db, path);

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        try {
          const batch = writeBatch(db);
          for (const m of INITIAL_MOVEMENTS) {
            batch.set(doc(db, path, m.id), m);
          }
          await batch.commit();
        } catch (e) {
          console.warn('Initial movements seeding skipped:', e);
        }
        onUpdate(INITIAL_MOVEMENTS);
        return;
      }

      const items: StockMovement[] = [];
      snapshot.forEach((d) => {
        items.push({ ...(d.data() as StockMovement), id: d.id });
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(items);
    },
    (err) => {
      console.warn('Firestore onSnapshot movements error:', err);
      onError?.(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

// Write Operations
export async function saveSupplierToFirestore(supplier: Supplier): Promise<void> {
  const path = `${COLLECTIONS.SUPPLIERS}/${supplier.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.SUPPLIERS, supplier.id), supplier);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSupplierFromFirestore(supplierId: string): Promise<void> {
  const path = `${COLLECTIONS.SUPPLIERS}/${supplierId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.SUPPLIERS, supplierId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function savePartToFirestore(part: SparePart): Promise<void> {
  const path = `${COLLECTIONS.PARTS}/${part.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.PARTS, part.id), part);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePartFromFirestore(partId: string): Promise<void> {
  const path = `${COLLECTIONS.PARTS}/${partId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.PARTS, partId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveSaleToFirestore(sale: SaleRecord): Promise<void> {
  const path = `${COLLECTIONS.SALES}/${sale.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.SALES, sale.id), sale);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveMovementToFirestore(movement: StockMovement): Promise<void> {
  const path = `${COLLECTIONS.MOVEMENTS}/${movement.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.MOVEMENTS, movement.id), movement);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
