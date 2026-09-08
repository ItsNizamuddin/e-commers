# Ecommers — Authentication & Security Architecture

This document specifies the authentication protocol, authorization models, password security standards, and security controls for **Ecommers**.

---

## 1. Authentication Strategy

Ecommers utilizes a dual-token **JWT Access Token + Refresh Token** authentication pattern stored in `HttpOnly`, `SameSite=Strict` cookies or standard Bearer authorization headers.

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

| Token Type | Storage Location | Lifetime | Scope / Path | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Access Token** | Memory (JS Closure) / Bearer Header | 15 Minutes | Global (API Client) | Short-lived stateless access token for API requests. Never persisted to disk. |
| **Customer Refresh** | `HttpOnly`, `Secure` Cookie (`customerRefreshToken`) | 7 Days | `/api/v1/auth` | Long-lived token used to refresh storefront customer sessions. |
| **Staff Refresh** | `HttpOnly`, `Secure` Cookie (`staffRefreshToken`) | 7 Days | `/api/v1/auth/admin` | Long-lived token isolated strictly to staff/admin rehydration. |

### 1.2 Cookie Security Directive
```typescript
// Staff cookie directive (Scoped strictly to admin auth endpoints)
res.cookie('staffRefreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  path: '/api/v1/auth/admin',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Days
});
```

---

## 2. Password Security & Storage

Ecommers strictly mandates secure password handling to protect user credentials:

1. **Hashing Algorithm**: Argon2id (or bcrypt with salt round cost factor $\ge 12$).
2. **Pepper / Salt**: Unique random salt per password automatically handled by the hashing library.
3. **No Plaintext Logging**: Password strings are stripped from request loggers via Pino redactions (`req.body.password`).
4. **Password Policy Enforcements**:
   - Minimum length: 8 characters
   - Must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.

---

## 3. Role-Based Access Control (RBAC) & Fine-Grained Authorization

Ecommers enforces multi-tier enterprise authorization boundaries across 6 distinct user roles:

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
- **CORS Allowlist**: Configured strictly to allow requests only from trusted domains (e.g., `https://ecommers.com`).
- **Helmet Security Headers**:
  - `Strict-Transport-Security` (HSTS)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Content-Security-Policy` (CSP)

### 4.4 Secrets Management
- Application secrets (`JWT_SECRET`, `STRIPE_SECRET_KEY`, `MONGODB_URI`) are injected exclusively via environment variables (`process.env`).
- Commit hooks block any accidental push of `.env` files to git repositories.

---

## 5. Client-Side Authentication Architecture & Security Boundaries

The frontend Admin application operates on a strict three-tier storage model to defend against Cross-Site Scripting (XSS) and token theft:

```
Browser Client
├── HttpOnly Cookie (Inaccessible to JS)
│   └── staffRefreshToken (Path: /api/v1/auth/admin)
│
├── In-Memory JavaScript Closure (Ephemeral RAM)
│   └── inMemoryAccessToken (API Client Bearer Header)
│
└── Redux Toolkit State (UI Convenience Only)
    └── authSlice (user profile, role, permissions, isHydrated)
```

### 5.1 Three Core Security Boundaries

#### Boundary 1: `admin_session_active` is a Navigation Hint, Never Authoritative
- `admin_session_active=1` is a client-readable cookie (`document.cookie`) used exclusively by Next.js Edge Middleware (`middleware.ts`) to avoid UI redirection flicker.
- **Security Rule**: This cookie represents: *"There might be an active admin session."* It **never** guarantees authentication. Real authority remains downstream with Express verifying cryptographic tokens.

#### Boundary 2: Narrow Cookie Path (`Path=/api/v1/auth/admin`)
- The `staffRefreshToken` is scoped strictly to `/api/v1/auth/admin`.
- Because of this narrow boundary, Next.js page requests (e.g. `localhost:3001/dashboard`) never receive this cookie.
- Rehydration must therefore happen explicitly via the client-side `<SessionHydrator>` component dispatching `POST /api/v1/auth/admin/refresh`.

#### Boundary 3: Redux Permissions are Presentational, Never Authoritative
- Redux stores `state.auth.permissions` and `state.auth.role` solely to render or hide UI elements (e.g., sidebar links, action buttons).
- The frontend permissions list is never treated as a security boundary. All mutations and sensitive read queries are authenticated and authorized on the Express server (`requireRole`, `requirePermission`).

### 5.2 Production Auth Lifecycle

1. **Admin Login**:
   - Admin submits credentials via `POST /api/v1/auth/admin/login`.
   - Express validates credentials, issues `staffRefreshToken` via `HttpOnly` cookie (`Path=/api/v1/auth/admin`), and returns `accessToken` + `user` in the JSON response body.
   - Client sets `admin_session_active=1` (navigation hint), stores `accessToken` in a JavaScript memory closure, and dispatches `user`, `role`, and `permissions` into the Redux store.

2. **Normal API Requests**:
   - Client passes `accessToken` in the `Authorization: Bearer <token>` header.
   - Express authenticates the JWT signature and enforces RBAC permissions per route.

3. **Page Refresh / Session Rehydration (F5)**:
   - On hard refresh, the in-memory access token and Redux state are purged.
   - Next.js Edge Middleware allows route entry optimistically via `admin_session_active`.
   - `<SessionHydrator>` executes `POST /api/v1/auth/admin/refresh` (browser automatically transmits the `staffRefreshToken` cookie).
   - Express validates the session hash in MongoDB and returns a fresh access token and user profile.
   - If invalid/expired, `SessionHydrator` clears `admin_session_active`, purges Redux, and redirects to `/login`.

