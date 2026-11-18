import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Supplier, SparePart, SaleRecord, StockMovement, InventorySettings, AdminAccount, CustomerProfile, OrderStatus } from '../types/inventory';
import { INITIAL_SUPPLIERS, INITIAL_PARTS, INITIAL_SALES, INITIAL_MOVEMENTS, DEFAULT_SETTINGS, INITIAL_ADMINS } from '../data/initialData';

const COLLECTIONS = {
  SUPPLIERS: 'suppliers',
  PARTS: 'parts',
  SALES: 'sales',
  MOVEMENTS: 'movements',
  SETTINGS: 'settings',
  ADMINS: 'admins',
  CUSTOMERS: 'customers',
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
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
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
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
        return;
      }

      const items: SparePart[] = [];
      snapshot.forEach((d) => {
        items.push({ ...(d.data() as SparePart), id: d.id });
      });

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
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
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
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
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


export async function clearAllInventoryFromFirestore(): Promise<void> {
  const collectionsToClear = [
    COLLECTIONS.PARTS,
    COLLECTIONS.SUPPLIERS,
    COLLECTIONS.SALES,
    COLLECTIONS.MOVEMENTS,
  ];
  for (const colName of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, colName));
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) {
      console.warn(`Failed to clear collection ${colName}:`, e);
    }
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
      const data = snapshot.data() as InventorySettings;
      const merged: InventorySettings = {
        ...DEFAULT_SETTINGS,
        ...data,
        mpesaPaybillNumber: !data.mpesaPaybillNumber || data.mpesaPaybillNumber === '174379' ? '522522' : data.mpesaPaybillNumber,
        mpesaTillNumber: !data.mpesaTillNumber || data.mpesaTillNumber === '948201' || data.mpesaTillNumber === '174379' ? '522522' : data.mpesaTillNumber,
        mpesaShortcode: !data.mpesaShortcode || data.mpesaShortcode === '174379' ? '522522' : data.mpesaShortcode,
        mpesaAccountNumber: data.mpesaAccountNumber || '1358024235',
        mpesaAccountName: data.mpesaAccountName || 'PANZER AUTOPARTS LTD',
      };
      onUpdate(merged);
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
    // Sanitize settings: sensitive API credentials must NEVER be stored in public /settings/current
    const sanitized = { ...settings };
    delete sanitized.mpesaConsumerKey;
    delete sanitized.mpesaConsumerSecret;
    delete sanitized.mpesaPasskey;
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'current'), sanitized);
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
        const data = d.data() as AdminAccount;
        items.push({ ...data, id: d.id });
      });

      // Ensure Panzer Operations Admin exists and has a password
      const hasOpsAdmin = items.some((a) => a.id === 'admin-operations' || a.email.toLowerCase() === 'orders@panzerautoparts.co.ke');
      if (!hasOpsAdmin && INITIAL_ADMINS.length > 0) {
        try {
          await setDoc(doc(db, path, INITIAL_ADMINS[0].id), INITIAL_ADMINS[0]);
          items.unshift(INITIAL_ADMINS[0]);
        } catch (e) {
          console.warn('Could not auto-seed operations admin:', e);
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

  // Create or update Admin record in Firestore
  const adminAccount: AdminAccount = {
    id: `admin-${user.uid.slice(0, 16)}`,
    email: user.email || 'admin@panzerautoparts.co.ke',
    displayName: user.displayName || 'Panzer Admin',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    password: 'Panzer@Admin2026',
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

// ==========================================
// CUSTOMER AUTHENTICATION & ORDER TRACKING
// ==========================================

export async function getCustomerProfile(uid: string): Promise<CustomerProfile | null> {
  const path = `${COLLECTIONS.CUSTOMERS}/${uid}`;
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.CUSTOMERS, uid));
    if (!snap.exists()) return null;
    return snap.data() as CustomerProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveCustomerProfile(profile: CustomerProfile): Promise<void> {
  const path = `${COLLECTIONS.CUSTOMERS}/${profile.uid}`;
  const cleanPayload: Record<string, string> = {
    uid: profile.uid.slice(0, 128),
    email: profile.email.slice(0, 120),
    displayName: profile.displayName.slice(0, 100),
    createdAt: profile.createdAt.slice(0, 60),
    updatedAt: new Date().toISOString().slice(0, 60),
  };
  if (profile.phone?.trim()) cleanPayload.phone = profile.phone.trim().slice(0, 50);
  if (profile.defaultDeliveryAddress?.trim()) {
    cleanPayload.defaultDeliveryAddress = profile.defaultDeliveryAddress.trim().slice(0, 250);
  }
  if (profile.defaultVehicleRef?.trim()) {
    cleanPayload.defaultVehicleRef = profile.defaultVehicleRef.trim().slice(0, 100);
  }
  try {
    await setDoc(doc(db, COLLECTIONS.CUSTOMERS, profile.uid), cleanPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

async function upsertCustomerFromFirebaseUser(
  user: FirebaseUser,
  overrides?: Partial<Pick<CustomerProfile, 'displayName' | 'phone' | 'defaultDeliveryAddress' | 'defaultVehicleRef'>>
): Promise<CustomerProfile> {
  const now = new Date().toISOString();
  let existing: CustomerProfile | null = null;
  try {
    existing = await getCustomerProfile(user.uid);
  } catch {
    existing = null;
  }

  const profile: CustomerProfile = {
    uid: user.uid,
    email: (user.email || existing?.email || 'client@panzerautoparts.co.ke').slice(0, 120),
    displayName: (
      overrides?.displayName?.trim() ||
      user.displayName ||
      existing?.displayName ||
      user.email?.split('@')[0] ||
      'Panzer Client'
    ).slice(0, 100),
    phone: overrides?.phone?.trim() || existing?.phone || undefined,
    defaultDeliveryAddress: overrides?.defaultDeliveryAddress?.trim() || existing?.defaultDeliveryAddress || undefined,
    defaultVehicleRef: overrides?.defaultVehicleRef?.trim() || existing?.defaultVehicleRef || undefined,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await saveCustomerProfile(profile);
  return profile;
}

export function subscribeCustomerAuthState(
  onCustomerChange: (customer: CustomerProfile | null) => void
): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onCustomerChange(null);
      return;
    }
    try {
      const existing = await getCustomerProfile(user.uid);
      if (existing) {
        onCustomerChange(existing);
      } else {
        const created = await upsertCustomerFromFirebaseUser(user);
        onCustomerChange(created);
      }
    } catch {
      onCustomerChange({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Panzer Client',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  });
}

export async function signInCustomerWithGoogle(): Promise<CustomerProfile> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return await upsertCustomerFromFirebaseUser(result.user);
}

export async function signUpCustomerWithEmail(
  email: string,
  password: string,
  displayName: string,
  phone?: string
): Promise<CustomerProfile> {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (displayName.trim()) {
    await updateProfile(result.user, { displayName: displayName.trim() });
  }
  return await upsertCustomerFromFirebaseUser(result.user, { displayName, phone });
}

export async function signInCustomerWithEmail(email: string, password: string): Promise<CustomerProfile> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return await upsertCustomerFromFirebaseUser(result.user);
}

export async function signOutCustomer(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Error signing out customer:', e);
  }
}

export async function linkSaleToCustomer(
  saleId: string,
  customerId: string,
  customerEmail: string
): Promise<void> {
  const path = `${COLLECTIONS.SALES}/${saleId}`;
  try {
    await updateDoc(doc(db, COLLECTIONS.SALES, saleId), {
      customerId: customerId.slice(0, 128),
      customerEmail: customerEmail.slice(0, 120),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateSaleOrderStatus(saleId: string, orderStatus: OrderStatus): Promise<void> {
  const path = `${COLLECTIONS.SALES}/${saleId}`;
  try {
    await updateDoc(doc(db, COLLECTIONS.SALES, saleId), {
      orderStatus,
      statusUpdatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
