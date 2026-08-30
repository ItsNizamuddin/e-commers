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

## 3. Role-Based Access Control (RBAC)

ShopSphere enforces strict authorization boundaries across two primary roles: `CUSTOMER` and `ADMIN`.

### 3.1 Permission Matrix

| Resource / Endpoint Area | Public | Customer | Admin |
| :--- | :---: | :---: | :---: |
| Browse Products / Categories / Search | ✅ | ✅ | ✅ |
| Read Product Reviews | ✅ | ✅ | ✅ |
| Manage Personal Cart / Wishlist / Profile | ❌ | ✅ | ✅ |
| Checkout & Order Placement | ❌ | ✅ | ❌ |
| Submit Review | ❌ | Verified Buyer | ❌ |
| Create / Update / Delete Products | ❌ | ❌ | ✅ |
| Adjust Inventory Stock | ❌ | ❌ | ✅ |
| View Executive Dashboard & Sales Analytics | ❌ | ❌ | ✅ |
| Update Order Status (`SHIPPED`/`DELIVERED`) | ❌ | ❌ | ✅ |

### 3.2 Authorization Middleware Implementation

```typescript
import { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyJwt(token);
    req.user = payload; // Attach { userId, role }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token expired or invalid' } });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } });
  }
  next();
};
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
