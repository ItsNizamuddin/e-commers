# ShopSphere — Production-Grade E-Commerce Platform

ShopSphere is a realistic, enterprise-grade e-commerce platform built as a **Modular Monolith** using Next.js, Node.js + Express, and MongoDB.

---

## 📚 System Design & Architecture Documentation Hub

The platform's technical specification, database design, API documentation, authentication architecture, and architectural decision records are fully documented under `docs/`:

* 📋 [**Requirements Specification**](docs/requirements.md) — Product Personas (Customer vs. Admin), 14 domain modules, and Non-Functional Requirements (NFRs).
* 🏗️ [**System Design Document**](docs/system-design.md) — High-level architecture, Modular Monolith rationale, Layered Express request architecture, Atomic Inventory Overselling resolution, Payment Webhook flows, Idempotency mechanisms, Next.js frontend state design, Caching roadmap, and Deployment topology.
* 🗄️ [**Database Design Specification**](docs/database-design.md) — Mongoose schemas, collection specifications, field-level dictionary, indexes, and entity relationship models.
* 🔌 [**REST API Specification**](docs/api-design.md) — `/api/v1/` endpoint mapping, response envelopes, error structures, and idempotency headers.
* 🔐 [**Authentication & Security Architecture**](docs/authentication.md) — Dual-token JWT/Cookie mechanics, Role-Based Access Control (RBAC), password security, rate limiting, and security controls.

### 🏛️ Architectural Decision Records (ADRs)

* 📄 [**ADR 0001: Modular Monolith Architecture**](docs/adr/0001-modular-monolith-architecture.md) — Rationale for choosing a Modular Monolith over microservices.
* 📄 [**ADR 0002: Atomic Inventory Reservation**](docs/adr/0002-atomic-inventory-reservation.md) — Preventing inventory overselling via atomic database queries.
* 📄 [**ADR 0003: Webhook-Driven Payment Fulfillment**](docs/adr/0003-webhook-driven-payment-fulfillment.md) — Asynchronous payment validation & secure order placement.
* 📄 [**ADR 0004: Idempotency Key Implementation**](docs/adr/0004-idempotency-key-implementation.md) — Preventing duplicate charges and order retries.

---

## 🛠️ Monorepo Structure

```
.
├── apps/
│   ├── api/             # Express API Server (Node.js + Express + Mongoose)
│   └── web/             # Next.js Web Application (App Router + Redux Toolkit)
├── packages/            # Shared TypeScript packages & configs
├── docs/                # Architecture & System Design Documentation
├── pnpm-workspace.yaml  # Workspace package configuration
└── package.json         # Root scripts & dependencies
```

---

## 🚀 Getting Started

### Workspace Setup

```bash
# Install all dependencies across monorepo packages
pnpm install

# Run development servers concurrently (Next.js web + Express API)
pnpm dev
```