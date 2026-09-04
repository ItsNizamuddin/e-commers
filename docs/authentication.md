# ShopSphere — Authentication & Security Architecture

This document specifies the authentication protocol, authorization models, password security standards, and security controls for **ShopSphere**.

---

## 1. Authentication Strategy

ShopSphere utilizes a dual-token **JWT Access Token + Refresh Token** authentication pattern stored in `HttpOnly`, `SameSite=Strict` cookies or standard Bearer authorization headers.

```
CLIENT (Browser/Mobile)                 EXPRESS API SERVER                  MONGODB DATABASE
        │                                       │                                  │
        │ 1. POST /api/v1/auth/login            │                                  │
        ├──────────────────────────────────────►│                                  │
        │                                       │ 2. Find User by Email            │
        │                                       ├─────────────────────────────────►│
        │                                       │◄─────────────────────────────────┤
        │                                       │ 3. Verify Password Hash (Argon2) │
        │                                       │ 4. Generate Access & Refresh JWT │
        │                                       │ 5. Save Refresh Token Hash       │
        │                                       ├─────────────────────────────────►│
        │ 6. Return Access Token in Body        │                                  │
        │    & Set Refresh Cookie (HttpOnly)    │                                  │
        │◄──────────────────────────────────────┤                                  │
        │                                       │                                  │
        │ 7. Subsequent Request                 │                                  │
        │    Header: Authorization Bearer <JWT> │                                  │
        ├──────────────────────────────────────►│                                  │
        │                                       │ 8. Verify JWT Signature (Local)  │
        │◄──────────────────────────────────────┤                                  │
        │ 9. Authorized API Response            │                                  │
```

### 1.1 Token Configuration

| Token Type | Storage Location | Lifetime | Purpose |
| :--- | :--- | :--- | :--- |
| **Access Token** | Memory / Authorization Header | 15 Minutes | Short-lived stateless access token for API requests |
| **Refresh Token** | `HttpOnly`, `Secure` Cookie | 7 Days | Long-lived token used exclusively to fetch new access tokens |

### 1.2 Cookie Security Directive
```typescript
res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Days
});
```

---

## 2. Password Security & Storage

ShopSphere strictly mandates secure password handling to protect user credentials:

1. **Hashing Algorithm**: Argon2id (or bcrypt with salt round cost factor $\ge 12$).
2. **Pepper / Salt**: Unique random salt per password automatically handled by the hashing library.
3. **No Plaintext Logging**: Password strings are stripped from request loggers via Pino redactions (`req.body.password`).
4. **Password Policy Enforcements**:
   - Minimum length: 8 characters
   - Must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.

---

## 3. Role-Based Access Control (RBAC) & Fine-Grained Authorization

ShopSphere enforces multi-tier enterprise authorization boundaries across 6 distinct user roles:

1. **`SUPER_ADMIN`**: Unrestricted executive access (system management, role administration, security, full catalog & order controls).
2. **`ADMIN`**: General operational administrator (catalog management, sales operations, customer accounts, analytics).
3. **`SALES`**: Sales & fulfillment manager (order management, customer search, sales reports).
4. **`PUBLISHER`**: Content & product catalog manager (product creation, editing, category tree updates, publishing).
5. **`SUPPORT_AGENT`**: Customer service representative (read-only view of customer profiles and order statuses for support ticket resolution).
6. **`CUSTOMER`**: Standard end-user consumer account.

### 3.1 Enterprise Permission Matrix

| Resource / Endpoint Area | Customer | Support Agent | Publisher | Sales | Admin | Super Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Browse Products / Categories | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Personal Cart / Wishlist / Profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View Customer Orders | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| Manage Order Fulfillment & Refunds | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create / Edit / Publish Catalog | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| View Executive Sales Analytics | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Manage User Roles & System Configs | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### 3.2 Authorization Middleware Implementation

```typescript
import { requireRole, requirePermission, requireStaff } from './middleware/authorize.middleware.js';

// Guard for any staff member (SUPER_ADMIN, ADMIN, SALES, PUBLISHER, SUPPORT_AGENT)
router.get('/admin/test', requireAuth, requireStaff(), handler);

// Guard for specific granular permission ('orders:read')
router.get('/admin/sales', requireAuth, requirePermission('orders:read'), handler);

// Guard for specific role ('SUPER_ADMIN')
router.get('/admin/super', requireAuth, requireRole('SUPER_ADMIN'), handler);
```

---

## 4. Hardened Security Controls

### 4.1 Input Validation Pipeline (Zod)
Every HTTP request body is validated against explicit Zod schemas before hitting domain service controllers.

```typescript
import { z } from 'zod';

export const RegisterUserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and a number'
  })
});
```

### 4.2 Rate Limiting Policy
Rate limits prevent brute-force attacks and denial-of-service attempts:

- **Auth Endpoints (`/api/v1/auth/*`)**: Max 5 requests per minute per IP.
- **Checkout Initiate (`/api/v1/checkout/initiate`)**: Max 10 requests per 15 minutes per User ID.
- **General API Routes**: Max 100 requests per minute per IP.

### 4.3 CORS & Security Headers
- **CORS Allowlist**: Configured strictly to allow requests only from trusted domains (e.g., `https://shopsphere.com`).
- **Helmet Security Headers**:
  - `Strict-Transport-Security` (HSTS)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Content-Security-Policy` (CSP)

### 4.4 Secrets Management
- Application secrets (`JWT_SECRET`, `STRIPE_SECRET_KEY`, `MONGODB_URI`) are injected exclusively via environment variables (`process.env`).
- Commit hooks block any accidental push of `.env` files to git repositories.
