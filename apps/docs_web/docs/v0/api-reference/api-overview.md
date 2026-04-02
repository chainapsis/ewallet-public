---
title: API Reference
sidebar_position: 1
---

# API Overview

These APIs allow your dApp to check user existence and handle sign-in with Oko.

## Service Endpoints

The Oko system provides REST APIs for authentication, key management,
and transaction signing:

| Service         | Port | Purpose                                                          |
| --------------- | ---- | ---------------------------------------------------------------- |
| Main API Server | 4200 | TSS operations, admin functions, customer dashboard, and logging |
| Key Share Node  | 4201 | Secure key share storage and retrieval                           |

### `POST /tss/v1/user/signin`

Sign in a user via a supported social login provider. This endpoint will return an authentication
token and related metadata on success.

#### Request

- **Method**: `POST`
- **Path**: `/tss/v1/user/signin`
- **Headers**: `Authorization: Bearer <ID Token>` (The token should be
  issued by the chosen auth provider: Google, email, GitHub, X, Discord, or Telegram)

#### Response

**200 OK**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "email": "user@example.com",
      "wallet_id": "...",
      "public_key": "..."
    }
  }
}
```

**401 Unauthorized**

```json
{
  "success": false,
  "code": "UNAUTHORIZED",
  "msg": "Unauthorized"
}
```

**404 User or Wallet Not Found**

```json
{
  "success": false,
  "code": "USER_NOT_FOUND",
  "msg": "User not found"
}
```

```json
{
  "success": false,
  "code": "WALLET_NOT_FOUND",
  "msg": "Wallet not found"
}
```

**500 Internal Server Error**

```json
{
  "success": false,
  "code": "UNKNOWN_ERROR",
  "msg": "Something went wrong"
}
```

### `POST /tss/v1/user/check`

Check whether a user account exists for a given email address.

#### Request

- **Method**: `POST`
- **Path**: `/tss/v1/user/check`
- **Body**:

```json
{
  "email": "user@example.com"
}
```

#### Response

**200 OK** (User exists)

```json
{
  "success": true,
  "data": {
    "exists": true,
    "keyshare_node_meta": {
      "threshold": 2,
      "nodes": [
        {
          "name": "ks_node_1",
          "endpoint": "http://localhost:4201",
          "wallet_status": "ACTIVE"
        },
        {
          "name": "ks_node_2",
          "endpoint": "http://localhost:4202",
          "wallet_status": "ACTIVE"
        }
      ]
    },
    "needs_reshare": false,
    "active_nodes_below_threshold": false
  }
}
```

**200 OK** (User exists, needs reshare)

```json
{
  "success": true,
  "data": {
    "exists": true,
    "keyshare_node_meta": {
      "threshold": 2,
      "nodes": [
        {
          "name": "ks_node_1",
          "endpoint": "http://localhost:4201",
          "wallet_status": "UNRECOVERABLE_DATA_LOSS"
        },
        {
          "name": "ks_node_2",
          "endpoint": "http://localhost:4202",
          "wallet_status": "ACTIVE"
        }
      ]
    },
    "needs_reshare": true,
    "reshare_reasons": ["UNRECOVERABLE_NODE_DATA_LOSS"],
    "active_nodes_below_threshold": false
  }
}
```

**200 OK** (User does not exist - signup flow)

```json
{
  "success": true,
  "data": {
    "exists": false,
    "keyshare_node_meta": {
      "threshold": 2,
      "nodes": [
        {
          "name": "ks_node_1",
          "endpoint": "http://localhost:4201",
          "wallet_status": "NOT_REGISTERED"
        },
        {
          "name": "ks_node_2",
          "endpoint": "http://localhost:4202",
          "wallet_status": "NOT_REGISTERED"
        }
      ]
    },
    "needs_reshare": false,
    "active_nodes_below_threshold": false
  }
}
```

**400 Bad Request (missing email address)**

```json
{
  "success": false,
  "code": "INVALID_REQUEST",
  "msg": "email is required"
}
```

**500 Internal Server Error**

```json
{
  "success": false,
  "code": "UNKNOWN_ERROR",
  "msg": "Failed to get user"
}
```

### `POST /tss/v1/user/reshare`

Update wallet key share nodes for resharing after unrecoverable data loss.

#### Request

- **Method**: `POST`
- **Path**: `/tss/v1/user/reshare`
- **Headers**: `Authorization: Bearer <ID Token>`
- **Body**:

```json
{
  "public_key": "...",
  "reshared_key_shares": [...]
}
```

#### Response

**200 OK**

```json
{
  "success": true,
  "data": null
}
```

**400 Bad Request**

```json
{
  "success": false,
  "code": "INVALID_REQUEST",
  "msg": "Invalid public key" | "reshared_key_shares is required"
}
```

## Examples

Examples of signing transactions:

### Signing Transactions

**Cosmos**

- cosmos_signAmino
- cosmos_signDirect
- cosmos_signArbitrary
- secp256k1_sign

**Ethereum**

- eth_sendTransaction
- personal_sign
- eth_signTransaction
- eth_signTypedData_v4
- secp256k1_sign

**SVM (Solana, etc.)**

- signTransaction
- signAllTransactions
- signMessage
- sendTransaction
- signAndSendTransaction
- signAndSendAllTransactions

## Authentication

### Social Login Flow

From `backend/tss_api/src/routes/user.ts`:

**Sign-in endpoint:**

```
POST /tss/v1/user/signin
- Initiates social login authentication
- Returns JWT token and user information for subsequent API calls
- Requires ID token from the chosen auth provider in Authorization header
```

**User verification:**

```
POST /tss/v1/user/check
- Checks if email exists in system
- Used for user registration flow
- Requires email in request body
```

**Silent sign-in:**

```
POST /tss/v1/user/signin_silently
- Validates existing JWT token or refreshes expired token
- Used for token renewal without re-authentication
```

**Reshare:**

```
POST /tss/v1/user/reshare
- Updates wallet key share nodes after unrecoverable data loss
- Requires auth provider ID token and reshared key shares
```

### JWT Token Usage

Based on middleware implementation:

```
Authorization: Bearer <jwt_token>
```

Token configuration from `backend/oko_api/server/src/envs.ts`:

- Default expiration: "1H"
- Configurable via `JWT_EXPIRES_IN` environment variable

## TSS API Endpoints

### Base Path: `/tss/v1`

From `backend/tss_api/src/routes/`:

#### Key Generation

```
POST /tss/v1/keygen
Content-Type: application/json
Headers: Authorization: Bearer <ID Token>

Purpose: Create distributed key shares and wallet entities
Implementation: Coordinates threshold key generation protocol
Database: Creates entries in wallets table and key_shares table
```

#### Triple Generation (Preprocessing)

```
POST /tss/v1/triples
Content-Type: application/json
Headers: Authorization: Bearer <JWT Token>

Purpose: Generate Beaver triples for efficient signature preprocessing
Implementation: Creates reusable cryptographic material
Benefits: Reduces signature latency by preprocessing before message known
```

#### Presignature Creation

```
POST /tss/v1/presign
Content-Type: application/json
Headers: Authorization: Bearer <JWT Token>

Purpose: Create presignature components using preprocessed triples
Implementation: Combines triples with key shares for signature preparation
Database: Operations tracked in tss_sessions and tss_stages tables
```

#### Signature Completion

```
POST /tss/v1/sign
Content-Type: application/json
Headers: Authorization: Bearer <JWT Token>

Purpose: Complete ECDSA/EdDSA signature using presignatures and message
Implementation: Final signature creation step
Output: Standard ECDSA signature (r, s) or EdDSA signature format
```

#### Session Management

```
POST /tss/v1/session/abort
Content-Type: application/json
Headers: Authorization: Bearer <JWT Token>

Purpose: Abort an active TSS session
Implementation: Cancels ongoing TSS operation and cleans up resources
```

## Admin API Endpoints

### Base Path: `/oko_admin/v1`

From `backend/admin_api/src/routes/`:

#### Customer Management

```
POST /oko_admin/v1/customer/create_customer
Content-Type: multipart/form-data
Headers: Authorization: Bearer <Admin JWT Token>

Purpose: Create new customer organization with dashboard user
Database: Creates entries in customers and customer_dashboard_users tables
Authentication: Admin-level access required
Request: Includes email, password, label, and optional logo file
Response: Returns customer_id and customer details
```

```
GET /oko_admin/v1/customer/get_customer_list
Headers: Authorization: Bearer <Admin JWT Token>
Query Parameters: limit (optional), offset (optional)

Purpose: Retrieve all customer organizations with pagination
Response: List of customer entities with metadata (customer information and API keys)
Authentication: Admin-level access required
```

```
GET /oko_admin/v1/customer/get_customer/{customer_id}
Path Parameter: customer_id
Headers: Authorization: Bearer <Admin JWT Token>

Purpose: Get specific customer details by ID
Response: Customer entity with associated user accounts
Authentication: Admin-level access required
```

```
POST /oko_admin/v1/customer/delete_customer
Content-Type: application/json
Headers: Authorization: Bearer <Admin JWT Token>
Body: { "customer_id": "..." }

Purpose: Delete specific customer and related customer dashboard users
Response: Customer ids with associated user ids
Authentication: Admin-level access required
```

#### User Management

```
POST /oko_admin/v1/user/login
Content-Type: application/json
Body: { "email": "...", "password": "..." }

Purpose: Authenticate admin user
Response: Returns JWT token and admin information
Authentication: None required (public endpoint)
```

```
POST /oko_admin/v1/user/logout
Headers: Authorization: Bearer <Admin JWT Token>

Purpose: Log out admin user
Response: Success message
Authentication: Admin-level access required
```

#### Wallet Management

```
POST /oko_admin/v1/wallet/get_wallet_list
Content-Type: application/json (optional)
Headers: Authorization: Bearer <Admin JWT Token>
Body: { "limit": number, "offset": number } (optional)

Purpose: Retrieve list of wallets with pagination
Response: List of wallet entities
Authentication: Admin-level access required
```

#### TSS Session Management

```
POST /oko_admin/v1/tss/get_tss_session_list
Content-Type: application/json
Headers: Authorization: Bearer <Admin JWT Token>
Body: { "limit": number, "cursor": string } (optional)

Purpose: Retrieve TSS sessions with pagination
Response: List of TSS session entities
Authentication: Admin-level access required
```

#### Key Share Node Management

```
POST /oko_admin/v1/ks_node/get_all_ks_nodes
Content-Type: application/json
Headers: Authorization: Bearer <Admin JWT Token>

Purpose: Retrieve all key share nodes
Response: List of key share node entities
Authentication: Admin-level access required
```

Additional admin endpoints available for:

- Key share node creation, update, activation, and deletion
- TSS activation settings management

## Customer Dashboard API

### Base Path: `/customer_dashboard/v1`

From `backend/ct_dashboard_api/src/routes/`:

#### Customer Authentication

```
POST /customer_dashboard/v1/customer/auth/signin
Content-Type: application/json
Body: { "email": "...", "password": "..." }

Purpose: Authenticate customer dashboard user
Response: Returns JWT token and customer information
Authentication: None required (public endpoint)
```

```
POST /customer_dashboard/v1/customer/auth/signup
Content-Type: application/json
Body: { "email": "...", "password": "...", "customer_id": "..." }

Purpose: Register new customer dashboard user
Response: Returns success status
Authentication: None required (public endpoint)
```

Additional authentication endpoints available for:

- Email verification
- Password reset
- Token refresh

#### Customer Information

```
POST /customer_dashboard/v1/customer/info
Headers: Authorization: Bearer <Customer JWT Token>

Purpose: Get customer information for authenticated user
Response: Customer entity with metadata
Authentication: Customer JWT token required
```

```
POST /customer_dashboard/v1/customer/api_keys
Headers: Authorization: Bearer <Customer JWT Token>
Body: { "limit": number, "offset": number } (optional)

Purpose: Retrieve API keys for customer
Response: List of API key entities
Authentication: Customer JWT token required
```

## Key Share Node API

### Base Path: `/keyshare/v1` and `/commit/v1`

From `key_share_node/server/src/routes/`:

#### Key Share Operations

```
POST /keyshare/v1/register
Content-Type: application/json

Purpose: Store encrypted key shares in secure vault
Implementation: Encrypted storage with access control
Database: key_shares table in credential vault database
```

```
POST /keyshare/v1/keyshare
Content-Type: application/json

Purpose: Retrieve key shares by public key
Implementation: Secure retrieval with authentication
Access Control: Based on user session and committee membership
```

#### Commitment Operations

```
POST /commit/v1/id-token
Content-Type: application/json

Purpose: Commit ID tokens with user session keys
Implementation: Links OAuth tokens with cryptographic sessions
Database: witnessed_id_tokens table
```

## Database Integration

### Session Tracking

Based on schema in `backend/oko_pg_interface/scripts/migrate/migrate.sql`:

**TSS Sessions:**

- All TSS operations create entries in `tss_sessions` table
- Session state stored as JSONB for flexibility
- Individual stages tracked in `tss_stages` table

### Error Handling

**Standard Error Response Format:**

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "msg": "Error message"
}
```

**Success Response Format:**

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

Common HTTP status codes:

- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - Insufficient permissions
- `400 Bad Request` - Invalid request parameters
- `500 Internal Server Error` - Server-side errors

## Configuration

### Required Environment Variables

From `backend/oko_api/server/src/envs.ts`:

**JWT Configuration:**

```bash
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="1H"  # Default token expiration
```

**Email Configuration (SMTP_PORT must be 587):**

```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FROM_EMAIL="your-email@gmail.com"
```

**Email Verification:**

```bash
EMAIL_VERIFICATION_EXPIRATION_MINUTES="5"
```

### Input Validation

Based on Express.js configuration:

- Zod schema validation for request parameters
- JSON body parsing with 10MB limit
- CORS middleware for cross-origin requests
- Helmet middleware for security headers

## Development Tools

### API Documentation

Express.js services include Swagger/OpenAPI documentation:

- Main API: `http://localhost:4200/docs`
- Credential Vault: `http://localhost:4201/docs`

### Testing Endpoints

Example API testing commands:

```bash
# Test TSS authentication
curl -X POST http://localhost:4200/tss/v1/user/signin \
  -H "Authorization: Bearer <id-token>"

# Test email check
curl -X POST http://localhost:4200/tss/v1/user/check \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Test key generation (requires ID token from auth provider)
curl -X POST http://localhost:4200/tss/v1/keygen \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <id-token>" \
  -d '{...}'
```

### Monitoring and Health Checks

API services provide standard monitoring endpoints:

- Health checks for service availability
- Metrics collection for performance monitoring
- Database connection status verification

## SDK Integration

### Core SDK Usage

From `sdk/oko_sdk_core/src/static/init.ts`:

```typescript
import { OkoWallet } from "@oko-wallet/oko-sdk-core";

// Initialize with API configuration
const walletRes = OkoWallet.init({
  api_key: "your-api-key",
  // Additional configuration options
});

if (!walletRes.success) {
  throw new Error("Failed to initialize Oko Wallet");
}

const wallet = walletRes.data;
```

### Blockchain-Specific SDKs

**Cosmos Integration:**

- OkoCosmosWallet class wraps TSS API calls
- Methods: `getAccounts()`, `signAmino()`, `signDirect()`
- Chain registry integration for multi-chain support

**Ethereum Integration:**

- EIP-1193 provider implementation
- Viem integration for transaction handling
- Standard Ethereum RPC method support

**SVM Integration:**

- OkoSvmWallet class wraps TSS API calls with EdDSA (FROST)
- Methods: `connect()`, `signTransaction()`, `sendTransaction()`, `signMessage()`
- Solana Wallet Standard support for dApp compatibility

This API architecture provides a comprehensive interface for threshold signature
wallet operations, with clear separation between TSS protocols, administrative
functions, and secure key storage.
