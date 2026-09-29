# 🚀 StockPulse — AI Inventory & Dynamic Pricing

> Zycus Hackathon · Solo · Samarth

An intelligent commerce advisor that **automatically detects** low inventory and demand spikes, uses **AI to recommend** pricing and reorder actions, and lets merchandisers **approve with one click**.

## The Core Loop

```
📦 Order → 📉 Stock drops → ⚡ Auto-trigger → 🤖 AI suggests price + reorder → 👤 Accept/Reject → ✅ Done
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Express.js (Node.js) |
| Frontend | React 18 (Vite) |
| Database | SQLite |
| AI | Groq (llama-3.1-70b) |

## Quick Start

```bash
# Backend
cd server
npm install
cp .env.example .env          # Add your GROQ_API_KEY
npm run dev                    # Runs on :3001

# Frontend
cd client
npm install
npm run dev                    # Runs on :5173
```

## Environment Variables

```env
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
PORT=3001
STRATEGY=ai                   # "ai" or "rule-based"
LLM_MODEL=openai/gpt-oss-20b
```

## Demo Scenarios

1. **Low Inventory**: `POST /api/products/PRD-003/orders` — stock drops below threshold → auto suggestions
2. **Demand Spike**: Rapid `POST` on PRD-008 — velocity spike → auto suggestions

## Docs

- [Project Brief](./PROJECT_BRIEF.md) — Full problem statement and architecture
- [ADR](./ADR.md) — Architecture Decision Records

---

*Built for the Zycus Hackathon 2026*
