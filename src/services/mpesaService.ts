/**
 * Safaricom M-Pesa Daraja STK Push Integration Service
 * Connects client UI to Express backend proxy endpoints (/api/mpesa/*)
 */

export interface MpesaStatusResponse {
  status: string;
  environment: 'sandbox' | 'production';
  shortcode: string;
  accountNumber?: string;
  accountName?: string;
  configured: boolean;
  hasCustomCredentials: boolean;
  storedInFirebase?: boolean;
  maskedConsumerKey?: string;
  hasPasskey?: boolean;
  message: string;
}

export interface StkPushResponse {
  success: boolean;
  shortcode?: string;
  accountNumber?: string;
  accountName?: string;
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResponseCode?: string;
  ResponseDescription?: string;
  CustomerMessage?: string;
  isSimulated?: boolean;
  error?: string;
  note?: string;
}

export interface StkQueryResponse {
  success: boolean;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'TIMEOUT' | 'FAILED';
  ResultCode?: number | string;
  ResultDesc?: string;
  mpesaReceiptNumber?: string;
  amount?: number;
  message?: string;
  error?: string;
}

export interface DarajaConfigPayload {
  consumerKey?: string;
  consumerSecret?: string;
  shortcode?: string;
  accountNumber?: string;
  accountName?: string;
  passkey?: string;
  environment?: 'sandbox' | 'production';
}

/**
 * Fetch status of M-Pesa Daraja configuration
 */
export async function getMpesaStatus(): Promise<MpesaStatusResponse> {
  try {
    const res = await fetch('/api/mpesa/status');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    return {
      status: 'offline',
      environment: 'sandbox',
      shortcode: '522522',
      accountNumber: '1358024235',
      accountName: 'PANZER AUTOPARTS LTD',
      configured: false,
      hasCustomCredentials: false,
      message: 'Server proxy initializing or running in offline mode',
    };
  }
}

/**
 * Send STK Push prompt to customer handset via Daraja API
 */
export async function initiateStkPush(params: {
  phoneNumber: string;
  amount: number;
  accountReference?: string;
  transactionDesc?: string;
}): Promise<StkPushResponse> {
  const res = await fetch('/api/mpesa/stkpush', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok && !data.CheckoutRequestID) {
    throw new Error(data.error || 'Failed to dispatch Lipa na M-Pesa prompt.');
  }
  return data;
}

/**
 * Poll STK Push status from Daraja API
 */
export async function queryStkStatus(checkoutRequestId: string): Promise<StkQueryResponse> {
  const res = await fetch('/api/mpesa/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ CheckoutRequestID: checkoutRequestId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Status query failed.');
  }

  return await res.json();
}

function getAdminKey(): string {
  try {
    const raw = localStorage.getItem('panzer_settings_v6') || localStorage.getItem('panzer_settings_v5');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.adminAccessCode) return parsed.adminAccessCode;
    }
  } catch {}
  return '1234';
}

/**
 * Trigger immediate sandbox confirmation (Sandbox testing only)
 */
export async function simulateStkConfirm(checkoutRequestId: string): Promise<StkQueryResponse> {
  const res = await fetch('/api/mpesa/simulate-confirm', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-admin-key': getAdminKey(),
    },
    body: JSON.stringify({ CheckoutRequestID: checkoutRequestId }),
  });

  return await res.json();
}

/**
 * Save Daraja credentials to backend proxy (requires admin authorization)
 */
export async function updateDarajaConfig(config: DarajaConfigPayload): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/mpesa/config', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-admin-key': getAdminKey(),
    },
    body: JSON.stringify(config),
  });
  return await res.json();
}

/**
 * Test Daraja credentials with Safaricom OAuth (requires admin authorization)
 */
export async function testDarajaCredentials(credentials: {
  consumerKey: string;
  consumerSecret: string;
  environment?: 'sandbox' | 'production';
}): Promise<{ success: boolean; message: string; tokenPreview?: string; error?: string }> {
  const res = await fetch('/api/mpesa/test-credentials', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-admin-key': getAdminKey(),
    },
    body: JSON.stringify(credentials),
  });
  return await res.json();
}
