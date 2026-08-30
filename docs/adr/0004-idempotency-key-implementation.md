# ADR 0004: Idempotency Key Implementation for Critical Write Operations

* **Status**: Accepted
* **Date**: 2026-08-30
* **Deciders**: ShopSphere Engineering Team

---

## Context and Problem Statement

When a user submits a checkout request or payment, transient network latency may cause the client to retry the request or prompt the user to double-click the "Pay" button. Without idempotency controls, retried write requests can result in **double charging** or **duplicate order creation**.

How should ShopSphere guarantee idempotency for state-modifying HTTP API endpoints?

## Decision Drivers

* **Financial Integrity**: Guaranteeing that duplicate user requests never result in multiple payment charges or duplicate orders.
* **Transparent Retries**: Enabling mobile apps and client browsers to safely retry failed requests using exponential backoff.
* **Standard API Specs**: Utilizing standard HTTP header conventions.

## Decision Outcome

ShopSphere enforces an `X-Idempotency-Key` header requirement for critical write operations (`POST /checkout/initiate`, `POST /orders`).

### Implementation Workflow
1. Client generates a unique UUIDv4 string for every new transaction attempt and includes `X-Idempotency-Key: <UUIDv4>` in the request headers.
2. Express idempotency middleware checks `idempotency_keys` collection:
   - **Key New**: Insert key record with status `PROCESSING`. Execute request. Save resulting HTTP status code and response payload, updating status to `COMPLETED`. Return response.
   - **Key In Progress (`PROCESSING`)**: Return HTTP `409 Conflict` (Operation in progress).
   - **Key Completed (`COMPLETED`)**: Replay the stored HTTP status code and response payload directly from cache/database without re-executing business logic.

### Positive Consequences
* Completely eliminates duplicate payments and duplicate order records caused by retries or double-clicks.
* Allows safe client retries upon network drops.

### Negative Consequences
* Small storage overhead for storing idempotency keys (mitigated by 24-hour TTL index in MongoDB).
