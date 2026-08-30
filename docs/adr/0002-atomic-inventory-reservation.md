# ADR 0002: Atomic Inventory Reservation & Overselling Prevention

* **Status**: Accepted
* **Date**: 2026-08-30
* **Deciders**: ShopSphere Engineering Team

---

## Context and Problem Statement

In e-commerce platforms, concurrent checkout requests for high-demand, low-stock products (e.g., stock = 1) can cause race conditions. If two users attempt to purchase the same unit at the same time, naive application logic (reading stock into memory, checking if `stock > 0`, and updating later) results in **overselling** (`stock` drops below 0).

How can ShopSphere guarantee inventory correctness and prevent overselling under high concurrency?

## Decision Drivers

* **Zero Overselling Tolerance**: It is unacceptable to confirm an order for an item that is out of stock.
* **High Concurrency Performance**: Stock validation and reservation must handle thousands of simultaneous requests without table locks or deadlock spikes.
* **Resilience to Abandoned Checkouts**: If a user reserves stock but abandons payment, reserved stock must automatically return to available inventory.

## Considered Options

1. **Read-Check-Update in Application Memory** (Query stock, evaluate `stock >= qty`, send update query).
2. **Pessimistic Database Row Locking** (Lock database row during entire checkout transaction).
3. **Atomic Database Query Updates with Conditional Guards** (Execute atomic `$inc` updates with `stock >= quantity` query predicate).

## Decision Outcome

Chosen Option: **Option 3 — Atomic Database Query Updates with Conditional Guards**.

ShopSphere will execute inventory operations directly in MongoDB using atomic conditional updates:

```typescript
const result = await InventoryModel.findOneAndUpdate(
  { sku: item.sku, stock: { $gte: item.quantity } },
  { $inc: { stock: -item.quantity, reserved: item.quantity } },
  { new: true, session }
);

if (!result) {
  throw new InsufficientStockError(`Stock depleted for SKU: ${item.sku}`);
}
```

### Reservation Expiry Mechanism
Stock reserved during checkout initiation is assigned a 15-minute reservation TTL. A background cleanup worker scans for unconfirmed reservations older than 15 minutes and automatically restores stock (`$inc: { stock: qty, reserved: -qty }`).

### Positive Consequences
* **100% Prevention of Overselling**: MongoDB's single-document atomic update guarantees that stock will never drop below zero regardless of concurrency.
* **High Performance**: Eliminates application-level locks and reduces lock contention.
* **Automatic Recovery**: Abandoned checkouts automatically release reserved inventory.

### Negative Consequences
* High-concurrency flash sales may experience request rejections (`INSUFFICIENT_STOCK`) once stock hits zero, requiring clear UI error messages.
