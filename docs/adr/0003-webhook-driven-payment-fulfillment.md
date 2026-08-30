# ADR 0003: Webhook-Driven Asynchronous Payment Fulfillment

* **Status**: Accepted
* **Date**: 2026-08-30
* **Deciders**: ShopSphere Engineering Team

---

## Context and Problem Statement

A common vulnerability in e-commerce applications occurs when the backend relies on the frontend client to report payment success (e.g. client sending `POST /orders` with `paymentSuccessful: true` after card processing). Malicious users can intercept client calls and forge payment confirmation without paying. Furthermore, network dropouts on the user's browser after payment processing can lead to paid orders remaining unfulfilled.

How should ShopSphere authorize and confirm payment fulfillment safely and reliably?

## Decision Drivers

* **Zero Fraud Risk**: Frontend client claims must never trigger order confirmation or inventory deduction.
* **Asynchronous Reliability**: Order creation must succeed even if the customer closes their browser immediately after confirming card payment.
* **Provider Agnosticism**: Standardized pattern compatible with Stripe, PayPal, or regional payment gateways.

## Decision Outcome

ShopSphere adopts a **Webhook-Driven Asynchronous Payment Fulfillment** model.

1. **Server Price Lock**: Backend calculates cart total, locks price, reserves stock, and creates a PaymentIntent with the Payment Provider (e.g., Stripe).
2. **Client Elements Only**: Frontend receives a `client_secret` and renders provider UI elements.
3. **Webhook Fulfillment**: Payment Provider asynchronously posts a cryptographically signed webhook payload (`payment_intent.succeeded`) directly to `POST /api/v1/payments/webhook`.
4. **Signature Verification & Execution**: Backend verifies signature, transitions order state to `PAID`, updates order to `PROCESSING`, and fulfills reserved inventory.

### Positive Consequences
* **Immunity to Client Forgery**: Order fulfillment is triggered strictly by signed webhook payloads verified with the PSP secret.
* **Resilient to Network Dropouts**: Even if the customer loses connectivity post-payment, the PSP webhook guarantees order fulfillment.

### Negative Consequences
* Webhook delivery delays (usually < 2 seconds) require frontend UI to poll or listen via WebSockets for final order confirmation.
* Webhook endpoints must implement signature verification and idempotency handling.
