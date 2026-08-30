# ShopSphere — Requirements Specification

This document details the functional and non-functional requirements for **ShopSphere**, a realistic, enterprise-grade e-commerce platform.

---

## Step 1 — Product Definition & Personas

ShopSphere serves two primary user roles with distinct capabilities and workflows:

```
                    SHOPSPHERE APPLICATION
                               │
            ┌──────────────────┴──────────────────┐
            │                                     │
         CUSTOMER                               ADMIN
```

### 1.1 Customer Persona

A customer is an end-user shopping on the platform. Customers can perform the following actions:

| Category | Capability | Description |
| :--- | :--- | :--- |
| **Account** | Create Account | Register a new account with email, password, and personal details. |
| | Login / Logout | Authenticate securely and invalidate sessions upon logging out. |
| | Manage Profile | Update account information and change password. |
| **Discovery** | Browse Products | View product listings with pagination across categories. |
| | Search Products | Perform keyword search across product titles, tags, and descriptions. |
| | Filter Products | Filter product catalog by category, price range, brand, availability, and rating. |
| | Sort Products | Sort listings by price (asc/desc), popularity, newest arrival, and average rating. |
| | View Product Details | Access full product metadata, image gallery, stock availability, specifications, and reviews. |
| **Shopping** | Add to Cart | Add product variants to persistent shopping cart. |
| | Update Cart Quantity | Modify quantity of items in cart with real-time stock validation. |
| | Remove Cart Items | Delete items from shopping cart. |
| | Wishlist | Add or remove items to/from a personal wishlist. |
| | Manage Addresses | Store and select multiple shipping and billing addresses. |
| **Fulfillment** | Checkout | Initiate checkout flow with price calculation, tax, shipping, and discounts. |
| | Make Payment | Pay securely via integrated payment gateway (e.g., Stripe card/wallet payments). |
| | Place Orders | Submit finalized order for processing. |
| | View Orders & Details | View order history, track order fulfillment status, and view detailed invoices. |
| **Engagement** | Submit Reviews | Write product reviews and submit 1–5 star ratings for purchased items. |

---

### 1.2 Admin Persona

An admin manages the platform's operational lifecycle, catalog, orders, and sales performance:

| Category | Capability | Description |
| :--- | :--- | :--- |
| **Authentication**| Admin Login | Secure multi-factor authentication for administrative users. |
| **Analytics** | View Dashboard | Executive overview of total sales, active orders, customer metrics, and revenue charts. |
| | View Sales Info | Detailed reporting on revenue, conversion rate, top-selling products, and regional sales. |
| **Catalog** | Create Products | Add new products with title, description, price, SKUs, imagery, and category assignments. |
| | Update Products | Edit existing product details, pricing, metadata, and visibility status. |
| | Delete Products | Soft-delete or archive products to preserve historical order references. |
| | Manage Categories | Create, update, and organize hierarchical product category trees. |
| **Operations** | Manage Inventory | Monitor stock levels, set low-stock alert thresholds, and manually adjust stock counts. |
| | View Customers | Access customer profiles, order history, and account activity. |
| | View Orders | Search, filter, and inspect all customer orders across all states. |
| | Update Order Status | Transition order states (e.g., `Pending` → `Processing` → `Shipped` → `Delivered` / `Cancelled`). |

---

## Step 2 — Functional Requirements & Module Architecture

The system is partitioned into **14 domain modules** that serve as the blueprint for backend service implementation:

```
ShopSphere Platform
│
├── Authentication    # Sign-up, sign-in, JWT/Session tokens, password reset
├── Users             # User profiles, address book, role management
├── Products          # Catalog, product attributes, variants, media
├── Categories        # Taxonomy hierarchy, category trees
├── Search            # Text index search, attribute filtering, sorting engine
├── Cart              # Active customer shopping cart, guest cart merging
├── Wishlist          # Saved products for future purchase
├── Checkout          # Order total calculation, tax, shipping, address selection
├── Payments          # Payment gateway integration, payment intents, webhooks
├── Orders            # Order creation, order items, status tracking, invoice lifecycle
├── Inventory         # Stock levels, atomic reservations, stock alerts
├── Reviews           # Customer ratings, review moderation, verified purchase checks
└── Admin             # Analytics queries, administrative workflows, catalog operations
```

### Module Responsibilities Matrix

- **Authentication**: Handles user credentials, password hashing (argon2/bcrypt), token issuance, refresh token rotation, and permission guards.
- **Users**: Manages user profiles, role assignments (`CUSTOMER`, `ADMIN`), and shipping/billing address storage.
- **Products**: Manages product metadata, SKU creation, price rules, product options (color/size), and image uploads.
- **Categories**: Defines category hierarchy (e.g., Electronics → Laptops → Gaming Laptops) to support navigation.
- **Search**: Executes optimized search queries using text indexes and dynamic filtering parameters.
- **Cart**: Maintains real-time shopping cart state per user or session, ensuring price snapshotting during session.
- **Wishlist**: Manages saved item lists with quick "Move to Cart" capabilities.
- **Checkout**: Assembles items, calculates subtotals, applies tax rules and shipping fees, and locks order totals.
- **Payments**: Interacts with Payment Service Providers (PSP), processes payment intents, handles webhooks asynchronously, and registers transactions.
- **Orders**: Immutable log of finalized customer purchases, line items, payment status, and shipping stage.
- **Inventory**: Tracks physical stock quantities per SKU, handles atomic decrementing upon order confirmation, and prevents overselling.
- **Reviews**: Aggregates customer feedback, validates purchase verification, and computes average product ratings.
- **Admin**: Aggregates metrics across Orders, Inventory, and Users for administrative dashboards.

---

## Step 3 — Non-Functional Requirements (NFRs)

To ensure ShopSphere operates as a production-grade system, the platform fulfills strict non-functional constraints:

### 3.1 Performance
- **Response Time**: Catalog browsing and search requests must return within **< 200ms** (P95) and **< 100ms** (P50).
- **Checkout Throughput**: The checkout pipeline must support high concurrent order throughput without degraded latency.
- **Database Efficiency**: Compound indexes must cover 100% of frequent read paths (category filters, search, user order lists).

### 3.2 Availability & Resilience
- **SLA Target**: Target availability of **99.9%** uptime.
- **Graceful Degradation**: External API failures (e.g., payment gateway timeout, image storage provider down) must be isolated with retries and circuit breakers so browsing remains available.
- **Stateless API**: API instances carry no session state in memory, allowing instant replacement upon node crash.

### 3.3 Security
- **Authentication**: JWT tokens stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies or standard Bearer headers.
- **Authorization**: Strict Role-Based Access Control (RBAC) enforced via Express middleware (`requireAuth`, `requireAdmin`).
- **Input Validation**: All incoming HTTP payloads validated against strict schema contracts (Zod) before reaching business controllers.
- **Password Security**: Passwords hashed using Argon2id or bcrypt (cost factor 12+). Plaintext passwords are never logged or stored.
- **Rate Limiting**: IP-based and user-based rate limiting on sensitive routes (auth endpoints: 5 req/min, search API: 60 req/min).
- **CORS & Headers**: Strict CORS origin allowlist, plus security headers via Helmet (`HSTS`, `X-Content-Type-Options`, `Content-Security-Policy`).
- **Secret Management**: Application configuration and keys loaded strictly from environment variables (`process.env`), never committed to source control.

### 3.4 Scalability
- **Growth Roadmap**: Designed to scale seamlessly across user tiers:
  $$\text{100 Users} \longrightarrow \text{10,000 Users} \longrightarrow \text{100,000+ Concurrent Users}$$
- **Horizontal Scaling**: Stateless Express API nodes behind a load balancer.
- **Database Scalability**: MongoDB replica sets for read-scaling; ready for horizontal sharding by SKU/Category if catalog expands.
- **Decoupled Architecture**: Prepared for Redis caching and message queues without requiring core API rewrites.

### 3.5 Maintainability
- **Modular Isolation**: Modules interact via strict internal service APIs, not direct internal state mutation. Updating `Products` logic will not break `Payments`.
- **Layered Architecture**: Strict separation of concerns (Controller → Service → Repository).
- **Type Safety**: End-to-end TypeScript interfaces across API contracts and database schemas.

### 3.6 Observability
- **Structured Logging**: JSON-formatted logs (using Pino) emitted to stdout containing timestamp, log level, trace ID, and domain context.
- **Request Tracing**: Unique `X-Request-ID` assigned to every incoming HTTP request and propagated through all logs and database operations.
- **Error Diagnostics**: Error logs record exact error name, message, stack trace, user ID, request path, and input payload (sanitized of PII).
- **Performance Metrics**: Standardized log records capturing request duration (`duration_ms`), database execution time, and HTTP status codes.
