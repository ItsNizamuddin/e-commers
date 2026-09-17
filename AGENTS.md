# Project Coding Rules — MERN + TypeScript E-commerce

## 1. Core Principle

Write the simplest production-ready solution that satisfies the requirement.

Optimize for:

1. Correctness
2. Security
3. Maintainability
4. Existing architecture consistency
5. Performance
6. Minimal code

Do NOT optimize for line count alone.

Every added line, function, class, abstraction, validation, dependency, and file must have a meaningful reason to exist.

---

## 2. Before Writing Code

Before implementing any task:

* Inspect the relevant existing files.
* Search the codebase for similar functionality.
* Identify existing services, utilities, validators, middleware, types, repositories, and helpers.
* Reuse existing implementations whenever possible.
* Follow the existing project architecture and naming conventions.
* Do not create a new abstraction if an existing abstraction already solves the problem.

Do not start coding immediately when the repository already contains relevant functionality.

---

## 3. Minimal Implementation

Always prefer the smallest clean implementation.

Avoid:

* unnecessary wrapper functions
* unnecessary classes
* unnecessary interfaces
* unnecessary types
* unnecessary variables
* unnecessary constants
* unnecessary comments
* unnecessary validation
* duplicate error handling
* duplicate business logic
* unnecessary configuration
* unnecessary files
* unnecessary dependencies

If existing code can be modified in 5 lines instead of creating a new 30-line abstraction, modify the existing code.

Do not create abstractions merely because they appear "cleaner."

Create an abstraction only when it provides real reuse, separation of responsibility, or architectural value.

---

## 4. Do Not Over-Engineer

Do NOT introduce:

* factories
* strategies
* adapters
* repositories
* managers
* wrappers
* generic utility layers
* event systems
* additional queues
* additional database collections

unless the existing architecture or requirement genuinely needs them.

Avoid speculative architecture.

Implement the requirement that exists today.

Do not build infrastructure for hypothetical future requirements.

---

## 5. Existing Architecture Has Priority

Before adding code, determine whether the project already has:

* controllers
* services
* repositories
* models
* validators
* middleware
* error handlers
* response helpers
* logging utilities
* authentication utilities
* authorization utilities
* database helpers
* queue helpers
* caching helpers
* common types

Reuse them.

Do not introduce a second implementation of something that already exists.

---

# 6. TypeScript Rules

Use TypeScript strictly.

Prefer:

```typescript
const
```

and:

```typescript
type
```

or:

```typescript
interface
```

when appropriate.

Avoid:

```typescript
any
```

unless there is a documented and unavoidable reason.

Do not create types that are only used once unless they significantly improve readability or type safety.

Prefer inferred types when TypeScript can clearly infer the type.

Avoid unnecessary type assertions:

```typescript
as SomeType
```

Do not silence TypeScript errors just to make the build pass.

Fix the underlying type problem.

---

# 7. Express / API Rules

Follow the existing API architecture.

Controllers should remain thin.

Prefer:

```text
Controller
    ↓
Service
    ↓
Database / External Service
```

Do not put large business-logic blocks directly inside controllers.

Do not create a service layer for trivial logic if the project already has an established pattern that handles it appropriately.

Reuse existing:

* authentication middleware
* authorization middleware
* validation middleware
* error middleware
* response formatting

Do not manually duplicate these mechanisms.

---

# 8. MongoDB / Mongoose Rules

Use MongoDB queries efficiently.

Prefer targeted queries:

```typescript
findOne({ _id: id })
```

over loading unnecessary documents.

Select only required fields when appropriate.

Avoid:

```typescript
find()
```

when only one document is required.

Avoid loading an entire document when an atomic update can solve the problem.

Prefer atomic operations when appropriate:

```typescript
findOneAndUpdate()
updateOne()
updateMany()
```

Do not perform:

```text
read
→ modify in memory
→ write
```

when the operation can safely be done atomically.

Always consider:

* indexes
* query selectivity
* document size
* concurrency
* atomicity

before writing database-heavy code.

Do not add indexes blindly.

If a new query pattern is introduced, check whether an appropriate index already exists.

---

# 9. Transactions

Use MongoDB transactions only when multiple database operations must succeed or fail together.

Do NOT wrap every database operation in a transaction.

Before introducing a transaction:

1. Determine whether atomic update operators are sufficient.
2. Determine whether the operation spans multiple collections/documents.
3. Check existing transaction utilities.
4. Follow the project's transaction pattern.

Reuse existing session/transaction helpers.

Do not create a new transaction abstraction unless necessary.

---

# 10. Idempotency

For operations that may be retried, duplicated, or triggered multiple times, consider idempotency.

Examples:

* payments
* order creation
* refunds
* inventory updates
* external API calls
* queue jobs
* webhook processing

Before implementing idempotency:

* search for an existing idempotency mechanism
* reuse existing keys/storage
* avoid creating a second idempotency system

Idempotency logic must be atomic where required.

Do not assume a request is executed only once.

---

# 11. BullMQ / Redis Rules

Use BullMQ only for work that benefits from asynchronous processing.

Good examples:

* email
* notifications
* heavy processing
* scheduled jobs
* external integrations
* retryable background work

Do not put simple synchronous business logic into a queue unnecessarily.

Before creating a queue:

* check whether an existing queue handles the same domain
* reuse existing Redis configuration
* reuse existing job patterns
* use deterministic job IDs where appropriate
* make jobs idempotent when retries can occur

Do not create one queue per function.

Prefer domain-level queues where the existing architecture supports them.

---

# 12. Transactional Outbox

When an operation requires reliable event publishing together with database state changes, use the existing transactional outbox implementation.

Do not directly perform:

```text
Database transaction
+
external event/message
```

without considering failure between those operations.

If the project already has an outbox implementation:

* reuse it
* follow existing event schemas
* follow existing retry behavior
* do not create a parallel event-publishing mechanism

---

# 13. Food / Expiry / FEFO Logic

For inventory involving expiry-sensitive products:

* never assume FIFO is equivalent to FEFO
* use expiry date when determining allocation
* preserve existing inventory lifecycle rules
* do not duplicate expiry calculations
* reuse existing inventory services

FEFO means:

```text
First Expired → First Out
```

Do not introduce expiry behavior in controllers.

Keep inventory business rules inside the appropriate domain/service layer.

---

# 14. Validation

Validate at the appropriate boundary.

Use the project's existing validation library and patterns.

Do not duplicate the same validation in:

```text
controller
+
service
+
model
```

unless each layer has a distinct responsibility.

Do not add defensive validation for impossible internal states merely because an AI model suggested it.

Validate:

* user input
* external input
* security-sensitive values
* domain invariants where necessary

Avoid pointless checks.

---

# 15. Error Handling

Use the existing error-handling architecture.

Do not create custom error handling for every function.

Prefer the project's existing:

```text
AppError
ErrorHandler
HTTP error mapping
```

or equivalent.

Do not wrap every line in:

```typescript
try/catch
```

if centralized error handling already exists.

Only catch errors when you can meaningfully:

* recover
* transform
* add context
* perform cleanup
* change the control flow

Otherwise allow the existing error middleware to handle them.

---

# 16. Security

Never trust:

* request body
* query parameters
* URL parameters
* headers
* client-provided roles
* client-provided prices
* client-provided permissions
* client-provided inventory state

Business-critical values must come from trusted server-side sources.

Never expose:

* passwords
* secrets
* tokens
* internal credentials
* sensitive database fields

Do not log secrets or sensitive user information.

Follow existing authentication and authorization middleware.

Do not bypass authorization simply because an endpoint is internal.

---

# 17. Performance

Before optimizing, identify the actual bottleneck.

Avoid premature optimization.

Watch for:

* N+1 database queries
* unnecessary database calls
* loading large documents
* repeated API calls
* unnecessary loops
* sequential calls that could safely run concurrently
* missing indexes
* excessive Redis operations
* unnecessary LLM calls

Prefer:

```typescript
Promise.all()
```

when operations are genuinely independent and running them concurrently is safe.

Do NOT use concurrency when operations depend on each other or when it could create race conditions.

---

# 18. AI / LLM Code

When implementing AI functionality:

Do not call the LLM when deterministic code can solve the problem.

Use LLMs for:

* natural-language understanding
* classification
* summarization
* extraction
* semantic search
* content generation
* reasoning
* tool selection

Use normal backend logic for:

* prices
* inventory
* permissions
* payment calculations
* order totals
* refunds
* business rules
* database mutations

LLM output must never automatically override deterministic business rules.

The architecture should generally be:

```text
User
 ↓
LLM
 ↓
Structured intent/tool call
 ↓
Backend validation
 ↓
Business logic
 ↓
Database/API
```

Never blindly trust LLM output.

Validate structured LLM responses before using them.

---

# 19. AI Prompt Rules

Do not create unnecessarily large prompts.

Include only relevant context.

Avoid sending:

* entire database documents
* unnecessary conversation history
* unnecessary system information
* duplicate context

Prefer structured output when the backend needs machine-readable data.

Example:

```json
{
  "intent": "SEARCH_PRODUCT",
  "filters": {
    "category": "shoes",
    "maxPrice": 5000
  }
}
```

Do not parse fragile natural-language responses when structured output is available.

---

# 20. RAG Rules

For RAG:

```text
Documents
 ↓
Chunking
 ↓
Embeddings
 ↓
Vector Search
 ↓
Relevant Context
 ↓
LLM
```

Retrieve only relevant context.

Do not send the entire knowledge base to the LLM.

Reuse existing embedding/vector-search infrastructure if available.

Do not introduce a vector database without first checking whether the existing database supports the required vector-search functionality.

---

# 21. Testing

Before claiming a task is complete:

1. Run relevant tests.
2. Add tests for new business logic.
3. Test important edge cases.
4. Run lint/type checking where applicable.

Do not write tests merely to increase coverage numbers.

Tests should verify behavior.

For bug fixes, add a regression test whenever practical.

---

# 22. Do Not Modify Unrelated Code

When solving a task:

* modify only relevant files
* do not refactor unrelated code
* do not rename unrelated variables
* do not reformat entire files unnecessarily
* do not upgrade dependencies unless required
* do not change architecture unnecessarily

Keep the Git diff small.

---

# 23. Final Diff Review

After implementation, ALWAYS review the final diff.

For every added block ask:

* Is this required?
* Does existing code already do this?
* Can this be removed?
* Can this be simplified?
* Does this introduce duplication?
* Does this introduce unnecessary abstraction?
* Does this change unrelated behavior?

Remove unnecessary code before finishing.

The final diff should contain only changes required for the task.

---

# 24. Completion Checklist

Before saying "done", verify:

```text
[ ] Existing implementation searched
[ ] Existing utilities reused
[ ] No duplicate business logic
[ ] No unnecessary abstraction
[ ] No unnecessary files
[ ] No unnecessary dependencies
[ ] No unnecessary validation
[ ] No unnecessary try/catch
[ ] No unrelated refactoring
[ ] TypeScript types are correct
[ ] Database queries are appropriate
[ ] Security rules are preserved
[ ] Relevant tests pass
[ ] Lint/typecheck passes
[ ] Final Git diff reviewed
[ ] Unnecessary lines removed
```

Only after this review should the task be considered complete.

---

# 25. AI Agent Behavior

Do not generate code immediately.

First understand the repository.

When requirements are ambiguous:

* inspect existing patterns
* infer from established architecture when safe
* ask only when the ambiguity materially affects implementation

Do not invent requirements.

Do not create functionality that was not requested.

Do not explain hypothetical architecture unless it is relevant to the task.

Prefer implementation over unnecessary discussion.

When there are multiple valid implementations, choose the simplest one consistent with the existing architecture.

---

# Golden Rule

Before adding code, ask:

> "Does this project already have something that does this?"

Before creating an abstraction, ask:

> "Will this abstraction actually be reused?"

Before adding a line, ask:

> "Is this line necessary for correctness, security, maintainability, or performance?"

Before finishing, ask:

> "Can I remove anything without changing the required behavior?"

If yes, remove it.
