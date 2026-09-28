// In-memory data store for Hackathon Demo
// Replaces SQLite to avoid C++ build tool requirements on Node v24

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
  snapshots: [],
  pricing_suggestions: [],
  reorder_suggestions: [],
  
  _nextIds: { snapshots: 1, pricing: 1, reorder: 1 }
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
  findAll: () => [...db.products].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)),
  
  findById: (id) => db.products.find(p => p.id === id),
  
  updateStock: (id, newStock) => {
    const p = db.products.find(p => p.id === id);
    if (p) {
      p.stock_level = newStock;
      p.status = newStock <= 0 ? 'OUT_OF_STOCK' : 'ACTIVE';
    }
    return p;
  },
  
  updatePrice: (id, newPrice) => {
    const p = db.products.find(p => p.id === id);
    if (p) {
      p.current_price = newPrice;
      p.status = 'ACTIVE';
    }
    return p;
  },
  
  updateVelocity: (id, velocity) => {
    const p = db.products.find(p => p.id === id);
    if (p) p.demand_velocity = velocity;
  },
  
  updateStatus: (id, status) => {
    const p = db.products.find(p => p.id === id);
    if (p) p.status = status;
  },
  
  restockProduct: (id, quantity) => {
    const p = db.products.find(p => p.id === id);
    if (p) {
      p.stock_level += quantity;
      p.status = p.stock_level > 0 ? 'ACTIVE' : 'OUT_OF_STOCK';
    }
    return p;
  }
};

const SnapshotModel = {
  create: (productId, stockLevel, demandVelocity, triggerType = null) => {
    const snap = {
      id: db._nextIds.snapshots++,
      product_id: productId,
      stock_level: stockLevel,
      demand_velocity: demandVelocity,
      trigger_type: triggerType,
      created_at: new Date().toISOString()
    };
    db.snapshots.push(snap);
    return snap;
  },
  
  findByProduct: (productId, limit = 20) => {
    return db.snapshots
      .filter(s => s.product_id === productId)
      .sort((a, b) => b.id - a.id)
      .slice(0, limit);
  }
};

const PricingSuggestionModel = {
  create: ({ productId, currentPrice, suggestedPrice, confidence, reasoning, triggerType, strategyUsed }) => {
    const changePct = parseFloat(((suggestedPrice - currentPrice) / currentPrice * 100).toFixed(2));
    const sug = {
      id: db._nextIds.pricing++,
      product_id: productId,
      current_price: currentPrice,
      suggested_price: suggestedPrice,
      price_change_pct: changePct,
      confidence,
      reasoning,
      trigger_type: triggerType,
      strategy_used: strategyUsed,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      resolved_at: null
    };
    db.pricing_suggestions.push(sug);
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
    s.resolved_at = new Date().toISOString();
    ProductModel.updatePrice(s.product_id, s.suggested_price);
    return enrichSuggestion(s);
  },
  
  reject: (id) => {
    const s = db.pricing_suggestions.find(s => s.id === parseInt(id));
    if (!s || s.status !== 'PENDING') return null;
    
    s.status = 'REJECTED';
    s.resolved_at = new Date().toISOString();
    ProductModel.updateStatus(s.product_id, 'ACTIVE');
    return enrichSuggestion(s);
  },
  
  hasPendingForProduct: (productId) => {
    return db.pricing_suggestions.some(s => s.product_id === productId && s.status === 'PENDING');
  }
};

const ReorderSuggestionModel = {
  create: ({ productId, currentStock, suggestedQuantity, confidence, reasoning, triggerType, strategyUsed }) => {
    const sug = {
      id: db._nextIds.reorder++,
      product_id: productId,
      current_stock: currentStock,
      suggested_quantity: suggestedQuantity,
      confidence,
      reasoning,
      trigger_type: triggerType,
      strategy_used: strategyUsed,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      resolved_at: null
    };
    db.reorder_suggestions.push(sug);
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
    s.resolved_at = new Date().toISOString();
    ProductModel.restockProduct(s.product_id, s.suggested_quantity);
    return enrichSuggestion(s);
  },
  
  reject: (id) => {
    const s = db.reorder_suggestions.find(s => s.id === parseInt(id));
    if (!s || s.status !== 'PENDING') return null;
    
    s.status = 'REJECTED';
    s.resolved_at = new Date().toISOString();
    return enrichSuggestion(s);
  },
  
  hasPendingForProduct: (productId) => {
    return db.reorder_suggestions.some(s => s.product_id === productId && s.status === 'PENDING');
  }
};

module.exports = {
  ProductModel,
  SnapshotModel,
  PricingSuggestionModel,
  ReorderSuggestionModel
};
