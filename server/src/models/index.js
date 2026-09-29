const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', '..', 'stockpulse.data.json');

const db = {
  products: [
    { id: 'PRD-001', sku: 'SKU-ELEC-001', name: 'Wireless Earbuds Pro', category: 'ELECTRONICS', current_price: 79.99, stock_level: 45, reorder_threshold: 20, demand_velocity: 3, status: 'ACTIVE' },
    { id: 'PRD-002', sku: 'SKU-ELEC-002', name: 'USB-C Hub 7-Port', category: 'ELECTRONICS', current_price: 34.99, stock_level: 120, reorder_threshold: 30, demand_velocity: 1, status: 'ACTIVE' },
    { id: 'PRD-003', sku: 'SKU-APP-001', name: 'Organic Cotton T-Shirt', category: 'APPAREL', current_price: 24.99, stock_level: 8, reorder_threshold: 15, demand_velocity: 12, status: 'PRICE_REVIEW_PENDING' },
    { id: 'PRD-004', sku: 'SKU-APP-002', name: 'Running Shorts — Navy', category: 'APPAREL', current_price: 39.99, stock_level: 55, reorder_threshold: 20, demand_velocity: 2, status: 'ACTIVE' },
    { id: 'PRD-005', sku: 'SKU-HOME-001', name: 'Ceramic Pour-Over Set', category: 'HOME', current_price: 49.99, stock_level: 22, reorder_threshold: 10, demand_velocity: 4, status: 'ACTIVE' },
    { id: 'PRD-006', sku: 'SKU-HOME-002', name: 'LED Desk Lamp — Dimmable', category: 'HOME', current_price: 59.99, stock_level: 0, reorder_threshold: 15, demand_velocity: 0, status: 'OUT_OF_STOCK' },
    { id: 'PRD-007', sku: 'SKU-ELEC-003', name: 'Portable Charger 20K', category: 'ELECTRONICS', current_price: 44.99, stock_level: 18, reorder_threshold: 25, demand_velocity: 8, status: 'ACTIVE' },
    { id: 'PRD-008', sku: 'SKU-APP-003', name: 'Hoodie — Heather Grey', category: 'APPAREL', current_price: 54.99, stock_level: 11, reorder_threshold: 12, demand_velocity: 15, status: 'ACTIVE' }
  ],
  pricing_suggestions: [],
  reorder_suggestions: [],
  inventory_snapshots: [],
  price_history: [],
  
  _nextIds: { pricing: 1, reorder: 1 }
};

loadPersistedState();

function loadPersistedState() {
  if (!fs.existsSync(DATA_PATH)) {
    resetState();
    return;
  }
  try {
    Object.assign(db, JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')));
    normalizePersistedState();
  } catch (error) {
    console.warn(`[Models] Ignoring invalid persisted state: ${error.message}`);
  }
}

function normalizePersistedState() {
  db.price_history ||= [];
  db.products.forEach(product => {
    product.cost_price ??= +(product.current_price * 0.6).toFixed(2);
    product.margin_floor ??= 0.25;
    if (!db.price_history.some(entry => entry.product_id === product.id)) {
      db.price_history.push({ product_id: product.id, price: product.current_price, created_at: new Date().toISOString() });
    }
  });
  persistState();
}

function persistState() {
  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
}

function resetState() {
  db.products = [
    { id: 'PRD-001', sku: 'SKU-ELEC-001', name: 'Wireless Earbuds Pro', category: 'ELECTRONICS', current_price: 79.99, stock_level: 45, reorder_threshold: 20, demand_velocity: 3, status: 'ACTIVE' },
    { id: 'PRD-002', sku: 'SKU-ELEC-002', name: 'USB-C Hub 7-Port', category: 'ELECTRONICS', current_price: 34.99, stock_level: 120, reorder_threshold: 30, demand_velocity: 1, status: 'ACTIVE' },
    { id: 'PRD-003', sku: 'SKU-APP-001', name: 'Organic Cotton T-Shirt', category: 'APPAREL', current_price: 24.99, stock_level: 8, reorder_threshold: 15, demand_velocity: 12, status: 'PRICE_REVIEW_PENDING' },
    { id: 'PRD-004', sku: 'SKU-APP-002', name: 'Running Shorts — Navy', category: 'APPAREL', current_price: 39.99, stock_level: 55, reorder_threshold: 20, demand_velocity: 2, status: 'ACTIVE' },
    { id: 'PRD-005', sku: 'SKU-HOME-001', name: 'Ceramic Pour-Over Set', category: 'HOME', current_price: 49.99, stock_level: 22, reorder_threshold: 10, demand_velocity: 4, status: 'ACTIVE' },
    { id: 'PRD-006', sku: 'SKU-HOME-002', name: 'LED Desk Lamp — Dimmable', category: 'HOME', current_price: 59.99, stock_level: 0, reorder_threshold: 15, demand_velocity: 0, status: 'OUT_OF_STOCK' },
    { id: 'PRD-007', sku: 'SKU-ELEC-003', name: 'Portable Charger 20K', category: 'ELECTRONICS', current_price: 44.99, stock_level: 18, reorder_threshold: 25, demand_velocity: 8, status: 'ACTIVE' },
    { id: 'PRD-008', sku: 'SKU-APP-003', name: 'Hoodie — Heather Grey', category: 'APPAREL', current_price: 54.99, stock_level: 11, reorder_threshold: 12, demand_velocity: 15, status: 'ACTIVE' }
  ];
  db.pricing_suggestions = [];
  db.reorder_suggestions = [];
  db.inventory_snapshots = [];
  db.price_history = [];
  db._nextIds = { pricing: 1, reorder: 1 };
  db.products.forEach(product => {
    product.cost_price = +(product.current_price * 0.6).toFixed(2);
    product.margin_floor = 0.25;
    db.price_history.push({ product_id: product.id, price: product.current_price, created_at: new Date().toISOString() });
  });
  persistState();
}

// Helper to calculate category averages for the AI context
const getCategoryAverages = () => {
  const avgs = {};
  const counts = {};
  db.products.forEach(p => {
    if (!avgs[p.category]) { avgs[p.category] = 0; counts[p.category] = 0; }
    avgs[p.category] += p.demand_velocity;
    counts[p.category]++;
  });
  Object.keys(avgs).forEach(k => avgs[k] = avgs[k] / counts[k]);
  return avgs;
};

// Helper to enrich suggestion with product data
const enrichSuggestion = (s) => {
  const p = db.products.find(prod => prod.id === s.product_id);
  return {
    ...s,
    product_name: p.name,
    sku: p.sku,
    category: p.category,
    stock_level: p.stock_level,
    demand_velocity: p.demand_velocity
  };
};

const ProductModel = {
  findAll: (category = null, status = null) => {
    let res = [...db.products];
    if (category) res = res.filter(p => p.category === category);
    if (status) res = res.filter(p => p.status === status);
    return res
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
      .map(product => ({ ...product, price_history: ProductModel.getPriceHistory(product.id) }));
  },
  
  findById: (id) => db.products.find(p => p.id === id),

  create: (data) => {
    const id = `PRD-${Date.now()}`;
    const p = {
      id,
      sku: data.sku,
      name: data.name,
      category: data.category,
      current_price: data.current_price,
      cost_price: data.cost_price ?? +(data.current_price * 0.6).toFixed(2),
      margin_floor: data.margin_floor ?? 0.25,
      stock_level: data.stock_level ?? 0,
      reorder_threshold: data.reorder_threshold ?? 10,
      demand_velocity: 0,
      status: data.stock_level <= 0 ? 'OUT_OF_STOCK' : 'ACTIVE'
    };
    db.products.push(p);
    persistState();
    return p;
  },
  
  updateStock: (id, newStock) => {
    const p = db.products.find(p => p.id === id);
    if (p) {
      p.stock_level = newStock;
      p.status = newStock <= 0 ? 'OUT_OF_STOCK' : p.status === 'PRICE_REVIEW_PENDING' ? p.status : 'ACTIVE';
    }
    persistState();
    return p;
  },
  
  updatePrice: (id, newPrice) => {
    const p = db.products.find(p => p.id === id);
    if (p) {
      p.current_price = newPrice;
      p.status = p.stock_level <= 0 ? 'OUT_OF_STOCK' : 'ACTIVE';
      db.price_history.push({ product_id: id, price: newPrice, created_at: new Date().toISOString() });
    }
    persistState();
    return p;
  },
  
  updateVelocity: (id, velocity) => {
    const p = db.products.find(p => p.id === id);
    if (p) p.demand_velocity = velocity;
    persistState();
  },
  
  updateStatus: (id, status) => {
    const p = db.products.find(p => p.id === id);
    if (p) p.status = status;
    persistState();
  },
  
  restockProduct: (id, quantity) => {
    const p = db.products.find(p => p.id === id);
    if (p) {
      p.stock_level += quantity;
      p.status = p.stock_level > 0 ? 'ACTIVE' : 'OUT_OF_STOCK';
    }
    persistState();
    return p;
  },

  getCategoryAvgVelocity: (category) => getCategoryAverages()[category] || 0,

  getPriceHistory: (id) => db.price_history.filter(entry => entry.product_id === id)
};

const InventorySnapshotModel = {
  create: ({ productId, stockLevel, demandVelocity, triggerType = null }) => {
    const snapshot = {
      id: db.inventory_snapshots.length + 1,
      product_id: productId,
      stock_level: stockLevel,
      demand_velocity: demandVelocity,
      trigger_type: triggerType,
      created_at: new Date().toISOString()
    };
    db.inventory_snapshots.push(snapshot);
    persistState();
    return snapshot;
  },

  findByProduct: (productId) => db.inventory_snapshots.filter(snapshot => snapshot.product_id === productId)
};

const PricingSuggestionModel = {
  create: ({ productId, currentPrice, suggestedPrice, changeDirection, confidence, reasoning, triggerReason, strategyUsed }) => {
    const sug = {
      id: db._nextIds.pricing++,
      product_id: productId,
      current_price: currentPrice,
      suggested_price: suggestedPrice,
      change_direction: changeDirection,
      confidence,
      reasoning,
      triggerReason,
      strategy_used: strategyUsed,
      status: 'PENDING',
      created_at: new Date().toISOString()
    };
    db.pricing_suggestions.push(sug);
    persistState();
    return enrichSuggestion(sug);
  },
  
  findById: (id) => {
    const s = db.pricing_suggestions.find(s => s.id === parseInt(id));
    return s ? enrichSuggestion(s) : null;
  },
  
  findAll: (status = null) => {
    let suggestions = db.pricing_suggestions;
    if (status) suggestions = suggestions.filter(s => s.status === status);
    return suggestions.map(enrichSuggestion).sort((a, b) => b.id - a.id);
  },
  
  findPending: () => PricingSuggestionModel.findAll('PENDING'),
  
  accept: (id) => {
    const s = db.pricing_suggestions.find(s => s.id === parseInt(id));
    if (!s || s.status !== 'PENDING') return null;
    
    s.status = 'ACCEPTED';
    ProductModel.updatePrice(s.product_id, s.suggested_price);
    persistState();
    return enrichSuggestion(s);
  },
  
  reject: (id) => {
    const s = db.pricing_suggestions.find(s => s.id === parseInt(id));
    if (!s || s.status !== 'PENDING') return null;
    
    s.status = 'REJECTED';
    ProductModel.updateStatus(s.product_id, 'ACTIVE'); // release lock
    persistState();
    return enrichSuggestion(s);
  },
  
  hasPendingForProduct: (productId) => {
    return db.pricing_suggestions.some(s => s.product_id === productId && s.status === 'PENDING');
  }
};

const ReorderSuggestionModel = {
  create: ({ productId, currentStock, suggestedQuantity, suggestedLeadTimeDays, confidence, reasoning, triggerReason, strategyUsed }) => {
    const sug = {
      id: db._nextIds.reorder++,
      product_id: productId,
      current_stock: currentStock,
      suggested_quantity: suggestedQuantity,
      suggested_lead_time_days: suggestedLeadTimeDays,
      confidence,
      reasoning,
      triggerReason,
      strategy_used: strategyUsed,
      status: 'PENDING',
      created_at: new Date().toISOString()
    };
    db.reorder_suggestions.push(sug);
    persistState();
    return enrichSuggestion(sug);
  },
  
  findById: (id) => {
    const s = db.reorder_suggestions.find(s => s.id === parseInt(id));
    return s ? enrichSuggestion(s) : null;
  },
  
  findAll: (status = null) => {
    let suggestions = db.reorder_suggestions;
    if (status) suggestions = suggestions.filter(s => s.status === status);
    return suggestions.map(enrichSuggestion).sort((a, b) => b.id - a.id);
  },
  
  findPending: () => ReorderSuggestionModel.findAll('PENDING'),
  
  accept: (id) => {
    const s = db.reorder_suggestions.find(s => s.id === parseInt(id));
    if (!s || s.status !== 'PENDING') return null;
    
    s.status = 'ACCEPTED';
    // Simulate inbound shipment
    ProductModel.restockProduct(s.product_id, s.suggested_quantity);
    persistState();
    return enrichSuggestion(s);
  },
  
  reject: (id) => {
    const s = db.reorder_suggestions.find(s => s.id === parseInt(id));
    if (!s || s.status !== 'PENDING') return null;
    
    s.status = 'REJECTED';
    persistState();
    return enrichSuggestion(s);
  },
  
  hasPendingForProduct: (productId) => {
    return db.reorder_suggestions.some(s => s.product_id === productId && s.status === 'PENDING');
  }
};

module.exports = {
  ProductModel,
  InventorySnapshotModel,
  PricingSuggestionModel,
  ReorderSuggestionModel,
  resetState
};
