# SwipesBlue Phase 2: Payment Processing API ✅

Complete Partner API for processing payments on behalf of merchants across the TriadBlue ecosystem.

## What's New in Phase 2

Phase 2 adds full payment processing capabilities with API authentication, enabling BusinessBlueprint and HostsBlue to:
- Process payments on behalf of their clients (merchants)
- Manage refunds
- Query transaction history
- Secure API access with platform-specific API keys

## Implementation Summary

### 1. Database Schema Updates

#### API Keys Table (`api_keys`)
**Purpose:** Secure authentication for partner platforms

Fields:
- `id` - Primary key
- `platform` - Platform identifier ('businessblueprint' | 'hostsblue' | 'swipesblue' | 'internal')
- `name` - Friendly name for the key
- `apiKey` - Unique API key for authentication
- `apiSecret` - Optional secret for HMAC signing
- `isActive` - Enable/disable key without deletion
- `permissions` - JSON array of allowed operations
- `metadata` - Additional platform data
- `lastUsedAt` - Last authentication timestamp
- `createdAt`, `updatedAt`

#### Partner Payment Transactions Table (`partner_payment_transactions`)
**Purpose:** Track all payments processed via Partner API

Fields:
- `id` - Primary key
- `merchantId` - Links to merchant account
- `platform` - Which platform initiated payment
- `platformOrderId` - Order ID from partner platform (BB/HB)
- `gatewayTransactionId` - NMI transaction ID
- `amount`, `currency`
- `status` - 'success' | 'failed' | 'pending' | 'refunded'
- `paymentMethod`, `cardBrand`, `cardLastFour`
- `customerEmail`, `customerName`
- `billingAddress` - JSON billing details
- `errorMessage`, `gatewayResponse`
- `metadata` - Additional transaction data
- `refundedAmount`, `refundedAt`
- `createdAt`, `updatedAt`

#### Payment Transactions Table Updates
Added fields to existing table:
- `merchantId` - Link to merchant (optional for internal orders)
- `platform` - Platform that initiated transaction

### 2. API Authentication System

**Files:**
- `server/middleware/api-auth.ts` - Authentication middleware

**Features:**
- API key validation via Authorization header or query parameter
- Permission-based access control
- Platform isolation (BB can't access HB data)
- Last-used timestamp tracking
- Secure API key generation (256-bit entropy)
- HMAC signature verification for webhooks (future use)

**Supported Authorization Formats:**
```
Authorization: Bearer sb_live_xxxxxxxxxxxxx
Authorization: ApiKey sb_live_xxxxxxxxxxxxx
Authorization: sb_live_xxxxxxxxxxxxx
?api_key=sb_live_xxxxxxxxxxxxx
```

### 3. Merchant Payment Service

**File:** `server/services/merchant-payment.ts`

**Capabilities:**
- Process payments on behalf of merchants
- Automatic NMI credentials routing
- Card validation
- Refund processing (full & partial)
- Error handling with detailed messages

### 4. Storage Layer Extensions

**File:** `server/storage.ts`

**New Operations:**
- API Key CRUD operations
- Partner payment transaction management
- Query by merchant, platform, gateway ID

## API Endpoints

### Payment Processing

#### POST `/api/v1/payments/process`
**Auth:** Requires API key with `process_payments` permission

Process a payment on behalf of a merchant.

**Headers:**
```
Authorization: Bearer sb_live_your_api_key_here
Content-Type: application/json
```

**Request:**
```json
{
  "merchantId": "merchant-uuid",
  "amount": 99.99,
  "currency": "USD",
  "cardNumber": "4111111111111111",
  "cardName": "John Doe",
  "expiry": "1225",
  "cvv": "123",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "billingAddress": {
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US"
  },
  "platformOrderId": "BB_ORDER_12345",
  "metadata": {
    "productId": "PROD_001",
    "customField": "value"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "transactionId": "txn-uuid",
  "gatewayTransactionId": "nmi-12345",
  "authCode": "ABC123",
  "amount": 99.99,
  "currency": "USD",
  "status": "success",
  "cardBrand": "visa",
  "cardLastFour": "1111",
  "message": "Payment processed successfully",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Payment failed",
  "message": "Card declined"
}
```

#### POST `/api/v1/payments/refund`
**Auth:** Requires API key with `process_refunds` permission

Process a full or partial refund.

**Request:**
```json
{
  "transactionId": "txn-uuid",
  "amount": 50.00,
  "reason": "Customer request"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "txn-uuid",
  "gatewayTransactionId": "nmi-refund-123",
  "refundAmount": 50.00,
  "totalRefunded": 50.00,
  "message": "Refund processed successfully"
}
```

### Transaction Queries

#### GET `/api/v1/payments/merchant/:merchantId`
**Auth:** Requires API key

List all transactions for a specific merchant.

**Response:**
```json
[
  {
    "id": "txn-uuid",
    "merchantId": "merchant-uuid",
    "platform": "businessblueprint",
    "platformOrderId": "BB_ORDER_123",
    "gatewayTransactionId": "nmi-12345",
    "amount": "99.99",
    "currency": "USD",
    "status": "success",
    "cardBrand": "visa",
    "cardLastFour": "1111",
    "customerEmail": "customer@example.com",
    "createdAt": "2025-01-15T10:30:00Z",
    ...
  }
]
```

#### GET `/api/v1/payments/platform/:platform`
**Auth:** Requires API key for that platform

List all transactions for a platform (businessblueprint/hostsblue).

#### GET `/api/v1/payments/:transactionId`
**Auth:** Requires API key

Get specific transaction details.

### API Key Management

#### POST `/api/v1/api-keys/create`
Create a new API key for a platform.

**Request:**
```json
{
  "platform": "businessblueprint",
  "name": "BusinessBlueprint Production",
  "permissions": ["process_payments", "process_refunds"]
}
```

**Response:**
```json
{
  "id": "key-uuid",
  "platform": "businessblueprint",
  "name": "BusinessBlueprint Production",
  "apiKey": "sb_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "apiSecret": "sb_secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "permissions": ["process_payments", "process_refunds"],
  "isActive": true,
  "createdAt": "2025-01-15T10:00:00Z",
  "message": "API key created successfully. Store these credentials securely - they won't be shown again."
}
```

⚠️ **Important:** API keys are only shown once during creation!

#### GET `/api/v1/api-keys`
List all API keys (without exposing the actual keys).

#### DELETE `/api/v1/api-keys/:id`
Deactivate an API key.

## Security Features

### 1. API Key Authentication
- 256-bit cryptographically secure random keys
- Format: `sb_live_` prefix for easy identification
- Stored in database for validation
- Optional HMAC secrets for webhook verification

### 2. Permission System
Built-in permissions:
- `*` - Wildcard (all permissions)
- `process_payments` - Process payment transactions
- `process_refunds` - Issue refunds
- Custom permissions can be added as needed

### 3. Platform Isolation
- BB can only access BB merchants and transactions
- HB can only access HB merchants and transactions
- `internal` platform has full access (for admin)

### 4. Data Sanitization
- Card numbers never returned in responses (only last 4 digits)
- Full card data not stored (processed through NMI)
- Gateway responses logged for dispute resolution

## Environment Variables

Update your `.env` file:

```bash
# Database
DATABASE_URL=postgresql://...

# NMI Partner Credentials (from Phase 1)
NMI_PARTNER_ID=LaskowskiD3124
NMI_MERCHANT_BOARDING_KEY=your_boarding_key_here

# NMI Payment Processing (NEW for Phase 2)
NMI_API_KEY=your_nmi_transaction_api_key_here

# Session
SESSION_SECRET=random_secret_here
```

## Setup & Migration

### 1. Update Environment Variables
```bash
# Add to your .env file
NMI_API_KEY=your_nmi_transaction_api_key_here
```

### 2. Push Database Schema
```bash
npm run db:push
```

This will create:
- `api_keys` table
- `partner_payment_transactions` table
- Add `merchantId` and `platform` fields to existing `payment_transactions` table

### 3. Generate API Keys

Create API keys for each partner platform:

```bash
curl -X POST http://localhost:5000/api/v1/api-keys/create \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "businessblueprint",
    "name": "BusinessBlueprint Production",
    "permissions": ["process_payments", "process_refunds"]
  }'
```

Save the returned `apiKey` - it won't be shown again!

Repeat for HostsBlue:
```bash
curl -X POST http://localhost:5000/api/v1/api-keys/create \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "hostsblue",
    "name": "HostsBlue Production",
    "permissions": ["process_payments", "process_refunds"]
  }'
```

## Integration Guide for BusinessBlueprint/HostsBlue

### Step 1: Store Your API Key
```javascript
// In your platform's environment variables
SWIPESBLUE_API_KEY=sb_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SWIPESBLUE_API_URL=https://swipesblue.com/api/v1
```

### Step 2: Create Client as Merchant (from Phase 1)
```javascript
const merchant = await fetch(`${SWIPESBLUE_API_URL}/merchants/create`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    businessName: client.businessName,
    businessEmail: client.email,
    platform: 'businessblueprint',
    platformClientId: client.id,
    // ... other business details
  })
});

const { merchantId } = await merchant.json();
// Store merchantId in your client record
```

### Step 3: Process Payment for Client
```javascript
async function processClientPayment(clientId, orderDetails) {
  // Get merchant ID for this client
  const client = await getClient(clientId);
  const merchantId = client.swipesBlueMerchantId;

  const response = await fetch(`${SWIPESBLUE_API_URL}/payments/process`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SWIPESBLUE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      merchantId: merchantId,
      amount: orderDetails.total,
      cardNumber: orderDetails.cardNumber,
      cardName: orderDetails.cardName,
      expiry: orderDetails.expiry,
      cvv: orderDetails.cvv,
      customerEmail: orderDetails.customerEmail,
      platformOrderId: orderDetails.orderId, // Your order ID
      metadata: {
        clientId: client.id,
        orderType: orderDetails.type
      }
    })
  });

  const result = await response.json();

  if (result.success) {
    // Payment succeeded
    // Store result.transactionId in your order record
    return {
      success: true,
      transactionId: result.transactionId,
      gatewayTransactionId: result.gatewayTransactionId
    };
  } else {
    // Payment failed
    throw new Error(result.message);
  }
}
```

### Step 4: Process Refund
```javascript
async function refundClientPayment(transactionId, amount = null) {
  const response = await fetch(`${SWIPESBLUE_API_URL}/payments/refund`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SWIPESBLUE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      transactionId: transactionId,
      amount: amount, // Optional - omit for full refund
      reason: 'Customer request'
    })
  });

  return await response.json();
}
```

### Step 5: Query Client Transactions
```javascript
async function getClientTransactions(clientId) {
  const client = await getClient(clientId);
  const merchantId = client.swipesBlueMerchantId;

  const response = await fetch(
    `${SWIPESBLUE_API_URL}/payments/merchant/${merchantId}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.SWIPESBLUE_API_KEY}`
      }
    }
  );

  return await response.json();
}
```

## Error Handling

### Common Error Codes

| Status | Error | Meaning |
|--------|-------|---------|
| 401 | Unauthorized | Missing or invalid API key |
| 403 | Forbidden | API key lacks permission or platform access |
| 404 | Not Found | Merchant or transaction doesn't exist |
| 400 | Payment Failed | Card declined or invalid payment details |
| 409 | Conflict | Duplicate merchant or transaction |
| 500 | Internal Error | Server error - contact support |

### Error Response Format
```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "errors": [] // Validation errors if applicable
}
```

## Testing

### 1. Create Test API Key
```bash
curl -X POST http://localhost:5000/api/v1/api-keys/create \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "internal",
    "name": "Testing Key",
    "permissions": ["*"]
  }'
```

### 2. Create Test Merchant
```bash
curl -X POST http://localhost:5000/api/v1/merchants/create \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Business",
    "businessEmail": "test@example.com",
    "platform": "businessblueprint",
    "platformClientId": "TEST_001",
    "businessCountry": "US"
  }'
```

### 3. Process Test Payment
```bash
curl -X POST http://localhost:5000/api/v1/payments/process \
  -H "Authorization: Bearer sb_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "merchant-uuid-from-step-2",
    "amount": 10.00,
    "currency": "USD",
    "cardNumber": "4111111111111111",
    "cardName": "Test User",
    "expiry": "1225",
    "cvv": "123",
    "customerEmail": "customer@test.com",
    "platformOrderId": "TEST_ORDER_001"
  }'
```

### NMI Test Cards
- **Approved:** 4111111111111111
- **Declined:** 4000000000000002
- **Insufficient Funds:** 4000000000009995

## Revenue Sharing

As an NMI partner (ID: LaskowskiD3124), you automatically earn revenue share on all transactions processed through sub-merchants:

1. **Per-Transaction Fee:** Your partner agreement defines the split
2. **Monthly Residuals:** Based on merchant processing volume
3. **Merchant Ownership:** All sub-merchants created via Phase 1 are linked to your partner ID
4. **Reporting:** Access NMI Partner Portal for revenue reports

## Files Added/Modified

### New Files
- `server/middleware/api-auth.ts` - API authentication middleware
- `server/services/merchant-payment.ts` - Merchant payment service
- `PAYMENT_API_PHASE2.md` - This documentation

### Modified Files
- `shared/schema.ts` - Added `apiKeys` and `partnerPaymentTransactions` tables
- `server/storage.ts` - Added API key and partner payment operations
- `server/routes.ts` - Added payment processing and API key management endpoints
- `.env.example` - Added NMI_API_KEY

## What's Next: Phase 3

Phase 3 will add:
- **Webhooks:** Real-time payment notifications to BB/HB
- **Event System:** payment.success, payment.failed, merchant.approved events
- **HMAC Signatures:** Secure webhook verification
- **Retry Logic:** Automatic webhook delivery retries

## Support & Documentation

- **NMI Transaction API:** https://secure.nmi.com/merchants/resources/integration/integration_portal.html
- **Test Environment:** Use NMI sandbox credentials for testing
- **Security:** Never log or store full card numbers
- **PCI Compliance:** Consider tokenization for production (Phase 4)

---

## Complete API Reference

### Authentication
All Partner API endpoints require authentication via API key:
```
Authorization: Bearer sb_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Endpoints Summary

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/v1/payments/process` | API Key + Permission | Process payment |
| POST | `/api/v1/payments/refund` | API Key + Permission | Refund payment |
| GET | `/api/v1/payments/merchant/:id` | API Key | Get merchant transactions |
| GET | `/api/v1/payments/platform/:platform` | API Key | Get platform transactions |
| GET | `/api/v1/payments/:transactionId` | API Key | Get transaction details |
| POST | `/api/v1/api-keys/create` | Admin | Create API key |
| GET | `/api/v1/api-keys` | Admin | List API keys |
| DELETE | `/api/v1/api-keys/:id` | Admin | Deactivate API key |
| POST | `/api/v1/checkout/sessions` | API Key + Permission | Create checkout session |
| GET | `/api/v1/checkout/sessions/:id` | Public | Get session for payment page |
| POST | `/api/v1/webhooks/stripe` | Signature | Handle payment gateway webhooks |

### Permissions

| Permission | Allows |
|------------|--------|
| `*` | All operations (wildcard) |
| `process_payments` | Process payment transactions, create checkout sessions |
| `process_refunds` | Issue refunds |

---

## Phase 5: Checkout Sessions API

Hosted and embedded checkout for partner platforms (scansblue.com, businessblueprint.io, hostsblue.com).

### How It Works

1. Partner platform calls `POST /api/v1/checkout/sessions` with amount, description, customer email, and redirect URLs
2. SwipesBlue creates a checkout session using its internal payment gateway
3. Returns a checkout URL (hosted redirect) or a SwipesBlue payment page URL (embedded)
4. Customer pays on the checkout page
5. Payment gateway sends webhook to SwipesBlue
6. SwipesBlue records the transaction and forwards confirmation to the partner's `webhookUrl`

### POST `/api/v1/checkout/sessions`

**Auth:** Requires API key with `process_payments` permission

**Headers:**
```
Authorization: Bearer sb_live_your_api_key_here
Content-Type: application/json
```

**Request (Redirect Mode — default):**
```json
{
  "amount": 1000,
  "currency": "usd",
  "description": "Full Website Report — example.com",
  "customerEmail": "customer@email.com",
  "metadata": { "purchaseId": 123, "platform": "scansblue.com" },
  "successUrl": "https://scansblue.com/success?session_id={SESSION_ID}",
  "cancelUrl": "https://scansblue.com/purchase?canceled=true",
  "webhookUrl": "https://scansblue.com/api/payment-webhook"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid-session-id",
  "url": "https://checkout.example.com/pay/..."
}
```

**Request (Embedded Mode):**
```json
{
  "mode": "embedded",
  "amount": 1000,
  "currency": "usd",
  "description": "Full Website Report",
  "customerEmail": "customer@email.com",
  "metadata": {},
  "successUrl": "https://scansblue.com/success?session_id={SESSION_ID}",
  "cancelUrl": "https://scansblue.com/purchase?canceled=true",
  "webhookUrl": "https://scansblue.com/api/payment-webhook"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid-session-id",
  "url": "https://swipesblue.com/pay/uuid-session-id",
  "mode": "embedded"
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mode` | string | No | `"redirect"` (default) or `"embedded"` |
| `amount` | integer | Yes | Amount in cents (e.g., 1000 = $10.00) |
| `currency` | string | Yes | Currency code (e.g., `"usd"`) |
| `description` | string | Yes | Description shown to customer |
| `customerEmail` | string | Yes | Customer's email address |
| `metadata` | object | No | Arbitrary key-value data returned in webhooks |
| `successUrl` | string | Yes | Redirect URL after successful payment. Use `{SESSION_ID}` placeholder. |
| `cancelUrl` | string | Yes | Redirect URL if customer cancels |
| `webhookUrl` | string | No | URL to receive payment confirmation webhook |

### Webhook Confirmation

After successful payment, SwipesBlue POSTs to the partner's `webhookUrl`:

```json
{
  "event": "payment.completed",
  "sessionId": "uuid-session-id",
  "amount": 1000,
  "currency": "usd",
  "customerEmail": "customer@email.com",
  "metadata": { "purchaseId": 123, "platform": "scansblue.com" },
  "paidAt": "2026-03-31T12:00:00Z"
}
```

No internal gateway details are ever exposed in webhook payloads.

### Embedded Checkout (iframe)

For embedded mode, the partner can load the payment page in an iframe:

```html
<iframe src="https://swipesblue.com/pay/uuid-session-id"
        width="100%" height="600" frameborder="0"></iframe>
```

The embedded page:
- Shows amount, description, and a card input form
- Styled with SwipesBlue branding
- On successful payment, sends `window.parent.postMessage({ event: 'payment.completed', sessionId: '...' }, '*')` for iframe detection
- Redirects to the partner's `successUrl` after payment

### Environment Variables

Add these to SwipesBlue's environment (never shared with partner platforms):

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Integration Example (scansblue.com)

```javascript
// Server-side: create checkout session
const response = await fetch('https://swipesblue.com/api/v1/checkout/sessions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.SWIPESBLUE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: 4900,
    currency: 'usd',
    description: 'Full Website Report — example.com',
    customerEmail: 'customer@email.com',
    metadata: { purchaseId: 123, platform: 'scansblue.com' },
    successUrl: 'https://scansblue.com/success?session_id={SESSION_ID}',
    cancelUrl: 'https://scansblue.com/purchase?canceled=true',
    webhookUrl: 'https://scansblue.com/api/payment-webhook',
  }),
});

const { id, url } = await response.json();
// Redirect customer to `url` to pay
```

### Error Handling

| Status | Error | Meaning |
|--------|-------|---------|
| 400 | Invalid request | Missing or invalid fields |
| 401 | Unauthorized | Missing or invalid API key |
| 403 | Forbidden | API key lacks `process_payments` permission |
| 502 | Payment service unavailable | Internal gateway error |

---

SwipesBlue now supports full checkout session management with both hosted redirect and embedded iframe payment flows.
