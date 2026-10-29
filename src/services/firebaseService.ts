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
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Supplier, SparePart, SaleRecord, StockMovement, InventorySettings, AdminAccount } from '../types/inventory';
import { INITIAL_SUPPLIERS, INITIAL_PARTS, INITIAL_SALES, INITIAL_MOVEMENTS, DEFAULT_SETTINGS, INITIAL_ADMINS } from '../data/initialData';

const COLLECTIONS = {
  SUPPLIERS: 'suppliers',
  PARTS: 'parts',
  SALES: 'sales',
  MOVEMENTS: 'movements',
  SETTINGS: 'settings',
  ADMINS: 'admins',
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

// 5. Subscribe to Settings
export function subscribeSettings(
  onUpdate: (settings: InventorySettings) => void,
  onError?: (error: Error) => void
): () => void {
  const path = `${COLLECTIONS.SETTINGS}/current`;
  const docRef = doc(db, COLLECTIONS.SETTINGS, 'current');

  return onSnapshot(
    docRef,
    async (snapshot) => {
      if (!snapshot.exists()) {
        try {
          await setDoc(docRef, DEFAULT_SETTINGS);
        } catch (e) {
          console.warn('Initial settings seeding skipped:', e);
        }
        onUpdate(DEFAULT_SETTINGS);
        return;
      }
      onUpdate(snapshot.data() as InventorySettings);
    },
    (err) => {
      console.warn('Firestore onSnapshot settings error:', err);
      onError?.(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

export async function saveSettingsToFirestore(settings: InventorySettings): Promise<void> {
  const path = `${COLLECTIONS.SETTINGS}/current`;
  try {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'current'), settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 6. Subscribe to Admin Accounts
export function subscribeAdminAccounts(
  onUpdate: (admins: AdminAccount[]) => void,
  onError?: (error: Error) => void
): () => void {
  const path = COLLECTIONS.ADMINS;
  const colRef = collection(db, path);

  return onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        try {
          const batch = writeBatch(db);
          for (const a of INITIAL_ADMINS) {
            batch.set(doc(db, path, a.id), a);
          }
          await batch.commit();
        } catch (e) {
          console.warn('Initial admin account seeding skipped:', e);
        }
        onUpdate(INITIAL_ADMINS);
        return;
      }

      const items: AdminAccount[] = [];
      snapshot.forEach((d) => {
        items.push({ ...(d.data() as AdminAccount), id: d.id });
      });

      // Ensure Carl Kerosi is always present
      const hasCarl = items.some((a) => a.email.toLowerCase() === 'kerosicarl@gmail.com');
      if (!hasCarl && INITIAL_ADMINS.length > 0) {
        try {
          await setDoc(doc(db, path, INITIAL_ADMINS[0].id), INITIAL_ADMINS[0]);
          items.unshift(INITIAL_ADMINS[0]);
        } catch (e) {
          console.warn('Could not auto-seed primary admin:', e);
        }
      }

      onUpdate(items);
    },
    (err) => {
      console.warn('Firestore onSnapshot admins error:', err);
      onError?.(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

export async function saveAdminAccountToFirestore(account: AdminAccount): Promise<void> {
  const path = `${COLLECTIONS.ADMINS}/${account.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.ADMINS, account.id), account);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAdminAccountFromFirestore(accountId: string): Promise<void> {
  const path = `${COLLECTIONS.ADMINS}/${accountId}`;
  try {
    await deleteDoc(doc(db, COLLECTIONS.ADMINS, accountId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Google Authentication for Administrators
export async function signInWithGoogleAdmin(): Promise<{ user: any; adminAccount: AdminAccount }> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  
  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  const userEmail = (user.email || '').toLowerCase();

  // Create or update Admin record in Firestore
  const isCarl = userEmail === 'kerosicarl@gmail.com';
  const adminAccount: AdminAccount = {
    id: `admin-${user.uid.slice(0, 16)}`,
    email: user.email || 'admin@panzerautoparts.co.ke',
    displayName: user.displayName || (isCarl ? 'Carl Kerosi' : 'Authorized Admin'),
    role: isCarl ? 'SUPER_ADMIN' : 'INVENTORY_MANAGER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    avatarUrl: user.photoURL || undefined,
  };

  try {
    await saveAdminAccountToFirestore(adminAccount);
  } catch (e) {
    console.warn('Could not persist Google Admin to Firestore:', e);
  }

  return { user, adminAccount };
}

export async function signOutAdmin(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Error signing out:', e);
  }
}

