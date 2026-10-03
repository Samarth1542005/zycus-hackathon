# Backend API Documentation

This document provides an in-depth explanation of each API endpoint in the backend, including its purpose, related code, and how it works.

---

## 1. `/api/health`

### **Method**: `GET`
### **Purpose**: 
Checks the health status of the backend service.

### **Response**:
```json
{
  "status": "OK"
}
```

### **Code Reference**:
- **File**: [`server/src/index.js`](server/src/index.js)
- **Code**:
```js
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});
```

---

## 2. `/api/products`

### **Method**: `GET`
### **Purpose**: 
Fetches a list of all products. Supports optional filtering by `status` and `category`.

### **Query Parameters**:
- `status` (optional): Filter products by status.
- `category` (optional): Filter products by category.

### **Code Reference**:
- **File**: [`server/src/routes/products.js`](server/src/routes/products.js)
- **Code**:
```js
router.get('/', (req, res) => {
  try {
    const { status, category } = req.query;
    const products = ProductModel.findAll(category, status);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 3. `/api/products/:id`

### **Method**: `GET`
### **Purpose**: 
Fetches details of a single product by its ID.

### **Path Parameters**:
- `id`: The ID of the product.

### **Code Reference**:
- **File**: [`server/src/routes/products.js`](server/src/routes/products.js)
- **Code**:
```js
router.get('/:id', (req, res) => {
  try {
    const product = ProductModel.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 4. `/api/products/:id/orders`

### **Method**: `POST`
### **Purpose**: 
Simulates an order for a product. This triggers stock level updates and checks for low stock or demand spikes.

### **Request Body**:
```json
{
  "quantity": 1
}
```

### **Code Reference**:
- **File**: [`server/src/routes/products.js`](server/src/routes/products.js)
- **Code**:
```js
router.post('/:id/orders', async (req, res) => {
  try {
    const quantity = req.body.quantity === undefined ? 1 : req.body.quantity;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'quantity must be a positive integer' });
    }
    const product = await triggerService.simulateOrder(req.params.id, quantity);
    res.json({ message: 'Order processed successfully', product });
  } catch (error) {
    if (error.message.includes('Insufficient stock') || error.message.includes('not found')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});
```

---

## 5. `/api/products/demo/reset`

### **Method**: `POST`
### **Purpose**: 
Resets the demo state by restoring seed data.

### **Code Reference**:
- **File**: [`server/src/routes/products.js`](server/src/routes/products.js)
- **Code**:
```js
router.post('/demo/reset', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Demo reset is disabled in production' });
  }
  resetState();
  res.json({ message: 'Demo state reset successfully' });
});
```

---

## 6. `/api/suggestions`

### **Method**: `GET`
### **Purpose**: 
Fetches all suggestions. Supports optional filtering by `status`.

### **Query Parameters**:
- `status` (optional): Filter suggestions by status.

### **Code Reference**:
- **File**: [`server/src/routes/suggestions.js`](server/src/routes/suggestions.js)
- **Code**:
```js
suggestionsRouter.get('/', (req, res) => {
  res.json(findSuggestions(req.query.status || null));
});
```

---

## 7. `/api/suggestions/pending`

### **Method**: `GET`
### **Purpose**: 
Fetches all pending suggestions.

### **Code Reference**:
- **File**: [`server/src/routes/suggestions.js`](server/src/routes/suggestions.js)
- **Code**:
```js
suggestionsRouter.get('/pending', (req, res) => {
  res.json(findSuggestions('PENDING'));
});
```

---

## 8. `/api/suggestions/:type/:id/accept`

### **Method**: `PATCH`
### **Purpose**: 
Accepts a suggestion (either pricing or reorder).

### **Path Parameters**:
- `type`: The type of suggestion (`pricing` or `reorder`).
- `id`: The ID of the suggestion.

### **Code Reference**:
- **File**: [`server/src/routes/suggestions.js`](server/src/routes/suggestions.js)
- **Code**:
```js
suggestionsRouter.patch('/:type/:id/accept', (req, res) => {
  resolveUnifiedSuggestion(req, res, 'ACCEPTED');
});
```

---

## 9. `/api/suggestions/:type/:id/reject`

### **Method**: `PATCH`
### **Purpose**: 
Rejects a suggestion (either pricing or reorder).

### **Path Parameters**:
- `type`: The type of suggestion (`pricing` or `reorder`).
- `id`: The ID of the suggestion.

### **Code Reference**:
- **File**: [`server/src/routes/suggestions.js`](server/src/routes/suggestions.js)
- **Code**:
```js
suggestionsRouter.patch('/:type/:id/reject', (req, res) => {
  resolveUnifiedSuggestion(req, res, 'REJECTED');
});
```

---

## 10. `/api/config/strategy`

### **Method**: `GET`
### **Purpose**: 
Fetches the current strategy (either `rule-based` or `ai`).

### **Code Reference**:
- **File**: [`server/src/routes/config.js`](server/src/routes/config.js)
- **Code**:
```js
router.get('/strategy', (req, res) => {
  res.json({ strategy: engine.getStrategy() });
});
```

---

## 11. `/api/config/strategy`

### **Method**: `PUT`
### **Purpose**: 
Switches the current strategy between `rule-based` and `ai`.

### **Request Body**:
```json
{
  "strategy": "ai"
}
```

### **Code Reference**:
- **File**: [`server/src/routes/config.js`](server/src/routes/config.js)
- **Code**:
```js
router.put('/strategy', (req, res) => {
  const { strategy } = req.body;
  if (!strategy) return res.status(400).json({ error: 'Strategy is required' });
  
  try {
    engine.setStrategy(strategy);
    res.json({ message: `Strategy updated to ${strategy}`, strategy: engine.getStrategy() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

---

## Notes:
- The backend uses a **strategy pattern** for switching between `rule-based` and `ai` strategies. This is implemented in [`server/src/services/engine/strategies.js`](server/src/services/engine/strategies.js).
- The `triggerService` handles automatic triggers for low stock and demand spikes. It is implemented in [`server/src/services/triggers/index.js`](server/src/services/triggers/index.js).
- Suggestions are managed using models defined in [`server/src/models/index.js`](server/src/models/index.js).