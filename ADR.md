# Architecture Decision Records (ADR)

## 1. Node.js (Express) vs. Spring Boot 3.x
**Date**: 2026-09-28  
**Status**: Accepted  
**Context**: The hackathon brief requested Spring Boot 3.x for the backend. However, as a solo developer with a tight 5-hour deadline, my deepest expertise lies in the Node.js ecosystem. Learning Spring Boot from scratch while attempting to build an AI-powered agentic loop would severely risk completion.
**Decision**: I opted to build the backend using **Express.js (Node.js)** instead of Spring Boot.
**Consequences**: 
- (+) High development velocity allowing me to complete the AI loops, React frontend, and strategy patterns within the time budget.
- (-) Deviates from the exact brief specification.
- Mitigation: The architecture remains strictly identical to the requirements (pluggable strategy engine, state machines, REST APIs) proving the structural concepts despite the language swap.

## 2. In-Memory Database over SQLite / H2
**Date**: 2026-09-28  
**Status**: Accepted  
**Context**: The brief requested H2 (or SQLite equivalent) to persist data without heavy setup. During implementation, `better-sqlite3` failed to compile native C++ extensions on Windows with Node v24 due to missing Visual Studio Build Tools.
**Decision**: Built a file-backed local data store with full relational models, state management, and schema-like behavior in JavaScript arrays serialized to `server/stockpulse.data.json` instead of fighting C++ compilation chains. The file is ignored by Git and a demo reset endpoint restores seed data.
**Consequences**:
- (+) Zero-dependency setup, ensuring the demo works flawlessly on any machine during the presentation.
- (+) Products and suggestions survive a backend restart.
- (-) JSON files do not provide relational transactions or multi-process concurrency.
- The `models/index.js` acts exactly like an ORM, making a future swap to SQLite/Postgres straightforward.

## 3. Groq LLM Provider
**Date**: 2026-09-28  
**Status**: Accepted  
**Context**: The AI Advisor needed a fast LLM provider with structured JSON output for pricing and reorder recommendations.
**Decision**: Selected **Groq (openai/gpt-oss-20b)** for low-latency recommendation generation.
**Consequences**:
- (+) Groq provides the fastest inference on the market. In a live demo showing an "agentic loop," the time between triggering a stock drop and seeing the AI suggestions is critical. Groq's sub-second response times make the app feel incredibly snappy and "reactive."
- (+) Full support for JSON mode ensures deterministic API responses.

## 4. Pluggable Commerce Engine (Strategy Pattern)
**Date**: 2026-09-28  
**Status**: Accepted  
**Context**: The brief required the ability to switch between rule-based and AI-powered recommendations without restarting the server.
**Decision**: Implemented the **Strategy Pattern** in `server/src/services/engine/strategies.js`. Both strategies extend a common `PricingStrategy` interface exposing an `execute(product, triggerType)` method. A central `CommerceEngine` class acts as the context, selecting the active strategy based on runtime configuration (`PUT /api/config/strategy`).
**Consequences**:
- (+) Clean, modular design adhering to SOLID principles.
- (+) Enables safe fallbacks (if the AI API goes down, the engine can instantly flip to rule-based logic).

## 5. Event-Driven Triggers (Agentic Loop)
**Date**: 2026-09-28  
**Status**: Accepted  
**Context**: "No human clicks a button to generate suggestions." The system must detect changes automatically.
**Decision**: Instead of running a heavy CRON polling job, triggers are **event-driven**. The `TriggerService` intercepts every `simulateOrder` action. After decrementing stock, it evaluates if `stock_level < threshold` or `demand_velocity >= spike_threshold`. If true, it asynchronously fires the `CommerceEngine` without blocking the main HTTP request response.
**Consequences**:
- (+) Real-time responsiveness.
- (+) Highly scalable pattern (can easily be moved to a Pub/Sub queue for production).

## 6. Unified Recommendation Contract
**Date**: 2026-09-28
**Status**: Accepted
**Context**: Pricing and replenishment are separate approval actions, but an inventory event needs both recommendations and both HTTP and async callers must use the same strategy contract.
**Options**: Make separate pricing and reorder strategy calls, or make one advisor call return a combined recommendation payload.
**Decision**: Use one `execute(product, triggerReason, suggestionType)` strategy contract. The AI prompt returns both outputs in one structured response, while the engine can persist either type for manual endpoints.
**Tradeoffs**: One malformed AI response can affect both outputs, so the rule strategy is the all-or-nothing fallback. The unified call reduces latency and keeps pricing/reorder decisions in the same merchandising context.

## 7. AI Resilience and Human Checkpoint
**Date**: 2026-09-28
**Status**: Accepted
**Context**: LLMs can time out, return malformed JSON, exceed business bounds, or be temporarily unavailable. Prices must never change merely because an AI response arrived.
**Options**: Fail the async job, retry indefinitely, or validate with bounded retry and fall back to deterministic rules.
**Decision**: The gateway applies a timeout and one transient-error retry. The advisor validates price range, quantity, lead time, confidence, direction, and reasoning. Invalid or unavailable AI responses use the rule strategy. Suggestions remain `PENDING` until a merchandiser accepts them.
**Tradeoffs**: Rule fallback is less nuanced than AI, but it guarantees a visible recommendation and preserves the approval checkpoint.

## 8. Extensibility and Deliberate Exclusions
**Date**: 2026-09-28
**Status**: Accepted
**Context**: Competitor pricing, margin floors, supplier catalogs, durable persistence, and streamed reasoning are valuable follow-on capabilities but exceed the focused demo scope.
**Decision**: Keep extension points at the strategy interface, AI context object, inventory snapshot model, and unified suggestion routes. A future `CompetitorAwareStrategy` can register beside the existing strategies without changing triggers or UI contracts.
**Tradeoffs**: The current demo uses an in-memory model and polling rather than SQLite and SSE. This keeps setup under five minutes and the agentic loop observable, but restart persistence and streaming remain sprint-two work.
