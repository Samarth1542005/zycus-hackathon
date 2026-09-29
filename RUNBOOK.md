# StockPulse Runbook

This guide contains the commands needed to install, start, test, and demo the StockPulse project on Windows PowerShell.

## 1. Prerequisites

- Node.js 18 or newer
- npm
- A Groq API key for AI mode
- Two PowerShell terminals

Check Node and npm:

```powershell
node --version
npm.cmd --version
```

Use `npm.cmd` in PowerShell if the `npm` command is blocked by the execution policy.

## 2. Configure the Backend

From the repository root:

```powershell
cd "c:\Zycus Hack\server"
Copy-Item .env.example .env
notepad .env
```

Set these values in `server/.env`:

```env
LLM_PROVIDER=groq
GROQ_API_KEY=your_new_groq_api_key
LLM_MODEL=openai/gpt-oss-20b
PORT=3001
STRATEGY=ai
```

Never commit `server/.env` or paste the real key into `server/.env.example`.

## 3. Install Dependencies

Backend:

```powershell
cd "c:\Zycus Hack\server"
npm.cmd install
```

Frontend:

```powershell
cd "c:\Zycus Hack\client"
npm.cmd install
```

## 4. Start the Backend

Open PowerShell terminal 1:

```powershell
cd "c:\Zycus Hack\server"
npm.cmd run dev
```

The API runs at `http://localhost:3001`.

For a production-style start:

```powershell
npm.cmd start
```

## 5. Start the Frontend

Open PowerShell terminal 2:

```powershell
cd "c:\Zycus Hack\client"
npm.cmd run dev
```

Open the dashboard at `http://localhost:5173`.

## 6. Smoke Test the API

Run these commands from any PowerShell terminal while the backend is running:

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/health"
Invoke-RestMethod -Uri "http://localhost:3001/api/products"
Invoke-RestMethod -Uri "http://localhost:3001/api/config/strategy"
```

Expected results:

- Health status is `OK`.
- Eight seeded products are returned.
- The configured strategy is `ai` or `rule-based`.

## 7. Test the Recommendation Loop

Trigger a low-inventory order:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3001/api/products/PRD-003/orders" `
  -ContentType "application/json" `
  -Body '{"quantity":1}'
```

Check pending pricing suggestions:

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/pricing-suggestions/pending"
```

Check pending reorder suggestions:

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/reorder-suggestions/pending"
```

The dashboard should show pricing and reorder recommendations for the affected product.

## 8. Demo Through the Browser

1. Open `http://localhost:5173`.
2. Find a product in the Product Inventory panel.
3. Click **Simulate 1 Order**.
4. Wait for the pending suggestion to appear.
5. Review the trigger, reasoning, confidence, and recommendation.
6. Click **Accept** or **Reject**.
7. Confirm the product status and stock or price update.

For a demand-spike demonstration, click **Simulate Demand Spike (5)** on a product with available stock.

The deterministic backend smoke test for this path is:

```powershell
cd "c:\Zycus Hack\server"
npm.cmd test
```

It resets in-memory state for the process, simulates five units on `PRD-008`, and verifies a `DEMAND_SPIKE` pricing/reorder pair plus an inventory snapshot.

## 9. Switch Strategies at Runtime

Switch to rule-based recommendations:

```powershell
Invoke-RestMethod `
  -Method Put `
  -Uri "http://localhost:3001/api/config/strategy" `
  -ContentType "application/json" `
  -Body '{"strategy":"rule-based"}'
```

Switch back to AI recommendations:

```powershell
Invoke-RestMethod `
  -Method Put `
  -Uri "http://localhost:3001/api/config/strategy" `
  -ContentType "application/json" `
  -Body '{"strategy":"ai"}'
```

Verify the active strategy:

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/config/strategy"
```

AI-generated cards display the `AI` badge. Rule-based cards display the `Rule` badge. If AI fails, the system falls back to rule-based recommendations.

## 10. Frontend Checks

Build the frontend:

```powershell
cd "c:\Zycus Hack\client"
npm.cmd run build
```

Run the frontend linter:

```powershell
npm.cmd run lint
```

## 11. Backend Syntax Checks

```powershell
cd "c:\Zycus Hack\server"
node --check src/index.js
node --check src/services/ai/advisor.js
node --check src/services/ai/llmGateway.js
node --check src/services/engine/index.js
node --check src/services/triggers/index.js
```

## 12. Troubleshooting

### `npm` is blocked in PowerShell

Use `npm.cmd` instead of `npm`:

```powershell
npm.cmd install
npm.cmd run dev
```

### The dashboard cannot reach the API

Confirm the backend is running on port 3001 and open:

```text
http://localhost:3001/api/health
```

### Suggestions show the Rule badge in AI mode

Check `server/.env`:

```env
LLM_PROVIDER=groq
STRATEGY=ai
LLM_MODEL=openai/gpt-oss-20b
```

Then restart the backend. Rule-based output can also mean Groq failed and the configured fallback was used; inspect the backend terminal logs.

### Port 3001 or 5173 is already in use

Stop the existing development server with `Ctrl+C`, or change `PORT` for the backend. Vite can be started on another port:

```powershell
npm.cmd run dev -- --port 5174
```

### Stop the project

In each running terminal, press:

```text
Ctrl+C
```

## 13. Reset Demo State

The application persists local demo data in an ignored JSON file. Reset it through the API:

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:3001/api/products/demo/reset"
```

Restarting the backend no longer resets state automatically.

## 14. Project Entry Points

- Backend entry: `server/src/index.js`
- AI advisor: `server/src/services/ai/advisor.js`
- LLM gateway: `server/src/services/ai/llmGateway.js`
- Commerce strategies: `server/src/services/engine/strategies.js`
- Trigger loop: `server/src/services/triggers/index.js`
- React dashboard: `client/src/components/Dashboard.jsx`
- Architecture decisions: `ADR.md`
