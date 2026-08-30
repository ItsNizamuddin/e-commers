# ShopSphere — REST API Specification

This document defines the RESTful API design, versioning conventions, request/response formats, error codes, and endpoint specifications for **ShopSphere**.

---

## 1. API Conventions & Versioning

### 1.1 Base URL & Versioning Strategy
All API routes are prefixed with `/api/v1/`.

```
Base URL: https://api.shopsphere.com/api/v1
```

Future breaking changes will be published under `/api/v2/` without disrupting existing client applications.

---

### 1.2 Global HTTP Headers

| Header | Type | Description | Required On |
| :--- | :--- | :--- | :--- |
| `Authorization` | `String` | Bearer Token format (`Bearer <JWT>`) | Authenticated Endpoints |
| `X-Idempotency-Key` | `UUIDv4` | Unique key to deduplicate write requests | `POST /checkout/initiate`, `POST /orders` |
| `X-Request-ID` | `UUIDv4` | Correlation ID for request tracing (auto-generated if missing) | All Requests |
| `Content-Type` | `String` | `application/json` | Requests with Body Payload |

---

## 2. Standardized Response Formats

### 2.1 Success Envelope
```json
{
  "success": true,
  "data": {
    "id": "64f8a123b456c789",
    "title": "Wireless Headphones"
  },
  "meta": {
    "timestamp": "2026-08-30T23:40:00.000Z",
    "requestId": "req_abc123xyz"
  }
}
```

### 2.2 Paginated Success Envelope
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "meta": {
    "timestamp": "2026-08-30T23:40:00.000Z",
    "requestId": "req_abc123xyz"
  }
}
```

### 2.3 Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Stock depleted for requested SKU: IPHONE15",
    "details": [
      {
        "field": "sku",
        "issue": "Requested quantity (2) exceeds available stock (1)"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-08-30T23:40:00.000Z",
    "requestId": "req_abc123xyz"
  }
}
```

---

## 3. Comprehensive Endpoint Reference

### 3.1 Authentication Module (`/api/v1/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Register new customer account |
| `POST` | `/auth/login` | Public | Authenticate user & return JWT + set refresh cookie |
| `POST` | `/auth/logout` | Authenticated | Revoke refresh token and clear cookies |
| `POST` | `/auth/refresh` | Public | Refresh expired access token using refresh cookie |

---

### 3.2 User Management Module (`/api/v1/users`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/users/profile` | Customer | Fetch logged-in user profile details |
| `PUT` | `/users/profile` | Customer | Update profile info (name, phone) |
| `POST` | `/users/addresses` | Customer | Add new address to address book |
| `DELETE` | `/users/addresses/:id` | Customer | Remove address from address book |

---

### 3.3 Products & Categories Modules (`/api/v1/products`, `/api/v1/categories`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | Public | List products (Query params: `page`, `limit`, `category`, `minPrice`, `maxPrice`, `brand`, `sort`) |
| `GET` | `/products/:id` | Public | Fetch product details by ID |
| `GET` | `/products/slug/:slug` | Public | Fetch product details by URL slug |
| `GET` | `/categories` | Public | List category tree hierarchy |
| `GET` | `/categories/:id` | Public | Fetch category details |

---

### 3.4 Search Module (`/api/v1/search`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/search` | Public | Execute full-text search query (Query: `q`, `category`, `sort`, `page`) |

---

### 3.5 Cart Module (`/api/v1/cart`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/cart` | Customer | Get current user's active shopping cart |
| `POST` | `/cart/items` | Customer | Add item to cart payload: `{ productId, sku, quantity }` |
| `PUT` | `/cart/items/:sku` | Customer | Update item quantity payload: `{ quantity }` |
| `DELETE` | `/cart/items/:sku` | Customer | Remove item from cart |

---

### 3.6 Wishlist Module (`/api/v1/wishlist`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/wishlist` | Customer | List saved wishlist items |
| `POST` | `/wishlist/items` | Customer | Add product to wishlist payload: `{ productId }` |
| `DELETE` | `/wishlist/items/:productId` | Customer | Remove product from wishlist |

---

### 3.7 Checkout & Payments Modules (`/api/v1/checkout`, `/api/v1/payments`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/checkout/calculate` | Customer | Calculate subtotal, tax, and shipping preview |
| `POST` | `/checkout/initiate` | Customer | Reserve stock & create PaymentIntent (Requires `X-Idempotency-Key`) |
| `POST` | `/payments/webhook` | External (PSP) | Receive Stripe signed webhooks (`payment_intent.succeeded`) |

---

### 3.8 Orders Module (`/api/v1/orders`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/orders` | Customer | List customer order history |
| `GET` | `/orders/:id` | Customer | Fetch detailed invoice & fulfillment status |
| `POST` | `/orders/cancel/:id` | Customer | Request cancellation for pending unpaid orders |

---

### 3.9 Product Reviews Module (`/api/v1/reviews`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/products/:productId/reviews` | Public | List reviews for product |
| `POST` | `/products/:productId/reviews` | Customer | Submit review & rating (Verified purchase check) |

---

### 3.10 Admin Operations Module (`/api/v1/admin`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/dashboard` | Admin | Retrieve executive dashboard metrics summary |
| `POST` | `/admin/products` | Admin | Create product listing |
| `PUT` | `/admin/products/:id` | Admin | Update product catalog details |
| `DELETE` | `/admin/products/:id` | Admin | Soft-delete / archive product |
| `POST` | `/admin/categories` | Admin | Create new product category |
| `PUT` | `/admin/inventory/:sku` | Admin | Adjust inventory stock count manually |
| `GET` | `/admin/orders` | Admin | Search & list all customer orders |
| `PATCH`| `/admin/orders/:id/status`| Admin | Update order status (`PROCESSING` → `SHIPPED` → `DELIVERED`) |
| `GET` | `/admin/customers` | Admin | View customer accounts list |
| `GET` | `/admin/analytics/sales` | Admin | Retrieve sales reports by date range |

---

## 4. Standard HTTP Error Codes

| HTTP Status | Error Code | Scenario |
| :--- | :--- | :--- |
| `400 Bad Request` | `VALIDATION_ERROR` | Request body failed Zod validation schema |
| `401 Unauthorized` | `UNAUTHENTICATED` | Missing or invalid JWT access token |
| `403 Forbidden` | `FORBIDDEN` | Customer attempting to access Admin endpoint |
| `404 Not Found` | `RESOURCE_NOT_FOUND` | Product, category, or order ID does not exist |
| `409 Conflict` | `INSUFFICIENT_STOCK` | Stock insufficient during checkout initiation |
| `409 Conflict` | `DUPLICATE_RESOURCE` | Email already registered |
| `422 Unprocessable` | `IDEMPOTENCY_CONFLICT` | Re-submitting request with conflicting body hash |
| `429 Too Many Req` | `RATE_LIMIT_EXCEEDED` | Exceeded API rate limits |
| `500 Server Error` | `INTERNAL_SERVER_ERROR` | Unhandled exception logged with trace ID |
