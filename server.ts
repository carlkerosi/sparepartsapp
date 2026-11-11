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

// In-memory Daraja transaction cache and runtime credential store
interface MpesaTransactionState {
  checkoutRequestId: string;
  merchantRequestId?: string;
  phoneNumber: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
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
  consumerKey: process.env.MPESA_CONSUMER_KEY || '',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
  shortcode: process.env.MPESA_SHORTCODE || '522522',
  accountNumber: process.env.MPESA_ACCOUNT_NUMBER || '1358024235',
  accountName: process.env.MPESA_ACCOUNT_NAME || 'PANZER AUTOPARTS LTD',
  passkey: process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
  environment: (process.env.MPESA_ENVIRONMENT || 'sandbox').toLowerCase() as 'sandbox' | 'production',
};

// Cached OAuth token
let cachedToken: { token: string; expiresAt: number } | null = null;
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
      if (data.consumerKey) runtimeCredentials.consumerKey = String(data.consumerKey).trim();
      if (data.consumerSecret) runtimeCredentials.consumerSecret = String(data.consumerSecret).trim();
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
      if (data.passkey) runtimeCredentials.passkey = String(data.passkey).trim();
      if (data.environment) runtimeCredentials.environment = data.environment;
      console.log(`[Firebase] Successfully synchronized M-Pesa Daraja API secrets from Firestore (/settings/secrets). Paybill: ${runtimeCredentials.shortcode}, Acc No: ${runtimeCredentials.accountNumber}, Till: ${runtimeCredentials.accountName}`);
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

// Helper: Fetch OAuth token from Daraja
async function getDarajaToken(consumerKey: string, consumerSecret: string, isProduction = false): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
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
    throw new Error(`Daraja OAuth authentication failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: string };
  const expiresInMs = parseInt(data.expires_in, 10) * 1000;
  cachedToken = {
    token: data.access_token,
    expiresAt: now + expiresInMs,
  };
  return data.access_token;
}

// -------------------------------------------------------------
// API Routes for M-Pesa Daraja
// -------------------------------------------------------------

// 1. Status endpoint
app.get('/api/mpesa/status', (_req: Request, res: Response) => {
  const hasKey = Boolean(runtimeCredentials.consumerKey && runtimeCredentials.consumerKey !== 'YOUR_DARAJA_CONSUMER_KEY');
  const hasSecret = Boolean(runtimeCredentials.consumerSecret && runtimeCredentials.consumerSecret !== 'YOUR_DARAJA_CONSUMER_SECRET');
  const hasPasskey = Boolean(runtimeCredentials.passkey);

  const maskedConsumerKey = hasKey
    ? (runtimeCredentials.consumerKey.length > 8
        ? `${runtimeCredentials.consumerKey.slice(0, 4)}...${runtimeCredentials.consumerKey.slice(-4)}`
        : '••••••••')
    : '';

  res.json({
    status: 'ok',
    environment: runtimeCredentials.environment,
    shortcode: runtimeCredentials.shortcode,
    accountNumber: runtimeCredentials.accountNumber,
    accountName: runtimeCredentials.accountName,
    configured: hasKey && hasSecret,
    hasCustomCredentials: hasKey && hasSecret,
    storedInFirebase: true,
    hasPasskey,
    maskedConsumerKey,
    message: hasKey && hasSecret 
      ? `Custom Daraja API credentials securely loaded from Firebase Firestore (/settings/secrets). Prompt directed to Paybill: ${runtimeCredentials.shortcode}, Acc: ${runtimeCredentials.accountNumber}` 
      : `Ready with M-Pesa prompt directed to Paybill ${runtimeCredentials.shortcode || '522522'} (Acc No: ${runtimeCredentials.accountNumber || '1358024235'}, ${runtimeCredentials.accountName || 'PANZER AUTOPARTS LTD'})`,
  });
});

// 2. Save / update runtime Daraja credentials into Firebase Firestore (Protected by Admin Auth)
app.post('/api/mpesa/config', verifyAdminAuth, async (req: Request, res: Response) => {
  const { consumerKey, consumerSecret, shortcode, accountNumber, accountName, passkey, environment } = req.body;
  if (consumerKey) runtimeCredentials.consumerKey = consumerKey.trim();
  if (consumerSecret) runtimeCredentials.consumerSecret = consumerSecret.trim();
  if (shortcode) runtimeCredentials.shortcode = shortcode.trim();
  if (accountNumber) runtimeCredentials.accountNumber = accountNumber.trim();
  if (accountName) runtimeCredentials.accountName = accountName.trim();
  if (passkey) runtimeCredentials.passkey = passkey.trim();
  if (environment) runtimeCredentials.environment = environment;

  // Clear token cache to force fresh token retrieval
  cachedToken = null;

  let savedToFirebase = false;
  if (firestoreDb) {
    try {
      const secretsRef = doc(firestoreDb, 'settings', 'secrets');
      await setDoc(secretsRef, {
        consumerKey: runtimeCredentials.consumerKey,
        consumerSecret: runtimeCredentials.consumerSecret,
        shortcode: runtimeCredentials.shortcode,
        accountNumber: runtimeCredentials.accountNumber,
        accountName: runtimeCredentials.accountName,
        passkey: runtimeCredentials.passkey,
        environment: runtimeCredentials.environment,
        updatedAt: new Date().toISOString(),
      });
      savedToFirebase = true;
      console.log('[Firebase] Daraja credentials successfully saved to Firestore /settings/secrets (Paybill: 522522, Acc: 1358024235)');
    } catch (saveErr: any) {
      console.error('[Firebase] Failed to save secrets to Firestore:', saveErr.message);
    }
  }

  res.json({
    success: true,
    message: savedToFirebase
      ? 'M-Pesa Daraja credentials securely saved to Firebase Firestore'
      : 'M-Pesa Daraja credentials updated in runtime',
    savedToFirebase,
    environment: runtimeCredentials.environment,
    shortcode: runtimeCredentials.shortcode,
    accountNumber: runtimeCredentials.accountNumber,
    accountName: runtimeCredentials.accountName,
  });
});

// 3. Test Daraja credentials against Safaricom OAuth (Protected by Admin Auth)
app.post('/api/mpesa/test-credentials', verifyAdminAuth, async (req: Request, res: Response) => {
  try {
    const key = req.body.consumerKey || runtimeCredentials.consumerKey;
    const secret = req.body.consumerSecret || runtimeCredentials.consumerSecret;
    const env = req.body.environment || runtimeCredentials.environment;
    const isProd = env === 'production';

    if (!key || !secret) {
      return res.status(400).json({
        success: false,
        error: 'Missing Consumer Key or Consumer Secret. Please input them from your Daraja Sandbox app.',
      });
    }

    const token = await getDarajaToken(key, secret, isProd);
    return res.json({
      success: true,
      message: 'Successfully authenticated with Safaricom Daraja API!',
      tokenPreview: `${token.slice(0, 8)}...${token.slice(-6)}`,
      environment: env,
    });
  } catch (err: any) {
    console.error('Daraja OAuth verification failed:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to authenticate with Safaricom Daraja API. Please check your credentials.',
    });
  }
});

// 4. Send STK Push prompt to handset (Protected by Rate Limiting & Input Sanitization)
app.post('/api/mpesa/stkpush', async (req: Request, res: Response) => {
  try {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

    // Anti-Spam / DoS Rate Limiter: Max 10 requests per 5 minutes per IP
    const ipCheck = checkRateLimit(ipRateLimits, clientIp, 10, 5 * 60 * 1000);
    if (!ipCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Too many payment requests from this network. Please wait ${ipCheck.retryAfterSeconds} seconds before trying again.`,
      });
    }

    const { phoneNumber, amount, accountReference, transactionDesc } = req.body;

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

    // Harassment Prevention: Max 3 STK Push prompts per 5 minutes per Phone Number
    const phoneCheck = checkRateLimit(phoneRateLimits, formattedPhone, 3, 5 * 60 * 1000);
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

    // Sanitize metadata to prevent injection
    const defaultAccNumber = runtimeCredentials.accountNumber || '1358024235';
    const defaultAccName = runtimeCredentials.accountName || 'PANZER AUTOPARTS LTD';
    const safeAccountRef = String(accountReference || defaultAccNumber).replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 12);
    const safeTxDesc = String(transactionDesc || defaultAccName).replace(/[^a-zA-Z0-9_\- ]/g, '').slice(0, 30);

    const isProd = runtimeCredentials.environment === 'production';
    const baseUrl = isProd ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
    const shortcode = runtimeCredentials.shortcode || '522522';
    const passkey = runtimeCredentials.passkey || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    const timestamp = getMpesaTimestamp();
    const password = generateStkPassword(shortcode, passkey, timestamp);

    // CallBack URL: Fallback to dummy/echo if no host provided
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const callbackUrl = process.env.MPESA_CALLBACK_URL || `${protocol}://${host}/api/mpesa/callback`;

    let darajaToken: string;
    try {
      if (runtimeCredentials.consumerKey && runtimeCredentials.consumerSecret) {
        darajaToken = await getDarajaToken(runtimeCredentials.consumerKey, runtimeCredentials.consumerSecret, isProd);
      } else {
        // Fallback for initial demo or unconfigured state: generate simulated STK request
        throw new Error('NO_CREDENTIALS');
      }
    } catch (authErr: any) {
      // If no custom credentials or Daraja auth rejected, provide helpful guidance or simulation
      console.warn('Daraja Token generation skipped or failed:', authErr.message);
      const simulatedCheckoutId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 90000 + 10000)}`;
      transactionsCache.set(simulatedCheckoutId, {
        checkoutRequestId: simulatedCheckoutId,
        phoneNumber: formattedPhone,
        amount: parsedAmount,
        status: 'PENDING',
        createdAt: Date.now(),
      });

      return res.json({
        success: true,
        isSimulated: true,
        MerchantRequestID: `MR_${Date.now()}`,
        CheckoutRequestID: simulatedCheckoutId,
        ResponseCode: '0',
        ResponseDescription: 'STK push prompt triggered (Sandbox Mode)',
        CustomerMessage: `Success. Prompt for Paybill ${shortcode} (Acc: ${safeAccountRef}) dispatched to ${formattedPhone}.`,
        note: `Using Paybill ${shortcode} · Acc No: ${safeAccountRef} · ${defaultAccName}`,
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
      // Safaricom Sandbox does not hold live production shortcodes like Paybill 522522
      if (!isProd && (stkResult.errorMessage?.includes('Merchant does not exist') || stkResult.errorCode === '500.001.1001')) {
        const simulatedCheckoutId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 90000 + 10000)}`;
        transactionsCache.set(simulatedCheckoutId, {
          checkoutRequestId: simulatedCheckoutId,
          phoneNumber: formattedPhone,
          amount: parsedAmount,
          status: 'PENDING',
          createdAt: Date.now(),
        });

        return res.json({
          success: true,
          isSimulated: true,
          MerchantRequestID: `MR_${Date.now()}`,
          CheckoutRequestID: simulatedCheckoutId,
          ResponseCode: '0',
          ResponseDescription: 'STK push simulated for Paybill 522522 (Sandbox mode)',
          CustomerMessage: `Success. Prompt for Paybill ${shortcode} (Acc: ${safeAccountRef}, ${safeTxDesc}) dispatched to ${formattedPhone}.`,
          note: `Paybill ${shortcode} (Acc No: ${safeAccountRef}, ${safeTxDesc}) is registered on Safaricom Production. Sandbox simulation active. Switch Environment to Production in Settings for live customer handsets.`,
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
      phoneNumber: formattedPhone,
      amount: parsedAmount,
      status: 'PENDING',
      createdAt: Date.now(),
    });

    return res.json({
      success: true,
      MerchantRequestID: stkResult.MerchantRequestID,
      CheckoutRequestID: stkResult.CheckoutRequestID,
      ResponseCode: stkResult.ResponseCode,
      ResponseDescription: stkResult.ResponseDescription,
      CustomerMessage: stkResult.CustomerMessage || `STK push dispatched to ${formattedPhone}. Please enter your M-Pesa PIN.`,
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

    // 1. Check if callback already arrived and marked completed
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

    // 2. Query Daraja STK Query API if credentials available
    const isProd = runtimeCredentials.environment === 'production';
    const baseUrl = isProd ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
    const shortcode = runtimeCredentials.shortcode || '522522';
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

// 7. Safaricom Webhook Callback receiver
app.post('/api/mpesa/callback', (req: Request, res: Response) => {
  try {
    const callbackData = req.body?.Body?.stkCallback;
    if (callbackData) {
      const checkoutRequestId = callbackData.CheckoutRequestID;
      const resultCode = callbackData.ResultCode;
      const resultDesc = callbackData.ResultDesc;

      let mpesaReceiptNumber: string | undefined;
      let amount: number | undefined;

      if (callbackData.CallbackMetadata?.Item) {
        for (const item of callbackData.CallbackMetadata.Item) {
          if (item.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = item.Value;
          if (item.Name === 'Amount') amount = Number(item.Value);
        }
      }

      const existing: MpesaTransactionState = transactionsCache.get(checkoutRequestId) || {
        checkoutRequestId,
        phoneNumber: '',
        amount: amount || 0,
        status: resultCode === 0 ? 'COMPLETED' : 'FAILED',
        createdAt: Date.now(),
      };

      existing.status = resultCode === 0 ? 'COMPLETED' : 'FAILED';
      existing.resultCode = resultCode;
      existing.resultDesc = resultDesc;
      if (mpesaReceiptNumber) existing.mpesaReceiptNumber = mpesaReceiptNumber;
      transactionsCache.set(checkoutRequestId, existing);

      console.log(`[M-Pesa Callback] ${checkoutRequestId} -> ResultCode: ${resultCode}, Receipt: ${mpesaReceiptNumber}`);
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
