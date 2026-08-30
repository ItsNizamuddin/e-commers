# ShopSphere — System Design Document

This document outlines the system design and architecture for **ShopSphere**, an enterprise-grade e-commerce platform.

---

## 1. Target System Architecture

ShopSphere adopts a decoupled architecture separating the presentation layer from backend business services and persistent storage:

```
                         ┌─────────────────┐
                         │      USERS      │
                         └────────┬────────┘
                                  │
                              HTTPS (CDN)
                                  │
                                  ▼
                     ┌──────────────────────┐
                     │      Next.js         │
                     │    Web Application   │
                     │                      │
                     │ Customer + Admin     │
                     └──────────┬───────────┘
                                │
                                │ REST API (JSON)
                                ▼
                     ┌──────────────────────┐
                     │    API SERVER        │
                     │ Node.js + Express     │
                     │                      │
                     │ Auth       Products  │
                     │ Cart       Orders    │
                     │ Payments   Inventory │
                     └──────────┬───────────┘
                                │
                ┌───────────────┼────────────────┐
                │               │                │
                ▼               ▼                ▼
          ┌──────────┐    ┌───────────┐    ┌────────────┐
          │ MongoDB  │    │  Payment  │    │  Storage   │
          │ Database │    │ Provider  │    │ S3/Images  │
          └──────────┘    └───────────┘    └────────────┘
```

---

## 2. Architectural Choice: Modular Monolith

ShopSphere is intentionally built as a **Modular Monolith** rather than microservices.

### 2.1 Monolith Structure

All domain modules reside within a single Node.js / Express application, organized with clean domain boundaries:

```
                      EXPRESS API MONOLITH
                               │
       ┌──────────────┬────────┼──────────────┬──────────────┐
       │              │        │              │              │
       ▼              ▼        ▼              ▼              ▼
     AUTH          USERS    PRODUCTS      INVENTORY        ORDERS      PAYMENTS
       │              │        │              │              │            │
       ▼              ▼        ▼              ▼              ▼            ▼
   Repositories & Models (MongoDB Shared Instance with Isolated Collections)
```

### 2.2 Microservices vs. Modular Monolith Trade-Off Analysis

| Architectural Dimension | Microservices | Modular Monolith (ShopSphere) |
| :--- | :--- | :--- |
| **Service Discovery** | Requires Consul / Eureka / K8s DNS | Standard in-process function calls |
| **Network Latency** | High (RPC/HTTP call per boundary) | Low (Zero network overhead between modules) |
| **Data Consistency** | Saga Pattern / Two-Phase Commit | ACID transactions in single database |
| **Operational Complexity** | High (Multiple pipelines, K8s clusters) | Low (Single deployment target) |
| **Distributed Tracing** | Requires OpenTelemetry / Jaeger | Single request ID correlation log |
| **Developer Overhead** | Very High (Contract management per service) | Low (Shared TypeScript domain interfaces) |

> **Design Decision**: At initial phase, microservices add unnecessary operational tax without business benefit. ShopSphere enforces strict module isolation at the code level, enabling future extraction of modules (e.g., `Payments` or `Inventory`) into independent microservices if traffic demands it.

---

## 3. Layered Request Architecture

Every incoming HTTP request traverses a standardized 4-layer pipeline ensuring separation of concerns:

```
                    HTTP REQUEST
                         │
                         ▼
                     Middleware
                         │
                ┌────────┴────────┐
                │                 │
           Authentication      Validation
                │                 │
                └────────┬────────┘
                         ▼
                     Controller
                         │
                         ▼
                      Service
                         │
                         ▼
                    Repository
                         │
                         ▼
                      MongoDB
```

### 3.1 Layer Responsibilities

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. MIDDLEWARE LAYER                                                    │
│    - Authenticates JWT / Cookies & attaches user context to Request    │
│    - Validates request body & query params against Zod schemas        │
│    - Enforces rate limits & CORS origin permissions                    │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. CONTROLLER LAYER                                                    │
│    - Handles HTTP concerns: request extraction, status code selection  │
│    - Invokes domain service methods                                    │
│    - Formats standard HTTP response envelope                           │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. SERVICE LAYER (Business Logic)                                      │
│    - Implements core domain logic, calculation rules, & state transitions│
│    - Manages multi-repository transactions                             │
│    - Triggers domain events (e.g., Send Order Confirmation Email)      │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. REPOSITORY LAYER (Data Access)                                      │
│    - Encapsulates database queries (Mongoose / MongoDB driver)         │
│    - Performs atomic updates, projections, and index hints             │
│    - Maps raw database documents to domain entities                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Critical E-Commerce System Design Problems

### 4.1 Inventory Overselling & Race Condition Resolution

#### The Problem Scenario
Assume product `iPhone 15` has `stock = 1`. User A and User B click **BUY** simultaneously.

```
Without Race Condition Protection:

  User A ───► Read Stock (1) ────► Stock > 0 (OK) ────► Update Stock (1 - 1 = 0) ──► Purchase Success
                                                                                          │
  User B ───► Read Stock (1) ────► Stock > 0 (OK) ────► Update Stock (1 - 1 = 0) ──► Purchase Success
                                                                                          │
                                                                                Result: Stock = -1 ❌ (Oversold!)
```

#### The Solution: Atomic Conditional Updates
ShopSphere prevents overselling using **atomic database conditional updates** directly in MongoDB. We never check stock in application memory and update later.

```sql
UPDATE inventory 
SET stock = stock - quantity 
WHERE sku = 'IPHONE15' AND stock >= quantity
```

In MongoDB / Mongoose:
```typescript
const updatedInventory = await InventoryModel.findOneAndUpdate(
  {
    sku: item.sku,
    stock: { $gte: item.quantity } // Guard: Ensure stock is sufficient AT QUERY TIME
  },
  {
    $inc: { stock: -item.quantity }, // Atomic decrement
    $set: { updatedAt: new Date() }
  },
  { new: true, session }
);

if (!updatedInventory) {
  throw new InsufficientStockError(`Stock depleted for SKU: ${item.sku}`);
}
```

#### Optimistic Concurrency Control (OCC)
For updates involving multi-field business rules, ShopSphere incorporates version-based OCC (`version` or `__v` field):

```typescript
const updatedProduct = await ProductModel.findOneAndUpdate(
  { _id: productId, version: currentVersion },
  { $inc: { version: 1 }, $set: updateData },
  { new: true }
);

if (!updatedProduct) {
  throw new ConcurrencyError("Product was updated by another process. Please retry.");
}
```

---

## 5. Payment Architecture & Security Flow

ShopSphere **never trusts the frontend** to verify payment success. The frontend only acts as an interface to capture card credentials via Payment Gateway SDKs (e.g., Stripe Elements).

```
   CUSTOMER                NEXT.JS FRONTEND           EXPRESS API BACKEND            PAYMENT PROVIDER (STRIPE)
      │                           │                            │                                │
      │ 1. Click "Pay"            │                            │                                │
      ├──────────────────────────►│                            │                                │
      │                           │ 2. POST /checkout/initiate │                                │
      │                           ├───────────────────────────►│                                │
      │                           │                            │ 3. Validate Cart & Price       │
      │                           │                            │ 4. Reserve Stock (Atomic)      │
      │                           │                            │ 5. Create Payment Intent       │
      │                           │                            ├───────────────────────────────►│
      │                           │                            │◄───────────────────────────────┤
      │                           │◄───────────────────────────┤ 6. Return Client Secret        │
      │                           │ 7. Return Client Secret    │                                │
      │ 8. Confirm Card Payment   │                            │                                │
      ├──────────────────────────►│                            │                                │
      │                           │ 9. Process with PSP SDK    │                                │
      │                           ├────────────────────────────┼───────────────────────────────►│
      │                           │                            │                                │
      │                           │                            │ 10. Webhook: payment.succeeded │
      │                           │                            │◄───────────────────────────────┤
      │                           │                            │ 11. Verify Webhook Signature   │
      │                           │                            │ 12. Create Order & Confirm     │
      │                           │                            │ 13. Mark Inventory Fulfilled   │
      │◄──────────────────────────┴────────────────────────────┤                                │
      │ 14. Order Confirmed Signal (WebSocket/Polling)         │                                │
```

### Key Security Safeguards
1. **Price Validation**: Order totals are computed strictly on the backend using canonical database prices. Prices sent from the frontend are ignored.
2. **Webhook Verification**: Payment confirmation relies exclusively on cryptographically signed PSP Webhooks (`payment_intent.succeeded`).
3. **Inventory Reservation Expiry**: Stock reserved during checkout initiation is assigned a 15-minute TTL. If payment fails or times out, a background worker releases the reservation back to available stock.

---

## 6. Idempotency Architecture

To prevent duplicate charges or orders when a customer double-clicks "Pay" or experiences network retries, critical API write routes require an `X-Idempotency-Key` header (UUIDv4).

```
                      CHECKOUT POST REQUEST
                   Header: X-Idempotency-Key
                                │
                                ▼
                     Check Idempotency Store
                                │
                  ┌─────────────┴─────────────┐
                  │                           │
            Key Exists?                  Key New?
             ┌────┴────┐                      │
           YES        NO                      │
            │          │                      ▼
            │          └─────────────► Register Key (Status: PROCESSING)
            ▼                                 │
     Check Key Status                         ▼
    ┌───────┴───────┐                   Execute Checkout
 PROCESSING     COMPLETED                     │
    │               │                         ▼
    ▼               ▼                   Save Response Payload & Status: COMPLETED
 Return 409     Return Cached                 │
 (In Progress)  Response Payload               ▼
                                       Return Response (201 Created)
```

### Idempotency Store Schema Concept
```typescript
interface IdempotencyRecord {
  key: string;            // X-Idempotency-Key header value
  userId: string;         // Authenticated user ID
  requestHash: string;    // SHA256 of request path + body
  status: 'PROCESSING' | 'COMPLETED';
  responseCode?: number;  // Saved HTTP status (e.g., 201)
  responseBody?: object;  // Saved JSON response
  createdAt: Date;
  expiresAt: Date;        // TTL: 24 Hours
}
```

---

## 7. Frontend Architecture (Next.js)

The frontend application (`apps/web`) uses Next.js App Router, balancing Server Components for performance/SEO and Client Components for dynamic interactivity.

```
                                  NEXT.JS APP ROUTER
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
       STORE MODULE                  AUTH MODULE                   ADMIN MODULE
            │                             │                             │
    ┌───────┴───────┐             ┌───────┴───────┐             ┌───────┴───────┐
    │               │             │               │             │               │
 Server Comp.  Client Comp.    Server Comp.  Client Comp.    Server Comp.  Client Comp.
    │               │             │               │             │               │
Catalog Page    Cart Drawer    Login Page   Auth Provider   Dashboard SSR  Data Tables
Product Detail  Checkout Form               Form Validation  Analytics     Modals
Search View     Wishlist Toggle
```

### 7.1 Component Strategy

- **Server Components (RSC)**: Used for Product Listing Pages (PLP), Product Detail Pages (PDP), and Category pages. Fetches data directly on server for optimal First Contentful Paint (FCP) and SEO.
- **Client Components ('use client')**: Used for interactive UI elements: Cart Drawer, Checkout Form Wizard, Wishlist toggles, Review submission modals, and Admin charts.

### 7.2 State Management Architecture (Redux Toolkit)

Redux Toolkit is utilized selectively for client-side state requiring global access across components:

```
                          REDUX STORE (Client State)
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
     authSlice                    cartSlice                     uiSlice
 (User session, JWT status)  (Active cart items, quantity)   (Modals, toasts, drawer)
```

---

## 8. Caching Strategy & Evolution Roadmap

```
Phase 1 (Initial Setup)
Next.js ──────► Express API ──────► MongoDB (Compound Indexes)

Phase 2 (Scale to 10,000+ Users)
Next.js ──────► Express API ──────► Redis Cache (Product Metadata, Categories) ──────► MongoDB
```

### Cache Candidates & Invalidation Policies
- **Categories Tree**: Cache TTL 24 Hours. Invalidate immediately upon Admin category mutation.
- **Top Product Details**: Cache TTL 1 Hour (Cache-Aside pattern). Invalidate on Product update.
- **Search Auto-Complete**: Cache TTL 15 Minutes.

---

## 9. Deployment Topology & Infrastructure

```
                                  INTERNET
                                     │
                                     ▼
                          CDN (Cloudflare / Vercel)
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │      Next.js Frontend  │
                        │      (Vercel / Node)   │
                        └────────────┬───────────┘
                                     │
                                 HTTPS REST
                                     │
                                     ▼
                        ┌────────────────────────┐
                        │   Express API Server   │
                        │  (AWS ECS / Railway)   │
                        └────────────┬───────────┘
                                     │
                 ┌───────────────────┼───────────────────┐
                 │                   │                   │
                 ▼                   ▼                   ▼
      ┌────────────────────┐ ┌───────────────┐ ┌───────────────────┐
      │   MongoDB Atlas    │ │ AWS S3 /      │ │ Stripe / External │
      │   Database Cluster │ │ Cloudinary    │ │ Integrations      │
      └────────────────────┘ └───────────────┘ └───────────────────┘
```

### Supporting Services
- **Image Storage**: AWS S3 / Cloudinary for product image hosting with CDN transformations.
- **Transactional Email**: Resend / AWS SES for order confirmation emails and password resets.
- **Observability Stack**: Pino JSON logging aggregated into Datadog / Logtail + Sentry for error tracking.
