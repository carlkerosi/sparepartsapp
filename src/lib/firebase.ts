import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// CRITICAL: The app will break without specifying firestoreDatabaseId when provided
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface FirebaseConnectionStatus {
  connected: boolean;
  latencyMs?: number;
  message: string;
}

// Validate connection to Firestore on startup per skill guidelines
export async function testConnection(): Promise<boolean> {
  const status = await checkFirebaseConnection();
  if (status.connected) {
    console.log(`Connected to Firebase Firestore successfully (${status.latencyMs}ms).`);
  } else {
    console.warn('Firebase connection check:', status.message);
  }
  return status.connected;
}

export async function checkFirebaseConnection(): Promise<FirebaseConnectionStatus> {
  const start = performance.now();
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    const latencyMs = Math.round(performance.now() - start);
    return {
      connected: true,
      latencyMs,
      message: `Database connection verified (${latencyMs}ms response time)`,
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start);
    if (error instanceof Error && error.message.includes('the client is offline')) {
      return {
        connected: false,
        latencyMs,
        message: 'Client offline or connection unreachable.',
      };
    }
    return {
      connected: true,
      latencyMs,
      message: `Database online (${latencyMs}ms)`,
    };
  }
}
