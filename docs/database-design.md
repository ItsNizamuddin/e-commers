# ShopSphere — Database Design Specification

This document defines the MongoDB database design, Mongoose schemas, relationships, indexing strategies, and data models for **ShopSphere**.

---

## 1. Conceptual Entity-Relationship Diagram

```
                USER
                 │
        ┌────────┼────────┐
        │        │        │
        ▼        ▼        ▼
       CART    ORDERS   REVIEWS
                 │
                 ▼
              PRODUCTS
                 │
          ┌──────┴──────┐
          ▼             ▼
       CATEGORY      INVENTORY
```

---

## 2. Collection Schemas & Data Dictionary

### 2.1 `users` Collection

Stores user identity, roles, credentials, and address listings.

```typescript
import { Schema } from 'mongoose';

const AddressSchema = new Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true, default: 'US' },
  isDefault: { type: Boolean, default: false }
}, { _id: true });

const UserSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['CUSTOMER', 'ADMIN'], default: 'CUSTOMER' },
  phone: { type: String, default: null },
  addresses: [AddressSchema],
  isActive: { type: Boolean, default: true },
  refreshTokenHash: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
```

---

### 2.2 `categories` Collection

Organizes product taxonomy in a parent-child hierarchy.

```typescript
const CategorySchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, default: '' },
  parentCategoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ parentCategoryId: 1 });
```

---

### 2.3 `products` Collection

Contains catalog product metadata, pricing, variants, and imagery.

```typescript
const ProductVariantSchema = new Schema({
  sku: { type: String, required: true, unique: true },
  attributes: { type: Map, of: String }, // e.g. { color: "Red", size: "XL" }
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now }
});

const ProductSchema = new Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, required: true },
  brand: { type: String, required: true, trim: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  basePrice: { type: Number, required: true, min: 0 },
  images: [{ type: String }],
  isPublished: { type: Boolean, default: true },
  variants: [ProductVariantSchema],
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  tags: [{ type: String }],
  version: { type: Number, default: 1 } // Optimistic Concurrency Control
}, { timestamps: true });

// Indexes
ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ categoryId: 1, isPublished: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ basePrice: 1 });
ProductSchema.index({ title: 'text', description: 'text', tags: 'text' });
```

---

### 2.4 `inventory` Collection

Tracks real-time stock levels and reserved quantities per SKU.

```typescript
const InventorySchema = new Schema({
  sku: { type: String, required: true, unique: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  stock: { type: Number, required: true, min: 0 },
  reserved: { type: Number, required: true, min: 0, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
InventorySchema.index({ sku: 1 }, { unique: true });
InventorySchema.index({ productId: 1 });
InventorySchema.index({ stock: 1 });
```

---

### 2.5 `carts` Collection

Maintains active customer shopping cart items.

```typescript
const CartItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true }
}, { _id: true });

const CartSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  items: [CartItemSchema],
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
CartSchema.index({ userId: 1 }, { unique: true });
```

---

### 2.6 `orders` Collection

Immutable transaction ledger recording finalized purchases.

```typescript
const OrderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true },
  title: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  totalPrice: { type: Number, required: true }
});

const OrderSchema = new Schema({
  orderNumber: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [OrderItemSchema],
  subtotal: { type: Number, required: true },
  taxTotal: { type: Number, required: true },
  shippingTotal: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },
  paymentStatus: {
    type: String,
    enum: ['UNPAID', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED'],
    default: 'UNPAID'
  },
  paymentIntentId: { type: String, default: null },
  idempotencyKey: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentIntentId: 1 });
```

---

### 2.7 `payments` Collection

Logs payment gateway transactions and webhook responses.

```typescript
const PaymentSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  paymentProvider: { type: String, required: true, default: 'STRIPE' },
  transactionId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'], required: true },
  rawProviderResponse: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
PaymentSchema.index({ transactionId: 1 }, { unique: true });
PaymentSchema.index({ orderId: 1 });
```

---

### 2.8 `reviews` Collection

Stores customer ratings and text reviews for products.

```typescript
const ReviewSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true, trim: true },
  comment: { type: String, required: true, trim: true },
  isVerifiedPurchase: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
ReviewSchema.index({ productId: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, productId: 1 }, { unique: true }); // 1 review per user per product
```

---

### 2.9 `idempotency_keys` Collection

Deduplicates critical checkout and write requests.

```typescript
const IdempotencyKeySchema = new Schema({
  key: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  requestHash: { type: String, required: true },
  status: { type: String, enum: ['PROCESSING', 'COMPLETED'], required: true },
  responseCode: { type: Number },
  responseBody: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // TTL: 24 Hours
});

IdempotencyKeySchema.index({ key: 1 }, { unique: true });
```

---

## 3. Indexing Strategy Summary

| Collection | Indexed Fields | Purpose |
| :--- | :--- | :--- |
| `users` | `email` (Unique) | Instant authentication lookup |
| `products` | `{ categoryId: 1, isPublished: 1 }` | Fast category catalog queries |
| `products` | Text index on `title`, `description`, `tags` | Full-text keyword search |
| `inventory` | `sku` (Unique) | Fast atomic stock updates |
| `orders` | `{ userId: 1, createdAt: -1 }` | Paginated customer order history |
| `orders` | `paymentIntentId` | Webhook handler fast order retrieval |
| `reviews` | `{ userId: 1, productId: 1 }` (Unique) | Enforce single review constraint |
