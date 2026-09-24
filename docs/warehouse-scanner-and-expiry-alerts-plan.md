# Warehouse Packing Bench Barcode Scanner & Background Expiry/Low-Stock Alerts — Final Architecture Plan

## 1. Executive Summary

This architecture establishes an end-to-end physical verification and safety enforcement system for food packaging fulfillment and warehouse operations:

1. **Persistent Packing Sessions (`PackingSession`)**:
   - Full session lifecycle (`NOT_STARTED` → `IN_PROGRESS` → `VERIFIED` → `CANCELLED`) bound to the Order and its FEFO-allocated finished goods lots.
   - Comprehensive audit logging of every barcode scan event (`stationId`, `packer`, `barcode`, `lotId`, `result`, `timestamp`).
   - Clean packing reset workflow preserving audit history across sessions.

2. **Finished Goods Only Scan Verification**:
   - Order packing scans resolve exclusively against `FinishedGoodsLotModel`. Raw material lots cannot satisfy customer order fulfillment.
   - Parses lot numbers (`RPK-...`, `LOT-...`) and public QR verification tokens (`bv_...`).

3. **Explicit Diagnostic Scan States**:
   - `MATCHED`, `ALREADY_COMPLETED`, `WRONG_LOT`, `NOT_FOUND`, `EXPIRED`, `RECALLED`, `QUARANTINED`, `INVALID_CODE`.

4. **Atomic Concurrency Protection**:
   - Prevents double-scans and overpacking using atomic MongoDB updates.

5. **Server-Side Shipping Security & Shipping-Time Revalidation**:
   - `POST /api/v1/orders/admin/:id/ship` strictly validates that the packing session is `VERIFIED`.
   - Re-checks every allocated lot at shipping time against `RECALLED`, `QUARANTINED`, or `EXPIRED` status before finalizing consumption and dispatch.

6. **Database-Driven Operational Alerts & Enhanced BullMQ Worker**:
   - Worker inspects both Raw Material and Finished Goods lots.
   - Daily automated status transitions for expired lots with idempotent outbox keys (`expiry:{lotId}:{severity}:{date}`, `low-stock:{inventoryId}:{date}`).
   - Sellable stock formula: `sellableStock = onHand - reserved - quarantined - recalled - expired`.
   - `GET /api/v1/admin/manufacturing/alerts` queries live database state in real time.

```
                    ┌─────────────────────┐
                    │     CUSTOMER ORDER  │
                    └──────────┬──────────┘
                               │
                               ▼
                     ┌───────────────────┐
                     │ FEFO ALLOCATION   │
                     └─────────┬─────────┘
                               │
                               ▼
                   Finished Goods Lots
                               │
                               ▼
                  ┌──────────────────────┐
                  │   PACKING SESSION    │
                  │                      │
                  │ Required Qty         │
                  │ Verified Qty         │
                  │ Scan Events          │
                  │ Packer               │
                  │ Station              │
                  └──────────┬───────────┘
                             │
                             ▼
                     Barcode / QR Scan
                             │
                             ▼
                  ┌──────────────────────┐
                  │ SERVER VALIDATION    │
                  │                      │
                  │ Lot exists?          │
                  │ Correct order?       │
                  │ Correct allocation?  │
                  │ Available?           │
                  │ Not expired?         │
                  │ Not recalled?        │
                  │ Not quarantined?     │
                  │ Quantity available?  │
                  └──────────┬───────────┘
                             │
                             ▼
                     Atomic Transaction
                             │
                             ▼
                       Scan Audit Log
                             │
                             ▼
                    ALL ITEMS VERIFIED
                             │
                             ▼
                         SHIP API
                             │
                             ▼
                    FINAL REVALIDATION
                             │
                             ▼
                          SHIPPED

Meanwhile:

                     ┌───────────────┐
                     │ BullMQ Worker │
                     └───────┬───────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
       Expiry Monitoring              Stock Monitoring
              │                             │
              ▼                             ▼
       Raw + Finished                Raw + Finished
              │                             │
              └──────────────┬──────────────┘
                             ▼
                       DB State Update
                             │
                             ▼
                    Transactional Outbox
                             │
                             ▼
                      Alert Events
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Admin Alert Center  │
                  └─────────────────────┘
```

---

## 2. API Contract & Resource Specification

### A. Packing Bench Endpoints
* `POST /api/v1/orders/admin/:id/packing/start`:
  - Body: `{ stationId: string }`
  - Starts or retrieves the active packing session, initializing required quantities from the order's FEFO allocated lots.
* `POST /api/v1/orders/admin/:id/packing/scan`:
  - Body: `{ barcode: string, stationId: string }`
  - Resolves FinishedGoodsLot, checks allocation, atomically updates `verifiedQty`, logs scan event, and marks session `VERIFIED` when all items are complete.
* `GET /api/v1/orders/admin/:id/packing`:
  - Returns current active packing session with item checklist and recent scan events.
* `POST /api/v1/orders/admin/:id/packing/reset`:
  - Body: `{ reason: string, stationId?: string }`
  - Cancels current session, preserves history, and creates a fresh session.
* `POST /api/v1/orders/admin/:id/ship`:
  - Body: `{ carrier?: string, trackingNumber?: string, expectedVersion: number }`
  - Server-side guard: requires session `VERIFIED`, revalidates lot health, finalizes consumption, transitions order to `SHIPPED`.

### B. Operational Alerts Endpoints
* `GET /api/v1/admin/manufacturing/alerts`:
  - Real-time database query returning:
    - `summary`: counts of expired, upcoming expiry, low stock, and active recalls.
    - `expiredLots`: lots with `expiryDate <= now`.
    - `expiringLots`: lots expiring $\le 30$ days (`CRITICAL` $\le 7$d, `WARNING` $\le 15$d, `ADVISORY` $\le 30$d).
    - `lowStockRawMaterials`: raw materials with `currentStock <= reorderThreshold`.
    - `lowStockFinishedGoods`: inventory variants where `sellableStock <= reorderThreshold`.
    - `activeRecalls`: lots in `RECALLED` qualityStatus.

---

## 3. Phased Implementation Roadmap

### Phase 1 — Data Model & Shared Types
1. Update `packages/types/src/order/order.types.ts`:
   - `PackingStatus`, `PackingScanResult`, `PackingSessionItem`, `PackingScanEvent`, `PackingSessionResponse`, `StartPackingInput`, `PackingScanInput`, `ResetPackingInput`, `ShipOrderInput`.
2. Update `packages/types/src/manufacturing.ts`:
   - `ExpirySeverity`, `LotExpiryAlertItem`, `LowStockAlertItem`, `ManufacturingAlertsResponse`.
3. Create `apps/api/src/modules/orders/models/packing-session.model.ts`:
   - Mongoose model with indexes on `{ orderId: 1, status: 1 }` and `{ "scanEvents.barcode": 1 }`.

### Phase 2 — Backend Packing Service & Shipping Guards
1. Implement `packing.service.ts` in `apps/api/src/modules/orders/services/`:
   - `startPackingSession(orderId, stationId, actor)`
   - `verifyPackingScan(orderId, barcode, stationId, actor)` with atomic updates
   - `getActivePackingSession(orderId)`
   - `resetPackingSession(orderId, reason, stationId, actor)`
2. Enhance `order.service.ts`:
   - Dedicated `shipOrder(orderId, input, actor)` with revalidation against `FinishedGoodsLotModel.qualityStatus` and expiry dates.
   - Update `updateFulfillmentStatus` to enforce packing session verification when transitioning to `SHIPPED`.
3. Mount routes in `order.routes.ts` and `order.controller.ts`.

### Phase 3 — Admin UI: Packing Bench Scanner
1. Build `apps/admin/src/components/orders/packing-bench-scanner.tsx`:
   - Station ID selector (`PACK-BENCH-01`, etc.)
   - Auto-focused barcode input with instant Enter trigger
   - Camera scan modal toggle
   - Item packing progress cards with required vs verified badges
   - Real-time diagnostic alert banners (Wrong lot, Recalled, Expired, Already completed)
   - Audio feedback synthesizer (Web Audio API: positive chime for match, buzzer for mismatch/recalled)
   - Reset packing dialog with mandatory reason
2. Update `apps/admin/src/app/(dashboard)/orders/[id]/page.tsx`:
   - Embed packing bench scanner
   - Disable shipping button until session status is `VERIFIED`
   - Wire into `shipOrder` API
3. Update RTK Query in `apps/admin/src/store/api/endpoints/orders.ts`.

### Phase 4 — Expiry & Inventory Workers
1. Enhance `apps/api/src/modules/queues/workers/expiry-monitor.worker.ts`:
   - Scan `FinishedGoodsLotModel` for expired lots & transition status
   - Calculate sellable stock: `onHand - reserved - quarantined - recalled - expired`
   - Idempotent outbox event keys: `expiry:{lotId}:{severity}:{date}` & `low-stock:{inventoryId}:{date}`

### Phase 5 — Dashboard Alerts Center
1. Implement `getManufacturingAlerts` in `manufacturing.service.ts` & controller.
2. Mount `GET /api/v1/admin/manufacturing/alerts`.
3. Add RTK Query in `apps/admin/src/store/api/endpoints/manufacturing.ts`.
4. Build `apps/admin/src/components/dashboard/operational-alerts-widget.tsx`.
5. Integrate into `apps/admin/src/app/(dashboard)/dashboard/page.tsx`.

### Phase 6 — Automated Test Suites & Monorepo Validation
1. Integration test suite `apps/api/src/tests/packing-session-and-alerts.test.ts`:
   - Starting packing session from order
   - Successful FEFO lot scan
   - Wrong lot rejection
   - Recalled lot rejection
   - Expired lot rejection
   - Double-scan prevention
   - Shipment blocked without verification
   - Shipment blocked if lot recalled after packing
   - Packing reset preserving audit log
   - Real-time alerts API accuracy
2. Monorepo typecheck: `pnpm --recursive typecheck`.
