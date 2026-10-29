# Firestore Security Specification & Hardening Guide

## 1. Data Invariants

1. **Immunity of Audit Trail**: Stock movements (`/movements/{movementId}`) are strictly write-once immutable ledger records. Once committed, they can never be modified or deleted (`allow update, delete: if false`).
2. **Sale Record Terminal Integrity**: Sales ledger entries (`/sales/{saleId}`) represent finalized commercial invoices. Critical financial values (`invoiceNumber`, `totalInc`, `subtotalEx`, `items`) cannot be forged or arbitrarily altered once recorded.
3. **Stock Non-Negativity & Bounds**: Real-time stock on hand (`stockQuantity` in `/parts/{partId}`, `newStock` in `/movements/{movementId}`) must never be negative numbers.
4. **Price Realism & Non-Negative Economics**: Unit costs (FOB USD, Landed KSh) and retail pricing (Selling Ex, Selling Inc) in `/parts/{partId}` must be non-negative numeric floats/integers.
5. **Path Variable Hardening**: Every document ID (`partId`, `saleId`, `movementId`, `supplierId`, `settingId`) must conform to `isValidId()` (string, length 1..128, alphanumeric + `_` + `-`).
6. **Denial-of-Wallet & Memory Protection**: Maximum payload lengths are enforced on every string and array (e.g. descriptions <= 250 chars, URLs <= 2.5MB base64 data asset, items <= 100 entries, notes <= 1000 chars).
7. **Strict Field Whitelisting**: Payloads must strictly match defined entity attributes; shadow fields and prototype pollution keys are rejected.

---

## 2. The "Dirty Dozen" Threat Payloads (Adversarial Security Audit)

The following 12 attack vectors are mathematically blocked by `firestore.rules`:

| # | Attack Vector | Malicious Payload Sample | Expected Result | Enforcing Rule Gate |
|---|---|---|---|---|
| 1 | **ID Poisoning / Path Traversal** | Document ID: `../../hack/admin` or 10KB string | **PERMISSION_DENIED** | `isValidId(partId)` regex and size `<= 128` |
| 2 | **Negative Stock Manipulation** | `{ stockQuantity: -50 }` in `/parts/part-1` | **PERMISSION_DENIED** | `data.stockQuantity is number && data.stockQuantity >= 0` |
| 3 | **Negative Pricing Injection** | `{ retailPriceInc: -1000, retailPriceEx: -800 }` | **PERMISSION_DENIED** | `data.retailPriceEx >= 0 && data.retailPriceInc >= 0` |
| 4 | **Stock Movement Tampering** | `update` on `/movements/mov-1` with `{ quantityDelta: 999 }` | **PERMISSION_DENIED** | `allow update, delete: if false;` |
| 5 | **Audit Trail Deletion** | `delete` on `/movements/mov-1` | **PERMISSION_DENIED** | `allow update, delete: if false;` |
| 6 | **Unbounded Array Exhaustion** | `{ items: [ ...10,000 items ] }` in `/sales/sale-1` | **PERMISSION_DENIED** | `data.items.size() <= 100` |
| 7 | **Ghost / Shadow Field Injection** | `{ partNumber: "RR-1", isFree: true, adminOverride: true }` | **PERMISSION_DENIED** | `isValidPart(incoming())` strict attribute whitelist |
| 8 | **Negative Sales Total** | `{ totalInc: -50000, subtotalEx: -43103 }` | **PERMISSION_DENIED** | `data.totalInc >= 0 && data.subtotalEx >= 0` |
| 9 | **Oversized String Buffer Exhaustion** | Description string with 50,000 junk characters | **PERMISSION_DENIED** | `data.description.size() <= 250` |
| 10 | **Supplier Status Poisoning** | `{ status: "SUPER_ADMIN" }` in `/suppliers/sup-1` | **PERMISSION_DENIED** | `data.status in ['ACTIVE', 'INACTIVE', 'UNDER_REVIEW']` |
| 11 | **Supplier Rating Spoofing** | `{ rating: 99 }` in `/suppliers/sup-1` | **PERMISSION_DENIED** | `data.rating >= 0 && data.rating <= 5` |
| 12 | **Catch-All Wildcard Extraction** | `get` or `list` on undefined `/passwords/root` | **PERMISSION_DENIED** | `match /{document=**} { allow read, write: if false; }` |

---

## 3. Test Runner Invariant Mapping

All client-side mutation endpoints (`savePartToFirestore`, `saveSaleToFirestore`, `saveMovementToFirestore`, `saveSupplierToFirestore`, `saveSettingsToFirestore`) invoke `handleFirestoreError`, producing a structured `FirestoreErrorInfo` context payload on rejection.
