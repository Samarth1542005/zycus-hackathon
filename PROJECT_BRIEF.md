# StockPulse — Project Brief

> **Hackathon**: Zycus Hackathon · Solo · 5 hours · 118 pts total  
> **Team**: Samarth (Individual)  
> **Repo**: https://github.com/Samarth1542005/zycus-hackathon

---

## 🎯 The Problem

**ShopStream** is an online store selling electronics, apparel, and home goods (hundreds of SKUs).  
Today, everything about pricing and restocking is **manual and slow**:

| What Happens | How It's Handled Today | What Goes Wrong |
|---|---|---|
| Product sells faster than expected | Someone notices in a spreadsheet | Stock runs out while price stays flat |
| Viral product demand spike | Slack message → email debate → manual price change | Slow, inconsistent, often missed |
| Stock drops critically low | Someone manually decides: raise price? discount? reorder? | Fails silently when no one is watching |

**The core issue**: There's no automated system that detects inventory/demand signals and recommends pricing + reorder actions in real time.

---

## ✅ What We're Building

A **reactive commerce advisor** — an intelligent system that:

1. **DETECTS** when stock drops below a threshold or demand velocity spikes
2. **GENERATES** AI-powered pricing and reorder recommendations automatically
3. **PRESENTS** those recommendations to merchandisers for approval
4. **APPLIES** changes when the merchandiser accepts

### The Core Loop (Everything Revolves Around This)

```
📦 Order comes in
    ↓
📉 Stock level decreases
    ↓
⚡ TRIGGER CHECK: Is stock < threshold? Is demand velocity spiking?
    ↓ YES
🤖 AI Advisor generates:
    → PricingSuggestion (new price + reasoning + confidence)
    → ReorderSuggestion (reorder qty + reasoning + confidence)
    ↓
👤 Merchandiser sees suggestions in dashboard
    ↓
✅ Accept → price updates, reorder logged
❌ Reject → suggestion dismissed
```

---

## 🏗️ The 6 Things We Must Deliver

### 1. Domain Model (Database Entities)
Four core entities with state machines:

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| **Product** | The SKU being tracked | sku, name, category, currentPrice, stockLevel, reorderThreshold, demandVelocity, status |
| **InventorySnapshot** | Point-in-time stock record | productId, stockLevel, demandVelocity, timestamp |
| **PricingSuggestion** | AI-recommended price change | productId, currentPrice, suggestedPrice, confidence, reasoning, triggerType, status (PENDING→ACCEPTED/REJECTED) |
| **ReorderSuggestion** | AI-recommended restock | productId, currentStock, suggestedQuantity, confidence, reasoning, triggerType, status (PENDING→ACCEPTED/REJECTED) |

**Product Status State Machine:**
```
ACTIVE → PRICE_REVIEW_PENDING → ACTIVE
ACTIVE → LOW_STOCK → OUT_OF_STOCK
OUT_OF_STOCK → ACTIVE (after restock)
```

**Suggestion Status State Machine:**
```
PENDING → ACCEPTED
PENDING → REJECTED
```

### 2. Commerce Engine (Pluggable Strategy)
A strategy interface with two implementations switchable at runtime:

- **Rule-Based Strategy**: Simple math (e.g., stock < 20% of threshold → raise price 10%)
- **AI-Powered Strategy**: LLM analyzes context and returns nuanced recommendation

The system can switch between them via config/env variable — no restart needed.

### 3. AI Commerce Advisor (LLM Integration)
The LLM receives product context and returns structured recommendations:

**Input to LLM:**
- Product name, category, current price
- Stock level, reorder threshold
- Demand velocity (units sold per day)
- Trigger reason (LOW_STOCK or DEMAND_SPIKE)

**Output from LLM:**
- Recommended new price
- Recommended reorder quantity
- Confidence score (0.0 – 1.0)
- Plain-English reasoning merchandisers can read

### 4. Agentic Recommendation Loop (Auto-Trigger)
This is the "smart" part — **no human clicks a button** to generate suggestions:

- Every time an order is placed, the system checks:
  - Is `stockLevel < reorderThreshold`? → **LOW_STOCK trigger**
  - Has `demandVelocity` crossed a spike threshold? → **DEMAND_SPIKE trigger**
- If either triggers, the system **automatically queues** pricing + reorder suggestions

### 5. Merchandising Console (React UI)
A dashboard showing:

- **Pending suggestions** with AI reasoning
- **Accept / Reject** controls for each suggestion
- **Badges** distinguishing `AUTO_LOW_STOCK` vs `AUTO_DEMAND_SPIKE` vs `MANUAL`
- **Product overview** with current stock levels and statuses

### 6. ADR.md (Architecture Decision Records)
Document key decisions:
- Why Express over Spring Boot
- Database choice
- LLM provider choice
- Strategy pattern design
- How triggers work
- Error handling approach

---

## 🚫 What We're NOT Building

- ❌ Shopping cart / checkout / payments
- ❌ Product catalog CRUD (create/update/delete)
- ❌ Competitor price scraping
- ❌ Automated purchase orders
- ❌ User auth / login
- ❌ Full storefront UI

---

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | **Express.js** (Node.js) | Fast development, familiar ecosystem |
| Frontend | **React 18** (Vite) | Spec requirement, component-based UI |
| Database | **SQLite** (better-sqlite3) | Zero config, file-based, perfect for demo |
| AI/LLM | **Groq** (llama-3.1-70b) | Fastest inference, snappy demo |
| Styling | Vanilla CSS | Full control, no framework overhead |

---

## 🎮 Demo Scenarios (Must Work)

### Demo 1: Low Inventory Trigger
```
1. PRD-003 (Organic Cotton T-Shirt) has stock=8, threshold=15
2. POST /api/products/PRD-003/orders  (simulates an order)
3. Stock decreases → already below threshold
4. System auto-generates:
   → PricingSuggestion (raise price to protect remaining stock)
   → ReorderSuggestion (reorder X units)
5. Suggestions appear in UI with AI reasoning
6. Merchandiser clicks Accept → price updates
```

### Demo 2: Demand Spike Trigger
```
1. PRD-008 (Hoodie) has stock=11, threshold=12, velocity=15
2. POST multiple orders rapidly on PRD-008
3. Velocity crosses spike threshold
4. System auto-generates spike-triggered suggestions
5. UI shows suggestions with DEMAND_SPIKE badge
6. Merchandiser reviews and accepts/rejects
```

---

## 📁 Project Structure (Planned)

```
zycus-hackathon/
├── server/                    # Express.js backend
│   ├── src/
│   │   ├── models/            # SQLite schema & data access
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic
│   │   │   ├── engine/        # Commerce engine (strategy pattern)
│   │   │   ├── ai/            # LLM gateway & advisor
│   │   │   └── triggers/      # Auto-trigger detection
│   │   └── index.js           # Server entry point
│   ├── seed.sql               # Seed data
│   └── package.json
├── client/                    # React 18 frontend (Vite)
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── pages/             # Dashboard, suggestions
│   │   └── App.jsx
│   └── package.json
├── ADR.md                     # Architecture Decision Records
├── PROJECT_BRIEF.md           # This file
└── README.md                  # Setup & run instructions
```

---

## 🔌 API Endpoints (Planned)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/products` | List all products |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products/:id/orders` | Simulate an order (triggers stock check) |
| GET | `/api/suggestions` | List all suggestions (filterable by status) |
| GET | `/api/suggestions/pending` | Get pending suggestions only |
| PATCH | `/api/suggestions/:id/accept` | Accept a suggestion |
| PATCH | `/api/suggestions/:id/reject` | Reject a suggestion |
| POST | `/api/products/:id/analyze` | Manually trigger AI analysis |
| GET | `/api/config/strategy` | Get current strategy (rule-based vs AI) |
| PUT | `/api/config/strategy` | Switch strategy at runtime |

---

## ⏱️ Time Budget (5 Hours)

| Phase | Time | What |
|-------|------|------|
| Setup & Models | 45 min | Project scaffold, DB schema, seed data |
| Commerce Engine | 45 min | Strategy pattern, rule-based + AI implementations |
| AI Advisor + Triggers | 60 min | Groq integration, prompt engineering, auto-triggers |
| React Dashboard | 75 min | UI components, API integration, accept/reject flow |
| ADR + Polish | 30 min | Document decisions, error handling, edge cases |
| Demo Video | 15 min | Record 5-min walkthrough |
| **Buffer** | 30 min | Debugging, unexpected issues |

---

## 📋 Submission Checklist

- [ ] Public GitHub repo with all code
- [ ] 5-minute demo video (walkthrough of the core loop)
- [ ] ADR.md with architecture decisions
- [ ] Seed data loads on startup
- [ ] Both demo scenarios working (low stock + demand spike)
- [ ] Strategy switchable at runtime
- [ ] LLM API key NOT committed (env variable only)
- [ ] README with setup instructions

---

## 🏆 Scoring Focus (118 pts)

The judges care most about:
1. **The full loop works**: Order → trigger → AI suggestion → human approval → price update
2. **ADR quality**: Thoughtful decisions, not just "I used React because I like it"
3. **Strategy pattern**: Clean pluggable design, runtime switchable
4. **AI reasoning quality**: Suggestions make business sense with clear explanations
5. **Code you understand**: They'll walk through it with you — know every line
