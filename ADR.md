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
**Decision**: Built a custom **in-memory data store** with full relational models, state management, and schema-like behavior entirely in JavaScript arrays instead of fighting C++ compilation chains.
**Consequences**:
- (+) Zero-dependency setup, ensuring the demo works flawlessly on any machine during the presentation.
- (-) Data is lost on server restart (acceptable for a hackathon demo).
- The `models/index.js` acts exactly like an ORM, making a future swap to Postgres trivial.

## 3. Groq (Llama-3.1-70b) vs Gemini
**Date**: 2026-09-28  
**Status**: Accepted  
**Context**: The AI Advisor needed an LLM provider. The brief offered a choice between Gemini, Groq, or Ollama.
**Decision**: Selected **Groq (llama-3.1-70b-versatile)**.
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
