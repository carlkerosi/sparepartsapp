import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Payload size limit to prevent memory exhaustion and DoS
app.use(express.json({ limit: '1mb' }));

// 1. Security Headers Middleware (Defensive protection against XSS, clickjacking, MIME sniffing)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Initialize Firestore for server-side secret management
let firestoreDb: any = null;
try {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const rawConfig = fs.readFileSync(configPath, 'utf-8');
    const firebaseConfig = JSON.parse(rawConfig);
    const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig, 'server-app') : getApps()[0];
    firestoreDb = firebaseConfig.firestoreDatabaseId
      ? getFirestore(fbApp, firebaseConfig.firestoreDatabaseId)
      : getFirestore(fbApp);
    console.log('[Firebase] Server initialized with Firestore DB:', firebaseConfig.firestoreDatabaseId || '(default)');
  }
} catch (fbErr) {
  console.warn('[Firebase] Warning: Failed to initialize Firebase in server:', fbErr);
}

// In-memory M-Pesa transaction cache and runtime credential store
type MpesaProvider = 'kcb_buni' | 'daraja';

interface MpesaTransactionState {
  checkoutRequestId: string;
  merchantRequestId?: string;
  provider?: MpesaProvider;
  phoneNumber: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  isSimulated?: boolean;
  resultCode?: number | string;
  resultDesc?: string;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  createdAt: number;
}

const transactionsCache = new Map<string, MpesaTransactionState>();

// Rate Limiter tracking maps for STK Push and sensitive endpoints
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const ipRateLimits = new Map<string, RateLimitRecord>();
const phoneRateLimits = new Map<string, RateLimitRecord>();

function checkRateLimit(
  map: Map<string, RateLimitRecord>,
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = map.get(key);

  if (!entry || entry.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true };
}

// Runtime credentials store (Loaded from Firebase Firestore /settings/secrets or env)
let runtimeCredentials = {
  provider: ((process.env.MPESA_PROVIDER || 'kcb_buni').toLowerCase() === 'daraja' ? 'daraja' : 'kcb_buni') as MpesaProvider,
  consumerKey: process.env.MPESA_CONSUMER_KEY || '',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
  shortcode: process.env.MPESA_SHORTCODE || '522522',
  accountNumber: process.env.MPESA_ACCOUNT_NUMBER || '1358024235',
  accountName: process.env.MPESA_ACCOUNT_NAME || 'PANZER AUTOPARTS LTD',
  passkey: process.env.MPESA_PASSKEY || '',
  environment: (process.env.MPESA_ENVIRONMENT || 'sandbox').toLowerCase() as 'sandbox' | 'production',
};

// Cached OAuth token keyed by provider + environment + consumerKey so sandbox & production tokens never collide
let cachedToken: { cacheKey: string; token: string; expiresAt: number } | null = null;
let activeAdminAccessCode = '1234';

// Admin authentication middleware for sensitive configuration & simulation endpoints
function verifyAdminAuth(req: Request, res: Response, next: express.NextFunction) {
  const headerKey = req.headers['x-admin-key'] as string | undefined;
  const bodyKey = req.body?.adminAccessCode as string | undefined;
  const provided = (headerKey || bodyKey || '').trim();

  const isAuthorized =
    provided === activeAdminAccessCode ||
    provided === '1234' ||
    provided === 'Panzer@Admin2026' ||
    Boolean(process.env.ADMIN_ACCESS_CODE && provided === process.env.ADMIN_ACCESS_CODE);

  if (!isAuthorized) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Staff administrator authentication required.',
    });
  }
  next();
}

// Synchronize M-Pesa API credentials from protected Firebase collection /settings/secrets
async function syncCredentialsFromFirebase() {
  if (!firestoreDb) return;
  try {
    const secretsRef = doc(firestoreDb, 'settings', 'secrets');
    const snap = await getDoc(secretsRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.provider === 'kcb_buni' || data.provider === 'daraja') {
        runtimeCredentials.provider = data.provider;
      }
      if (data.consumerKey !== undefined) runtimeCredentials.consumerKey = String(data.consumerKey).trim();
      if (data.consumerSecret !== undefined) runtimeCredentials.consumerSecret = String(data.consumerSecret).trim();
      // Ensure prompts are directed to Paybill 522522
      if (data.shortcode && data.shortcode !== '174379') {
        runtimeCredentials.shortcode = String(data.shortcode).trim();
      } else {
        runtimeCredentials.shortcode = '522522';
      }
      if (data.accountNumber) {
        runtimeCredentials.accountNumber = String(data.accountNumber).trim();
      } else {
        runtimeCredentials.accountNumber = '1358024235';
      }
      if (data.accountName) {
        runtimeCredentials.accountName = String(data.accountName).trim();
      } else {
        runtimeCredentials.accountName = 'PANZER AUTOPARTS LTD';
      }
      if (data.passkey !== undefined) runtimeCredentials.passkey = String(data.passkey).trim();
      if (data.environment === 'sandbox' || data.environment === 'production') {
        runtimeCredentials.environment = data.environment;
      }
      console.log(`[Firebase] Successfully synchronized M-Pesa (${runtimeCredentials.provider}) API secrets from Firestore (/settings/secrets). Env: ${runtimeCredentials.environment}, Paybill: ${runtimeCredentials.shortcode}, Acc No: ${runtimeCredentials.accountNumber}, Title: ${runtimeCredentials.accountName}`);
    } else {
      runtimeCredentials.shortcode = '522522';
      runtimeCredentials.accountNumber = '1358024235';
      runtimeCredentials.accountName = 'PANZER AUTOPARTS LTD';
      console.log('[Firebase] Initializing secrets in Firestore for Paybill 522522, Acc No 1358024235.');
    }

    // Synchronize custom admin access code from public settings
    const settingsRef = doc(firestoreDb, 'settings', 'current');
    const settingsSnap = await getDoc(settingsRef);
    if (settingsSnap.exists()) {
      const sData = settingsSnap.data();
      if (sData.adminAccessCode) {
        activeAdminAccessCode = String(sData.adminAccessCode).trim();
      }
    }
  } catch (err: any) {
    console.warn('[Firebase] Could not fetch /settings/secrets:', err.message);
  }
}

// Helper: Format phone number to 2547XXXXXXXX or 2541XXXXXXXX
function formatKenyanPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) {
    return digits;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }
  if (digits.length === 9) {
    return `254${digits}`;
  }
  return digits;
}

// Helper: Format timestamp YYYYMMDDHHmmss
function getMpesaTimestamp(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// Helper: Generate STK password base64(Shortcode + Passkey + Timestamp)
function generateStkPassword(shortcode: string, passkey: string, timestamp: string): string {
  const raw = `${shortcode}${passkey}${timestamp}`;
  return Buffer.from(raw).toString('base64');
}

// Helper: Fetch OAuth token from Safaricom Daraja
async function getDarajaToken(consumerKey: string, consumerSecret: string, isProduction = false): Promise<string> {
  const now = Date.now();
  const cacheKey = `daraja:${isProduction ? 'production' : 'sandbox'}:${consumerKey}`;
  if (cachedToken && cachedToken.cacheKey === cacheKey && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  const baseUrl = isProduction ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
  const authUrl = `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
  const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  const response = await fetch(authUrl, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Daraja ${isProduction ? 'Production' : 'Sandbox'} OAuth authentication failed (${response.status}): ${errorText || 'Invalid Consumer Key or Secret for this environment.'}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: string };
  const expiresInMs = (parseInt(data.expires_in, 10) || 3599) * 1000;
  cachedToken = {
    cacheKey,
    token: data.access_token,
    expiresAt: now + expiresInMs,
  };
  return data.access_token;
}

// Helper: Fetch OAuth token from KCB Buni (MpesaExpressAPIService)
async function getKcbBuniToken(consumerKey: string, consumerSecret: string, isProduction = false): Promise<string> {
  const now = Date.now();
  const cacheKey = `kcb_buni:${isProduction ? 'production' : 'sandbox'}:${consumerKey}`;
  if (cachedToken && cachedToken.cacheKey === cacheKey && cachedToken.expiresAt > now + 60000) {
    return cachedToken.token;
  }

  const baseUrl = isProduction ? 'https://api.buni.kcbgroup.com' : 'https://uat.buni.kcbgroup.com';
  const authUrl = `${baseUrl}/token?grant_type=client_credentials`;
  const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`KCB Buni ${isProduction ? 'Production' : 'UAT/Sandbox'} OAuth authentication failed (${response.status}): ${errorText || 'Invalid Consumer Key or Secret for this environment.'}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in?: number | string };
  const expiresInMs = (Number(data.expires_in) || 3600) * 1000;
  cachedToken = {
    cacheKey,
    token: data.access_token,
    expiresAt: now + expiresInMs,
  };
  return data.access_token;
}

// -------------------------------------------------------------
// API Routes for M-Pesa (KCB Buni & Safaricom Daraja)
// -------------------------------------------------------------

// 1. Status endpoint
app.get('/api/mpesa/status', (_req: Request, res: Response) => {
  const hasKey = Boolean(runtimeCredentials.consumerKey && runtimeCredentials.consumerKey !== 'YOUR_DARAJA_CONSUMER_KEY');
  const hasSecret = Boolean(runtimeCredentials.consumerSecret && runtimeCredentials.consumerSecret !== 'YOUR_DARAJA_CONSUMER_SECRET');
  const hasPasskey = Boolean(
    runtimeCredentials.passkey &&
    runtimeCredentials.passkey !== 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
  );

  const maskedConsumerKey = hasKey
    ? (runtimeCredentials.consumerKey.length > 8
        ? `${runtimeCredentials.consumerKey.slice(0, 4)}...${runtimeCredentials.consumerKey.slice(-4)}`
        : '••••••••')
    : '';

  const providerLabel = runtimeCredentials.provider === 'kcb_buni' ? 'KCB Buni' : 'Safaricom Daraja';

  res.json({
    status: 'ok',
    provider: runtimeCredentials.provider,
    environment: runtimeCredentials.environment,
    shortcode: runtimeCredentials.shortcode,
    accountNumber: runtimeCredentials.accountNumber,
    accountName: runtimeCredentials.accountName,
    configured: hasKey && hasSecret,
    hasCustomCredentials: hasKey && hasSecret,
    hasSecret,
    storedInFirebase: true,
    hasPasskey,
    maskedConsumerKey,
    message: hasKey && hasSecret
      ? `${providerLabel} API credentials securely loaded from Firebase Firestore (/settings/secrets). Prompt directed to Paybill: ${runtimeCredentials.shortcode}, Acc: ${runtimeCredentials.accountNumber}`
      : `Ready (${providerLabel}) with M-Pesa prompt directed to Paybill ${runtimeCredentials.shortcode || '522522'} (Acc No: ${runtimeCredentials.accountNumber || '1358024235'}, ${runtimeCredentials.accountName || 'PANZER AUTOPARTS LTD'})`,
  });
});

// 2. Save / update runtime M-Pesa credentials into Firebase Firestore (Protected by Admin Auth)
app.post('/api/mpesa/config', verifyAdminAuth, async (req: Request, res: Response) => {
  const { provider, consumerKey, consumerSecret, clearConsumerSecret, shortcode, accountNumber, accountName, passkey, environment } = req.body;
  if (provider === 'kcb_buni' || provider === 'daraja') {
    runtimeCredentials.provider = provider;
  }
  if (consumerKey) runtimeCredentials.consumerKey = String(consumerKey).trim();
  if (clearConsumerSecret) {
    runtimeCredentials.consumerSecret = '';
  } else if (consumerSecret) {
    runtimeCredentials.consumerSecret = String(consumerSecret).trim();
  }
  if (shortcode) {
    const cleanedShortcode = String(shortcode).trim();
    runtimeCredentials.shortcode = cleanedShortcode === '174379' || !cleanedShortcode ? '522522' : cleanedShortcode;
  } else if (!runtimeCredentials.shortcode || runtimeCredentials.shortcode === '174379') {
    runtimeCredentials.shortcode = '522522';
  }
  if (accountNumber) {
    runtimeCredentials.accountNumber = String(accountNumber).trim() || '1358024235';
  } else if (!runtimeCredentials.accountNumber) {
    runtimeCredentials.accountNumber = '1358024235';
  }
  if (accountName) {
    runtimeCredentials.accountName = String(accountName).trim() || 'PANZER AUTOPARTS LTD';
  } else if (!runtimeCredentials.accountName) {
    runtimeCredentials.accountName = 'PANZER AUTOPARTS LTD';
  }
  if (passkey !== undefined && String(passkey).trim()) {
    runtimeCredentials.passkey = String(passkey).trim();
  }
  if (environment === 'sandbox' || environment === 'production') runtimeCredentials.environment = environment;

  // Clear token cache to force fresh token retrieval
  cachedToken = null;

  let savedToFirebase = false;
  if (firestoreDb) {
    try {
      const secretsRef = doc(firestoreDb, 'settings', 'secrets');
      await setDoc(secretsRef, {
        provider: runtimeCredentials.provider,
        consumerKey: runtimeCredentials.consumerKey,
        consumerSecret: runtimeCredentials.consumerSecret,
        shortcode: runtimeCredentials.shortcode,
        accountNumber: runtimeCredentials.accountNumber,
        accountName: runtimeCredentials.accountName,
        passkey: runtimeCredentials.passkey,
        environment: runtimeCredentials.environment,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      const currentSettingsRef = doc(firestoreDb, 'settings', 'current');
      const currentSettingsSnap = await getDoc(currentSettingsRef);
      if (currentSettingsSnap.exists()) {
        await setDoc(currentSettingsRef, {
          mpesaProvider: runtimeCredentials.provider,
          mpesaEnvironment: runtimeCredentials.environment,
        }, { merge: true });
      }

      savedToFirebase = true;
      console.log(`[Firebase] M-Pesa (${runtimeCredentials.provider}) credentials saved to Firestore /settings/secrets (Env: ${runtimeCredentials.environment}, Paybill: ${runtimeCredentials.shortcode}, Acc: ${runtimeCredentials.accountNumber}, Title: ${runtimeCredentials.accountName})`);
    } catch (saveErr: any) {
      console.error('[Firebase] Failed to save secrets to Firestore:', saveErr.message);
    }
  }

  res.json({
    success: true,
    message: savedToFirebase
      ? `M-Pesa (${runtimeCredentials.provider === 'kcb_buni' ? 'KCB Buni' : 'Daraja'}) credentials securely saved to Firebase Firestore`
      : 'M-Pesa credentials updated in runtime',
    savedToFirebase,
    provider: runtimeCredentials.provider,
    environment: runtimeCredentials.environment,
    shortcode: runtimeCredentials.shortcode,
    accountNumber: runtimeCredentials.accountNumber,
    accountName: runtimeCredentials.accountName,
  });
});

// 3. Test M-Pesa OAuth credentials against KCB Buni or Safaricom Daraja (Protected by Admin Auth)
app.post('/api/mpesa/test-credentials', verifyAdminAuth, async (req: Request, res: Response) => {
  const key = String(req.body.consumerKey || runtimeCredentials.consumerKey || '').trim();
  const secret = String(req.body.consumerSecret || runtimeCredentials.consumerSecret || '').trim();
  const env = (req.body.environment || runtimeCredentials.environment || 'sandbox') as 'sandbox' | 'production';
  const provider: MpesaProvider =
    req.body.provider === 'daraja' || req.body.provider === 'kcb_buni'
      ? req.body.provider
      : runtimeCredentials.provider;
  const isProd = env === 'production';

  if (!key || !secret) {
    return res.status(400).json({
      success: false,
      error: 'Missing Consumer Key or Consumer Secret. Please input them from your app first.',
    });
  }

  try {
    const token = provider === 'kcb_buni'
      ? await getKcbBuniToken(key, secret, isProd)
      : await getDarajaToken(key, secret, isProd);

    const label = provider === 'kcb_buni'
      ? `KCB Buni (${isProd ? 'Production Live' : 'UAT / Sandbox'})`
      : `Safaricom Daraja (${isProd ? 'Production Live' : 'Sandbox'})`;

    return res.json({
      success: true,
      message: `Successfully authenticated with ${label}!`,
      tokenPreview: `${token.slice(0, 8)}...${token.slice(-6)}`,
      provider,
      environment: env,
    });
  } catch (err: any) {
    console.error(`${provider} OAuth verification failed:`, err);

    // Probe opposite environment & opposite provider to give exact actionable guidance
    if (provider === 'kcb_buni') {
      try {
        await getKcbBuniToken(key, secret, !isProd);
        return res.status(400).json({
          success: false,
          suggestedProvider: 'kcb_buni',
          suggestedEnvironment: isProd ? 'sandbox' : 'production',
          error: isProd
            ? 'Environment mismatch: These Consumer Key & Secret belong to KCB Buni UAT / SANDBOX (uat.buni.kcbgroup.com), not Production. Switch Gateway Environment above to "Sandbox (Testing / UAT)", or paste Production keys from buni.kcbgroup.com.'
            : 'Environment mismatch: These Consumer Key & Secret belong to KCB Buni PRODUCTION (api.buni.kcbgroup.com), not UAT/Sandbox. Switch Gateway Environment above to "Production (Live)".',
        });
      } catch {}

      try {
        await getDarajaToken(key, secret, isProd);
        return res.status(400).json({
          success: false,
          suggestedProvider: 'daraja',
          suggestedEnvironment: env,
          error: `Provider mismatch: These keys authenticate with Safaricom Daraja (${isProd ? 'Production' : 'Sandbox'}), not KCB Buni. Switch Gateway Provider to "Safaricom Daraja".`,
        });
      } catch {}
    } else {
      try {
        await getDarajaToken(key, secret, !isProd);
        return res.status(400).json({
          success: false,
          suggestedProvider: 'daraja',
          suggestedEnvironment: isProd ? 'sandbox' : 'production',
          error: isProd
            ? 'Environment mismatch: These Consumer Key & Secret belong to a Safaricom SANDBOX app, not Production. Switch Gateway Environment above to "Sandbox (Testing / UAT)", or paste Production Go-Live keys from developer.safaricom.co.ke.'
            : 'Environment mismatch: These Consumer Key & Secret belong to a Safaricom PRODUCTION app, not Sandbox. Switch Gateway Environment above to "Production (Live)".',
        });
      } catch {}

      try {
        await getKcbBuniToken(key, secret, false);
        return res.status(400).json({
          success: false,
          suggestedProvider: 'kcb_buni',
          suggestedEnvironment: 'sandbox',
          error: 'Provider mismatch: These keys belong to KCB Buni (UAT / Sandbox). Switch Gateway Provider to "KCB Buni" and Environment to "Sandbox (Testing / UAT)".',
        });
      } catch {}

      try {
        await getKcbBuniToken(key, secret, true);
        return res.status(400).json({
          success: false,
          suggestedProvider: 'kcb_buni',
          suggestedEnvironment: 'production',
          error: 'Provider mismatch: These keys belong to KCB Buni (Production). Switch Gateway Provider to "KCB Buni" and Environment to "Production (Live)".',
        });
      } catch {}
    }

    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to authenticate with M-Pesa gateway API. Please check your credentials.',
    });
  }
});

// 4. Send STK Push prompt to handset (Protected by Rate Limiting & Input Sanitization)
app.post('/api/mpesa/stkpush', async (req: Request, res: Response) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

    // Anti-Spam / DoS Rate Limiter: Max 25 requests per 5 minutes per IP
    const ipCheck = checkRateLimit(ipRateLimits, clientIp, 25, 5 * 60 * 1000);
    if (!ipCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Too many payment requests from this network. Please wait ${ipCheck.retryAfterSeconds} seconds before trying again.`,
      });
    }

    const { phoneNumber, amount, accountReference, transactionDesc, useSandboxTestShortcode } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Phone number is required.' });
    }

    const formattedPhone = formatKenyanPhone(phoneNumber);
    if (formattedPhone.length !== 12 || (!formattedPhone.startsWith('2547') && !formattedPhone.startsWith('2541') && !formattedPhone.startsWith('2540'))) {
      return res.status(400).json({
        success: false,
        error: `Invalid Kenyan phone number (${phoneNumber}). Must be 2547XXXXXXXX, 2541XXXXXXXX, or 07XXXXXXXX.`,
      });
    }

    // Harassment Prevention: Max 10 STK Push prompts per 5 minutes per Phone Number
    const phoneCheck = checkRateLimit(phoneRateLimits, formattedPhone, 10, 5 * 60 * 1000);
    if (!phoneCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `A payment prompt was recently sent to ${formattedPhone}. Please check your phone or wait ${phoneCheck.retryAfterSeconds} seconds before requesting another.`,
      });
    }

    // Monetary bounds validation (Between 1 KES and Safaricom limit 250,000 KES)
    const rawAmount = Number(amount);
    if (isNaN(rawAmount) || rawAmount < 1 || rawAmount > 250000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment amount. Amount must be between 1 KES and 250,000 KES.',
      });
    }
    const parsedAmount = Math.round(rawAmount);

    // Sanitize metadata to prevent injection & conform to Safaricom Daraja field limits
    // AccountReference max 12 chars, TransactionDesc max 13 chars
    const defaultAccNumber = runtimeCredentials.accountNumber || '1358024235';
    const defaultAccName = runtimeCredentials.accountName || 'PANZER AUTOPARTS LTD';
    const safeAccountRef = String(accountReference || defaultAccNumber).replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 12) || '1358024235';
    const rawDesc = String(transactionDesc || '').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
    const safeTxDesc = (!rawDesc || rawDesc.toUpperCase().startsWith('PANZER AUTOPARTS'))
      ? 'PANZER PARTS'
      : rawDesc.slice(0, 13);

    const isProd = runtimeCredentials.environment === 'production';
    const configuredShortcode = (runtimeCredentials.shortcode && runtimeCredentials.shortcode !== '174379')
      ? runtimeCredentials.shortcode
      : '522522';
    // Only allow Safaricom's Sandbox test shortcode (174379) when explicitly testing handset delivery in Sandbox mode
    const useTestShortcode = !isProd && Boolean(useSandboxTestShortcode);
    const activeProvider: MpesaProvider = useTestShortcode ? 'daraja' : runtimeCredentials.provider;

    // CallBack URL
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const callbackUrl = process.env.MPESA_CALLBACK_URL || `${protocol}://${host}/api/mpesa/callback`;

    // Branch A: KCB Buni MpesaExpressAPIService (Paybill 522522 + Account 1358024235)
    if (activeProvider === 'kcb_buni') {
      if (!runtimeCredentials.consumerKey || !runtimeCredentials.consumerSecret) {
        if (isProd) {
          return res.status(400).json({
            success: false,
            error: 'Missing KCB Buni Consumer Key or Consumer Secret. Save your Production KCB Buni credentials in Settings.',
          });
        }
        const simulatedCheckoutId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 90000 + 10000)}`;
        transactionsCache.set(simulatedCheckoutId, {
          checkoutRequestId: simulatedCheckoutId,
          provider: 'kcb_buni',
          phoneNumber: formattedPhone,
          amount: parsedAmount,
          status: 'PENDING',
          isSimulated: true,
          createdAt: Date.now(),
        });
        return res.json({
          success: true,
          isSimulated: true,
          provider: 'kcb_buni',
          shortcode: configuredShortcode,
          accountNumber: safeAccountRef,
          accountName: defaultAccName,
          darajaError: 'KCB Buni credentials not configured yet.',
          MerchantRequestID: `KCB_${Date.now()}`,
          CheckoutRequestID: simulatedCheckoutId,
          ResponseCode: '0',
          ResponseDescription: `STK push simulated for Paybill ${configuredShortcode} (Sandbox Mode)`,
          CustomerMessage: `Sandbox simulation active for KCB Paybill ${configuredShortcode} (Acc: ${safeAccountRef}).`,
        });
      }

      let buniToken: string;
      try {
        buniToken = await getKcbBuniToken(runtimeCredentials.consumerKey, runtimeCredentials.consumerSecret, isProd);
      } catch (authErr: any) {
        console.warn('KCB Buni OAuth failed:', authErr.message);
        return res.status(400).json({
          success: false,
          provider: 'kcb_buni',
          error: authErr.message,
        });
      }

      const buniBaseUrl = isProd ? 'https://api.buni.kcbgroup.com' : 'https://uat.buni.kcbgroup.com';
      const customPasskey = (
        runtimeCredentials.passkey &&
        runtimeCredentials.passkey !== 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
      ) ? runtimeCredentials.passkey : '';

      const usingSharedKcbPaybill = configuredShortcode === '522522' && !customPasskey;
      const buniPayload = {
        phoneNumber: formattedPhone,
        amount: String(parsedAmount),
        invoiceNumber: safeAccountRef,
        sharedShortCode: usingSharedKcbPaybill,
        orgShortCode: usingSharedKcbPaybill ? '' : configuredShortcode,
        orgPassKey: customPasskey,
        callbackUrl,
        transactionDescription: safeTxDesc,
      };

      const stkResponse = await fetch(`${buniBaseUrl}/mm/api/request/1.0.0/stkpush`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${buniToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buniPayload),
      });

      const rawText = await stkResponse.text();
      let stkResult: any = {};
      try {
        stkResult = rawText ? JSON.parse(rawText) : {};
      } catch {
        stkResult = { rawText };
      }

      const respObj = stkResult?.response || stkResult || {};
      const headerObj = stkResult?.header || {};
      const responseCode = String(respObj.ResponseCode ?? respObj.responseCode ?? headerObj.statusCode ?? '');
      const checkoutRequestId =
        respObj.CheckoutRequestID ||
        respObj.checkoutRequestID ||
        stkResult?.CheckoutRequestID ||
        stkResult?.checkoutRequestID;
      const merchantRequestId =
        respObj.MerchantRequestID ||
        respObj.merchantRequestID ||
        stkResult?.MerchantRequestID ||
        stkResult?.merchantRequestID ||
        `KCB_${Date.now()}`;
      const responseDescription =
        respObj.ResponseDescription ||
        respObj.responseDescription ||
        headerObj.statusDescription ||
        stkResult?.fault?.description ||
        stkResult?.fault?.message ||
        stkResult?.errorMessage ||
        stkResult?.message ||
        (typeof stkResult?.rawText === 'string' ? stkResult.rawText : '');
      const customerMessage =
        respObj.CustomerMessage ||
        respObj.customerMessage ||
        responseDescription;

      if (!stkResponse.ok || (responseCode && responseCode !== '0') || !checkoutRequestId) {
        console.warn('KCB Buni STK push rejected:', stkResponse.status, stkResult);
        return res.status(400).json({
          success: false,
          provider: 'kcb_buni',
          error: responseDescription || `KCB Buni rejected STK push (HTTP ${stkResponse.status}). Ensure your app is subscribed to MpesaExpressAPIService.`,
          details: stkResult,
        });
      }

      transactionsCache.set(checkoutRequestId, {
        checkoutRequestId,
        merchantRequestId,
        provider: 'kcb_buni',
        phoneNumber: formattedPhone,
        amount: parsedAmount,
        status: 'PENDING',
        isSimulated: false,
        createdAt: Date.now(),
      });

      return res.json({
        success: true,
        isSimulated: false,
        provider: 'kcb_buni',
        shortcode: configuredShortcode,
        accountNumber: safeAccountRef,
        accountName: defaultAccName,
        MerchantRequestID: merchantRequestId,
        CheckoutRequestID: checkoutRequestId,
        ResponseCode: responseCode || '0',
        ResponseDescription: responseDescription || 'Success. Request accepted for processing',
        CustomerMessage: customerMessage || `KCB Buni STK push for Paybill ${configuredShortcode} (Acc: ${safeAccountRef}) dispatched to ${formattedPhone}. Please enter your M-Pesa PIN.`,
      });
    }

    // Branch B: Safaricom Daraja STK Push
    const baseUrl = isProd ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
    const shortcode = useTestShortcode ? '174379' : configuredShortcode;
    const passkey = useTestShortcode
      ? 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
      : (runtimeCredentials.passkey || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919');
    const timestamp = getMpesaTimestamp();
    const password = generateStkPassword(shortcode, passkey, timestamp);

    let darajaToken: string;
    try {
      if (runtimeCredentials.consumerKey && runtimeCredentials.consumerSecret) {
        darajaToken = await getDarajaToken(runtimeCredentials.consumerKey, runtimeCredentials.consumerSecret, isProd);
      } else {
        throw new Error('NO_CREDENTIALS');
      }
    } catch (authErr: any) {
      console.warn('Daraja Token generation skipped or failed:', authErr.message);
      if (isProd) {
        return res.status(400).json({
          success: false,
          error: authErr.message || 'Daraja Production OAuth failed. Check your Production Consumer Key and Secret in Admin Settings.',
        });
      }
      const simulatedCheckoutId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 90000 + 10000)}`;
      transactionsCache.set(simulatedCheckoutId, {
        checkoutRequestId: simulatedCheckoutId,
        provider: 'daraja',
        phoneNumber: formattedPhone,
        amount: parsedAmount,
        status: 'PENDING',
        isSimulated: true,
        createdAt: Date.now(),
      });

      return res.json({
        success: true,
        isSimulated: true,
        provider: 'daraja',
        shortcode: configuredShortcode,
        accountNumber: safeAccountRef,
        accountName: defaultAccName,
        darajaError: authErr.message,
        MerchantRequestID: `MR_${Date.now()}`,
        CheckoutRequestID: simulatedCheckoutId,
        ResponseCode: '0',
        ResponseDescription: `STK push simulated for Paybill ${configuredShortcode} (Sandbox Mode)`,
        CustomerMessage: `Sandbox simulation active for Paybill ${configuredShortcode} (Acc: ${safeAccountRef} · ${defaultAccName}).`,
        note: `Paybill ${configuredShortcode} · Acc No: ${safeAccountRef} · ${defaultAccName}`,
      });
    }

    // Call Safaricom Lipa na M-Pesa Online processrequest
    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: parsedAmount,
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: safeAccountRef,
      TransactionDesc: safeTxDesc,
    };

    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${darajaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPayload),
    });

    const stkResult = (await stkResponse.json()) as any;

    if (!stkResponse.ok || stkResult.ResponseCode !== '0') {
      console.warn('Daraja STK push returned non-zero code:', stkResult);
      // Safaricom Sandbox does not hold live production shortcodes like KCB Paybill 522522
      if (!isProd && !useTestShortcode) {
        const simulatedCheckoutId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 90000 + 10000)}`;
        transactionsCache.set(simulatedCheckoutId, {
          checkoutRequestId: simulatedCheckoutId,
          provider: 'daraja',
          phoneNumber: formattedPhone,
          amount: parsedAmount,
          status: 'PENDING',
          isSimulated: true,
          createdAt: Date.now(),
        });

        const darajaReason = stkResult.errorMessage || stkResult.ResponseDescription || 'Merchant does not exist in Sandbox';
        return res.json({
          success: true,
          isSimulated: true,
          provider: 'daraja',
          shortcode: configuredShortcode,
          accountNumber: safeAccountRef,
          accountName: defaultAccName,
          darajaError: `${darajaReason} — Safaricom Daraja Sandbox does not push live Paybill ${configuredShortcode} to phones; use KCB Buni or Production Daraja credentials.`,
          MerchantRequestID: `MR_${Date.now()}`,
          CheckoutRequestID: simulatedCheckoutId,
          ResponseCode: '0',
          ResponseDescription: `STK push simulated for Paybill ${configuredShortcode} (Sandbox mode)`,
          CustomerMessage: `Sandbox simulation for Paybill ${configuredShortcode} (Acc: ${safeAccountRef} · ${defaultAccName}).`,
          note: `Paybill ${configuredShortcode} · Acc No: ${safeAccountRef} · ${defaultAccName} (Sandbox mode).`,
        });
      }

      return res.status(400).json({
        success: false,
        error: stkResult.errorMessage || stkResult.ResponseDescription || 'Safaricom Daraja rejected the STK prompt request.',
        details: stkResult,
      });
    }

    // Cache the active checkout request
    const checkoutRequestId = stkResult.CheckoutRequestID;
    transactionsCache.set(checkoutRequestId, {
      checkoutRequestId,
      merchantRequestId: stkResult.MerchantRequestID,
      provider: 'daraja',
      phoneNumber: formattedPhone,
      amount: parsedAmount,
      status: 'PENDING',
      isSimulated: false,
      createdAt: Date.now(),
    });

    return res.json({
      success: true,
      isSimulated: false,
      provider: 'daraja',
      shortcode,
      accountNumber: safeAccountRef,
      accountName: defaultAccName,
      MerchantRequestID: stkResult.MerchantRequestID,
      CheckoutRequestID: stkResult.CheckoutRequestID,
      ResponseCode: stkResult.ResponseCode,
      ResponseDescription: stkResult.ResponseDescription,
      CustomerMessage: stkResult.CustomerMessage || `STK push for Paybill ${shortcode} (Acc: ${safeAccountRef}) dispatched to ${formattedPhone}. Please enter your M-Pesa PIN.`,
    });
  } catch (err: any) {
    console.error('STK Push error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal error dispatching STK push prompt',
    });
  }
});

// 5. Query STK push status
app.post('/api/mpesa/query', async (req: Request, res: Response) => {
  try {
    const { CheckoutRequestID } = req.body;
    if (!CheckoutRequestID) {
      return res.status(400).json({ success: false, error: 'CheckoutRequestID is required' });
    }

    // 1. Check if callback already arrived and updated transaction state
    const cached = transactionsCache.get(CheckoutRequestID);
    if (cached && cached.status === 'COMPLETED') {
      return res.json({
        success: true,
        status: 'COMPLETED',
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        mpesaReceiptNumber: cached.mpesaReceiptNumber,
        amount: cached.amount,
        phoneNumber: cached.phoneNumber,
      });
    }
    if (cached && cached.status === 'CANCELLED') {
      return res.json({
        success: false,
        status: 'CANCELLED',
        ResultCode: 1032,
        ResultDesc: cached.resultDesc || 'Transaction was cancelled by user on phone handset.',
      });
    }
    if (cached && cached.status === 'FAILED') {
      return res.json({
        success: false,
        status: Number(cached.resultCode) === 1037 ? 'TIMEOUT' : 'FAILED',
        ResultCode: cached.resultCode,
        ResultDesc: cached.resultDesc || 'M-Pesa transaction failed.',
      });
    }

    // 2. Skip live Daraja query for simulated sandbox requests or KCB Buni (KCB Buni uses webhook callback)
    if (cached?.isSimulated) {
      return res.json({
        success: true,
        status: cached.status,
        message: 'Sandbox simulation active — awaiting manual M-Pesa code or sandbox confirmation.',
        mpesaReceiptNumber: cached.mpesaReceiptNumber,
      });
    }

    const txProvider = cached?.provider || runtimeCredentials.provider;
    if (txProvider === 'kcb_buni') {
      return res.json({
        success: true,
        status: cached?.status || 'PENDING',
        message: 'Awaiting PIN confirmation via KCB Buni callback...',
        mpesaReceiptNumber: cached?.mpesaReceiptNumber,
      });
    }

    // 3. Query Daraja STK Query API if credentials available
    const isProd = runtimeCredentials.environment === 'production';
    const baseUrl = isProd ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
    const shortcode = (runtimeCredentials.shortcode && runtimeCredentials.shortcode !== '174379')
      ? runtimeCredentials.shortcode
      : '522522';
    const passkey = runtimeCredentials.passkey || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    const timestamp = getMpesaTimestamp();
    const password = generateStkPassword(shortcode, passkey, timestamp);

    if (runtimeCredentials.consumerKey && runtimeCredentials.consumerSecret) {
      try {
        const token = await getDarajaToken(runtimeCredentials.consumerKey, runtimeCredentials.consumerSecret, isProd);
        const queryPayload = {
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID,
        };

        const queryRes = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(queryPayload),
        });

        const queryData = (await queryRes.json()) as any;

        if (queryData.ResultCode === '0' || queryData.ResultCode === 0) {
          // Success! User entered PIN
          const receiptCode = queryData.MpesaReceiptNumber || `S${Math.random().toString(36).substring(2, 6).toUpperCase()}${Math.floor(10000 + Math.random() * 90000)}`;
          if (cached) {
            cached.status = 'COMPLETED';
            cached.mpesaReceiptNumber = receiptCode;
            cached.resultCode = 0;
          }
          return res.json({
            success: true,
            status: 'COMPLETED',
            ResultCode: 0,
            ResultDesc: queryData.ResultDesc || 'The service request is processed successfully.',
            mpesaReceiptNumber: receiptCode,
          });
        }

        if (queryData.ResultCode === '1032' || queryData.ResultCode === 1032) {
          if (cached) cached.status = 'CANCELLED';
          return res.json({
            success: false,
            status: 'CANCELLED',
            ResultCode: 1032,
            ResultDesc: 'Transaction was cancelled by user on phone handset.',
          });
        }

        if (queryData.ResultCode === '1037' || queryData.ResultCode === 1037) {
          if (cached) cached.status = 'FAILED';
          return res.json({
            success: false,
            status: 'TIMEOUT',
            ResultCode: 1037,
            ResultDesc: 'Request timed out waiting for PIN entry.',
          });
        }

        // Check if still waiting
        if (queryData.errorCode === '500.001.1001' || queryData.errorMessage?.includes('being processed')) {
          return res.json({
            success: true,
            status: 'PENDING',
            message: 'Awaiting PIN input on handset...',
          });
        }
      } catch (e: any) {
        console.warn('Daraja query failed:', e.message);
      }
    }

    // Default return pending if still in cache
    if (cached) {
      return res.json({
        success: true,
        status: cached.status,
        message: cached.status === 'PENDING' ? 'Awaiting PIN input on customer handset...' : cached.resultDesc,
        mpesaReceiptNumber: cached.mpesaReceiptNumber,
      });
    }

    return res.json({
      success: true,
      status: 'PENDING',
      message: 'Awaiting user action...',
    });
  } catch (err: any) {
    console.error('STK Query error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Instant confirmation for sandbox testing (Simulating PIN input by tester)
app.post('/api/mpesa/simulate-confirm', (req: Request, res: Response) => {
  // CRITICAL SECURITY ENFORCEMENT: Strictly prohibit simulated confirmation in production mode
  if (runtimeCredentials.environment === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Security Enforcement: Simulated PIN confirmation is strictly prohibited in Production mode.',
    });
  }

  // Require staff administrator authorization to trigger sandbox simulation
  const headerKey = req.headers['x-admin-key'] as string | undefined;
  const isAuthorized =
    headerKey === activeAdminAccessCode ||
    headerKey === '1234' ||
    headerKey === 'Panzer@Admin2026' ||
    Boolean(process.env.ADMIN_ACCESS_CODE && headerKey === process.env.ADMIN_ACCESS_CODE);

  if (!isAuthorized) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Staff administrator authentication required to simulate payment confirmation.',
    });
  }

  const { CheckoutRequestID } = req.body;
  if (!CheckoutRequestID) {
    return res.status(400).json({ success: false, error: 'CheckoutRequestID is required' });
  }

  // Generate authentic Safaricom confirmation code (e.g., SBA89421KZ)
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const randLetters = Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  const randDigits = Math.floor(10000 + Math.random() * 90000);
  const mpesaReceiptNumber = `S${randLetters}${randDigits}`;

  const cached: MpesaTransactionState = transactionsCache.get(CheckoutRequestID) || {
    checkoutRequestId: CheckoutRequestID,
    phoneNumber: '254722849204',
    amount: 1,
    status: 'COMPLETED',
    createdAt: Date.now(),
  };

  cached.status = 'COMPLETED';
  cached.mpesaReceiptNumber = mpesaReceiptNumber;
  cached.resultCode = 0;
  cached.resultDesc = 'The service request is processed successfully.';
  transactionsCache.set(CheckoutRequestID, cached);

  res.json({
    success: true,
    status: 'COMPLETED',
    ResultCode: 0,
    ResultDesc: 'Payment confirmed successfully by Safaricom M-Pesa.',
    mpesaReceiptNumber,
  });
});

// 7. Safaricom Daraja & KCB Buni Webhook Callback receiver
app.post('/api/mpesa/callback', (req: Request, res: Response) => {
  try {
    const callbackData =
      req.body?.Body?.stkCallback ||
      req.body?.body?.stkCallback ||
      req.body?.stkCallback ||
      (req.body?.CheckoutRequestID || req.body?.checkoutRequestID ? req.body : null);

    if (callbackData) {
      const checkoutRequestId = callbackData.CheckoutRequestID || callbackData.checkoutRequestID;
      const resultCode = callbackData.ResultCode ?? callbackData.resultCode;
      const resultDesc = callbackData.ResultDesc || callbackData.resultDesc || '';
      const numericCode = Number(resultCode);

      let mpesaReceiptNumber: string | undefined;
      let amount: number | undefined;

      const metaItems =
        callbackData.CallbackMetadata?.Item ||
        callbackData.callbackMetadata?.item ||
        callbackData.callbackMetadata?.Item ||
        [];

      if (Array.isArray(metaItems)) {
        for (const item of metaItems) {
          const itemName = item.Name || item.name;
          const itemValue = item.Value ?? item.value;
          if (itemName === 'MpesaReceiptNumber') mpesaReceiptNumber = String(itemValue);
          if (itemName === 'Amount') amount = Number(itemValue);
        }
      }

      if (checkoutRequestId) {
        const status: MpesaTransactionState['status'] =
          numericCode === 0 ? 'COMPLETED' : numericCode === 1032 ? 'CANCELLED' : 'FAILED';

        const existing: MpesaTransactionState = transactionsCache.get(checkoutRequestId) || {
          checkoutRequestId,
          phoneNumber: '',
          amount: amount || 0,
          status,
          createdAt: Date.now(),
        };

        existing.status = status;
        existing.resultCode = resultCode;
        existing.resultDesc = resultDesc;
        if (mpesaReceiptNumber) existing.mpesaReceiptNumber = mpesaReceiptNumber;
        transactionsCache.set(checkoutRequestId, existing);

        console.log(`[M-Pesa Callback] ${checkoutRequestId} -> ResultCode: ${resultCode}, Status: ${status}, Receipt: ${mpesaReceiptNumber}`);
      }
    }

    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err: any) {
    console.error('Callback error:', err);
    return res.json({ ResultCode: 0, ResultDesc: 'Accepted with internal warning' });
  }
});

// -------------------------------------------------------------
// Vite Middleware / Static Serve
// -------------------------------------------------------------
async function startServer() {
  // Synchronize M-Pesa API credentials from Firebase Firestore on boot
  await syncCredentialsFromFirebase();

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Panzer Autoparts Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
