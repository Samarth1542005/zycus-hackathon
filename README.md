# StockPulse

## AI Inventory and Dynamic Pricing for ShopStream

StockPulse is a reactive merchandising console for an online store. It watches inventory and demand signals, automatically generates pricing and replenishment recommendations, and keeps a merchandiser in control of every live change.

The system is designed around one practical question:

> When a product starts selling faster than expected, how quickly can a merchandiser understand the risk and act on it?

StockPulse turns that question into an observable workflow:

```text
Order received
		-> stock and demand velocity update
		-> trigger detected
		-> AI recommends price and reorder quantity
		-> merchandiser reviews reasoning and confidence
		-> accept or reject
		-> price or inventory changes
```

## Why It Matters

Manual pricing and replenishment reviews are slow, inconsistent, and easy to miss. StockPulse brings the signal, recommendation, and approval checkpoint into one operational view.

The system does not silently publish AI decisions. It recommends, explains, validates, and waits for human approval.

## What the Demo Shows

- Low-stock detection after a simulated order
- Demand-spike detection from a burst of sales
- Separate pricing and reorder recommendations from one AI analysis
- Groq AI reasoning with confidence scores
- Rule-based fallback when AI is unavailable or invalid
- Human accept/reject checkpoint
- Price update after pricing approval
- Simulated inbound stock after reorder approval
- Runtime switching between AI and rule-based strategies
- Persistent local demo state and a one-command reset
- Stock health, margin floor, and price-history signals in the catalog

## Product Walkthrough

### Low inventory

`PRD-003` starts with stock below its reorder threshold. Simulate an order and the system queues both pricing and reorder suggestions.

### Demand spike

Reset the demo, then use `PRD-008` and simulate a five-unit demand burst. The order crosses the velocity threshold and generates suggestions marked `DEMAND_SPIKE`.

### Human approval

Accepting a pricing suggestion changes the live product price. Accepting a reorder suggestion increases stock. Rejecting either suggestion leaves the live business value unchanged.

## Architecture

```text
React merchandising console
					|
					v
Express REST API
					|
					+--> Trigger service
					|       |
					|       +--> Commerce engine
					|               |
					|               +--> Rule-based strategy
					|               +--> Groq AI strategy
					|
					+--> Product and suggestion models
									|
									+--> Durable local JSON store
```

### Commerce engine

The engine exposes one strategy contract to both HTTP requests and asynchronous trigger paths. Strategies can be switched at runtime:

- `rule-based`: deterministic pricing and reorder rules
- `ai`: Groq recommendation with validation and rule fallback

### AI resilience

The AI advisor:

- Uses genuinely different prompts for low inventory and demand spikes
- Includes product, price, cost, margin floor, stock, threshold, velocity, and category context
- Requires structured JSON output
- Validates price bounds, margin floor, quantity, lead time, confidence, direction, and reasoning
- Retries transient provider failures once
- Falls back to deterministic rules when the provider fails

### Persistence

The active demo uses a durable local JSON store at `server/stockpulse.data.json`. The file is ignored by Git, survives backend restarts, and keeps the project dependency-free on Windows. The persistence boundary is isolated in `server/src/models/index.js` so it can be replaced with SQLite or Postgres without changing the API or strategy contracts.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | Node.js, Express.js |
| Frontend | React, Vite |
| AI | Groq OpenAI-compatible API |
| Storage | Durable local JSON store |
| Styling | Vanilla CSS |
| Testing | Node built-in test runner and backend smoke tests |

## Quick Start

Requirements: Node.js 18 or newer and a Groq API key.

### 1. Configure the backend

```powershell
cd "c:\Zycus Hack\server"
Copy-Item .env.example .env
notepad .env
```

Set the key in `server/.env`:

```env
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
LLM_MODEL=openai/gpt-oss-20b
PORT=3001
STRATEGY=ai
```

Never commit `server/.env` or place a real key in `.env.example`.

### 2. Start the backend

```powershell
cd "c:\Zycus Hack\server"
npm.cmd install
npm.cmd run dev
```

The API runs at `http://localhost:3001`.

### 3. Start the frontend

Open a second PowerShell terminal:

```powershell
cd "c:\Zycus Hack\client"
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`.

PowerShell users can use `npm.cmd` if the regular `npm` command is blocked by execution policy.

## API Surface

### Products and triggers

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/products` | List products, optionally filtered by category or status |
| `GET` | `/api/products/:id` | Get one product |
| `POST` | `/api/products/:id/orders` | Simulate a sale and evaluate triggers |
| `PATCH` | `/api/products/:id/stock` | Adjust stock and evaluate triggers |
| `POST` | `/api/products/:id/suggest-pricing` | Request a pricing recommendation |
| `POST` | `/api/products/:id/suggest-reorder` | Request a reorder recommendation |
| `POST` | `/api/products/demo/reset` | Restore seed products and clear demo state |

### Suggestions and configuration

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/suggestions/pending` | List all pending suggestions |
| `PATCH` | `/api/suggestions/pricing/:id/accept` | Accept a pricing suggestion |
| `PATCH` | `/api/suggestions/reorder/:id/reject` | Reject a reorder suggestion |
| `GET` | `/api/config/strategy` | Read the active strategy |
| `PUT` | `/api/config/strategy` | Switch between `ai` and `rule-based` |
| `GET` | `/api/health` | Check service health |

## Demo Commands

Check the service:

```powershell
Invoke-RestMethod http://localhost:3001/api/health
```

Trigger low inventory:

```powershell
Invoke-RestMethod `
	-Method Post `
	-Uri "http://localhost:3001/api/products/PRD-003/orders" `
	-ContentType "application/json" `
	-Body '{"quantity":1}'
```

Reset the demo:

```powershell
Invoke-RestMethod `
	-Method Post `
	-Uri "http://localhost:3001/api/products/demo/reset"
```

## Quality Checks

Backend tests:

```powershell
cd "c:\Zycus Hack\server"
npm.cmd test
```

The suite covers health and catalog routes, invalid input, trigger-generated suggestions, persistence reset, and demand-spike behavior.

Frontend build and lint:

```powershell
cd "c:\Zycus Hack\client"
npm.cmd run build
npm.cmd run lint
```

## Deploying to Render and Vercel

The repository includes [render.yaml](render.yaml) for the Express API.

### Backend on Render

1. Create a new Render Blueprint from this repository.
2. Render will detect `render.yaml` and create `stockpulse-api`.
3. Add `GROQ_API_KEY` as a secret in the Render service settings.
4. Set `CLIENT_ORIGIN` to the final Vercel URL, for example `https://stockpulse.vercel.app`.
5. Confirm `GET /api/health` returns `{ "status": "OK" }`.

The local JSON store is durable on a development machine, but Render's default filesystem is ephemeral. Use a persistent disk or external database before treating the deployed store as production data.

### Frontend on Vercel

1. Import the same repository into Vercel.
2. Set the project root directory to `client`.
3. Add the environment variable `VITE_API_BASE` with the Render API URL ending in `/api`.
4. Use Vite's detected build settings, or set the build command to `npm run build`.
5. Open the generated Vercel URL and trigger a demo order.

The client environment template is available at `client/.env.example`.

## Repository Guide

- [PROJECT_BRIEF.md](PROJECT_BRIEF.md) - problem statement and intended scope
- [ADR.md](ADR.md) - architecture decisions, tradeoffs, and extension points
- [RUNBOOK.md](RUNBOOK.md) - complete setup, demo, reset, and troubleshooting guide
- [server/src/services/engine/strategies.js](server/src/services/engine/strategies.js) - pluggable commerce strategies
- [server/src/services/triggers/index.js](server/src/services/triggers/index.js) - event-driven recommendation loop
- [server/src/services/ai/advisor.js](server/src/services/ai/advisor.js) - prompts and AI validation

## Deliberate Scope Decisions

This submission prioritizes the reactive commerce loop, AI resilience, human approval, and a working merchandising console. Spring Boot migration and SSE token streaming are intentionally outside the current implementation scope. The Express choice, local persistence tradeoff, and extension path are documented in [ADR.md](ADR.md).

## License

Built for the Zycus Hackathon.
