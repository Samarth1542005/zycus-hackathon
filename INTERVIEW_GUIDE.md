# StockPulse Interview Guide

## 1. Short Project Introduction

StockPulse is an AI-powered inventory and dynamic pricing system for online stores.

It monitors product stock and demand velocity. When stock becomes low or demand suddenly increases, the system automatically generates pricing and reorder recommendations. A merchandiser reviews these recommendations and accepts or rejects them before any business value changes.

The main workflow is:

```text
Order received
    -> stock and demand updated
    -> trigger detected
    -> pricing and reorder suggestions generated
    -> merchandiser reviews suggestions
    -> suggestion accepted or rejected
    -> price or stock updated
```

## 2. Main Features

### Low-stock detection

Every product has a current stock level and a reorder threshold. If the stock falls below the threshold, the system creates an `INVENTORY_LOW` trigger.

For example:

```text
Current stock: 8
Reorder threshold: 15
```

Because 8 is less than 15, the system generates pricing and reorder suggestions.

### Demand-spike detection

The system tracks demand velocity, which means how quickly a product is selling.

A demand spike is detected when:

```text
Product velocity >= 2 x category average velocity
```

For example, if the category average is 7 units per day and the product reaches 15 units per day, the product is considered to have a demand spike.

The system may recommend a modest price increase and a larger reorder quantity.

### Automatic recommendations

Recommendations are generated automatically after an order or stock adjustment. The user does not need to manually request an analysis.

The system generates two separate suggestions:

- Pricing suggestion: current price, suggested price, direction, confidence, and reasoning.
- Reorder suggestion: current stock, reorder quantity, lead time, confidence, and reasoning.

### Rule-based recommendations

The rule-based strategy uses predictable business rules.

For low stock, it recommends approximately a 10% price increase. For a demand spike, it recommends approximately a 5% price increase.

The reorder quantity is calculated as:

```text
(reorder threshold x 3) - current stock
```

This strategy is fast, deterministic, and easy to test.

### AI recommendations

The AI strategy sends product information to the Groq language model. The information includes the product, category, current price, cost price, margin floor, stock, reorder threshold, demand velocity, category average velocity, and trigger reason.

The AI returns structured JSON containing:

- Suggested price
- Price direction
- Price confidence
- Price reasoning
- Suggested reorder quantity
- Lead time
- Reorder confidence
- Reorder reasoning

The project uses different prompts for low inventory and demand spikes so the AI can reason differently for each situation.

### AI validation and fallback

The system validates every AI response. It checks that:

- The price is positive and within reasonable bounds.
- The price does not violate the margin floor.
- Quantity and lead time are positive integers.
- Confidence scores are between 0 and 1.
- The direction and reasoning are valid.

If the AI is unavailable, times out, returns invalid JSON, or fails validation, the system uses the rule-based strategy instead.

A fallback is a backup method used when the preferred method fails.

### Human approval

All suggestions initially have the status `PENDING`.

The merchandiser can accept or reject each suggestion.

- Accepting a pricing suggestion updates the product price and records price history.
- Rejecting a pricing suggestion leaves the price unchanged.
- Accepting a reorder suggestion simulates incoming stock.
- Rejecting a reorder suggestion leaves stock unchanged.

This is called human-in-the-loop design: the system recommends an action, but a human makes the final decision.

### Inventory dashboard

The React dashboard displays:

- Product name and SKU
- Category
- Current price
- Stock level
- Reorder threshold
- Demand velocity
- Product status
- Stock health
- Gross margin
- Price history

The catalog supports search and filtering by category and status.

### Reactive updates

The frontend refreshes data every three seconds by polling the backend. Polling means repeatedly asking the backend for updated information.

This makes newly generated suggestions appear without manually refreshing the browser.

## 3. Architecture

```text
React frontend
    -> Express REST API
        -> Trigger service
            -> Commerce engine
                -> Rule-based strategy
                -> AI strategy
                    -> Groq API
        -> Models
            -> JSON persistence
```

### Frontend layer

The frontend uses React and Vite.

Its responsibilities are to display products and suggestions, simulate orders, send accept or reject actions, refresh data, and show loading or error states.

The frontend calls backend APIs instead of containing the main business rules.

### API layer

The backend uses Node.js and Express. Important endpoints include:

```text
GET    /api/products
POST   /api/products/:id/orders
GET    /api/suggestions/pending
PATCH  /api/pricing-suggestions/:id
PATCH  /api/reorder-suggestions/:id
GET    /api/config/strategy
PUT    /api/config/strategy
GET    /api/health
```

A REST API is a collection of HTTP endpoints that lets applications communicate using methods such as `GET`, `POST`, and `PATCH`.

### Trigger service

The trigger service updates stock and demand velocity after an order. It then checks for low inventory or a demand spike.

If a trigger is found, it sends the product to the commerce engine asynchronously.

Asynchronous processing means the work can continue without blocking the main request.

### Commerce engine

The commerce engine is the central coordinator for recommendation generation. It selects either the AI strategy or rule-based strategy.

The trigger service does not need to know how a recommendation is calculated. It only calls the common strategy interface.

### Strategy Pattern

The project uses the Strategy Pattern. Both strategies implement the same operation:

```text
execute(product, triggerReason, suggestionType)
```

The active strategy can be changed at runtime using the configuration API. The server does not need to restart.

This makes the system modular and allows new strategies to be added later.

### Model layer

The model layer manages products, pricing suggestions, reorder suggestions, inventory snapshots, and price history.

It also handles accepting suggestions, rejecting suggestions, updating prices, updating stock, and restocking products.

### Persistence

The active demo uses the local file `server/stockpulse.data.json`.

The file-backed store allows data to survive backend restarts without requiring database installation. The persistence logic is isolated in the model layer, so it can later be replaced with SQLite or PostgreSQL.

Persistence means saving data so it remains available after an application restarts.

## 4. State Management

Products can have statuses such as:

```text
ACTIVE
PRICE_REVIEW_PENDING
OUT_OF_STOCK
```

Suggestions follow this state flow:

```text
PENDING -> ACCEPTED
PENDING -> REJECTED
```

A state machine defines the valid states of an object and the allowed transitions between those states.

## 5. Important Data Records

### Product

Stores the product name, SKU, category, price, stock, reorder threshold, demand velocity, and status.

### Inventory snapshot

Stores the stock and demand values after an inventory event, along with the trigger and timestamp.

### Pricing suggestion

Stores the current price, suggested price, price direction, confidence, reasoning, trigger, strategy, and status.

### Reorder suggestion

Stores the current stock, suggested quantity, lead time, confidence, reasoning, trigger, strategy, and status.

### Price history

Stores previous prices and timestamps so price changes can be displayed in the dashboard.

## 6. Example Demo Flow

1. Select a product such as `PRD-003`.
2. Click `Simulate 1 order`.
3. The backend decreases stock and increases demand velocity.
4. The trigger service detects low inventory.
5. The commerce engine generates pricing and reorder suggestions.
6. The dashboard displays the suggestions and their reasoning.
7. Accepting the pricing suggestion updates the price.
8. Accepting the reorder suggestion increases stock.
9. Rejecting either suggestion leaves that business value unchanged.

For a demand-spike demo, reset the state and simulate five units for `PRD-008`.

## 7. Testing

Backend tests cover:

- Health and product endpoints
- Invalid order quantities
- Invalid stock and margin values
- Automatic suggestion generation
- Demand-spike behavior
- Demo reset behavior

Commands:

```text
cd server
npm test
```

Frontend checks:

```text
cd client
npm run build
npm run lint
```

## 8. Key Design Decisions

### Why Express?

Express allowed fast backend development during the hackathon and is lightweight for REST APIs.

### Why the Strategy Pattern?

It allows AI and rule-based recommendation logic to be switched without changing the trigger or API layers.

### Why a rule-based fallback?

An external AI service can fail. The fallback guarantees that the system can still produce a recommendation.

### Why human approval?

Price and inventory decisions affect the business, so the AI assists the merchandiser instead of changing data without approval.

### Why a JSON store?

It avoids database installation problems during the demo while keeping persistence behind a replaceable model layer.

### Why polling?

Polling was simple enough for the demo. A production system could use WebSockets or Server-Sent Events for more immediate updates.

## 9. Limitations and Future Improvements

The current project does not include authentication, payments, competitor price scraping, automated purchase orders, multi-user concurrency, or production-grade database transactions.

Future improvements could include:

- PostgreSQL or SQLite
- Authentication and role-based access
- Supplier integration
- Competitor pricing data
- Automated purchase orders
- WebSockets or Server-Sent Events
- Audit logs for approvals
- Advanced demand forecasting

## 10. Ready-to-Say Interview Answer

StockPulse is a reactive merchandising system for online stores. It monitors inventory and demand velocity. When an order causes low stock or a demand spike, the trigger service automatically sends the product to the commerce engine. The engine uses either a deterministic rule-based strategy or an AI strategy powered by Groq. The AI response is validated against business rules such as price limits and margin floors. If the AI fails, the system falls back to deterministic rules. The recommendations remain pending until a merchandiser reviews them. After approval, the system updates the price or simulates incoming stock. The frontend is a React dashboard, the backend is an Express REST API, and the demo uses a persistent local JSON store.
