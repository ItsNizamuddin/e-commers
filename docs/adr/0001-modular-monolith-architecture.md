# ADR 0001: Modular Monolith Architecture

* **Status**: Accepted
* **Date**: 2026-08-30
* **Deciders**: ShopSphere Engineering Team

---

## Context and Problem Statement

ShopSphere is an e-commerce platform designed to scale from initial launch to 100,000+ active users. When designing the backend architecture, we must choose between a **Microservices Architecture** and a **Monolithic Architecture**.

Microservices are often advocated for enterprise e-commerce platforms. However, they introduce significant upfront operational complexity, network latency, distributed tracing demands, complex saga patterns for transactions, and multi-pipeline deployment friction.

## Decision Drivers

* **Team Velocity**: Desire to ship feature iterations rapidly without maintaining dozens of microservice repositories.
* **Operational Simplicity**: Avoiding service mesh setup, distributed tracing overhead, message bus maintenance, and container orchestration overhead early on.
* **Data Consistency**: Requiring ACID transactional integrity across Order, Payment, and Inventory state transitions.
* **Future Scalability**: Preserving the ability to extract specific domain modules into standalone microservices if traffic scales past single-monolith limits.

## Considered Options

1. **Microservices Architecture** (Separate Auth, Products, Orders, Inventory, Payment microservices).
2. **Standard Layered Monolith** (Single monolithic codebase without strict internal boundary isolation).
3. **Modular Monolith Architecture** (Single backend application with strict internal domain module encapsulation).

## Decision Outcome

Chosen Option: **Option 3 — Modular Monolith Architecture**.

ShopSphere will be built as a single Express API application partitioned into **14 explicit domain modules** (`Auth`, `Users`, `Products`, `Categories`, `Search`, `Cart`, `Wishlist`, `Checkout`, `Payments`, `Orders`, `Inventory`, `Reviews`, `Admin`).

### Positive Consequences
* **Zero Network Latency Between Modules**: Inter-module communication happens in-memory via service functions.
* **Simplified Operations**: Single CI/CD deployment pipeline, single database connection pool, single application process to monitor.
* **Strong Data Consistency**: Cross-module operations can run within single MongoDB multi-document transactions.
* **High Code Maintainability**: Strict domain boundaries ensure changes to `Products` will not break `Payments`.

### Negative Consequences
* Shared compute resources across modules (a memory leak in one module impacts the whole API instance).
* Requires disciplined enforcement of module boundaries to prevent tight coupling.

---

## Pros and Cons of Options

### Option 1: Microservices
* **Good**: Independent service deployments; isolated scaling per service.
* **Bad**: Network overhead, distributed data consistency issues, high deployment cost, complex local development.

### Option 2: Standard Layered Monolith
* **Good**: Fast setup time.
* **Bad**: Code quickly turns into an unmaintainable "spaghetti" codebase where domain concerns bleed together.

### Option 3: Modular Monolith (Chosen)
* **Good**: Combines operational simplicity of a monolith with clean architectural boundaries of microservices.
* **Bad**: Requires strict linting and code discipline to maintain encapsulation.
