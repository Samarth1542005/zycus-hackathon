// In-memory data store for Hackathon Demo

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
  
  _nextIds: { pricing: 1, reorder: 1 }
};

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
    return res.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
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
      stock_level: data.stock_level || 0,
      reorder_threshold: data.reorder_threshold || 10,
      demand_velocity: 0,
      status: data.stock_level <= 0 ? 'OUT_OF_STOCK' : 'ACTIVE'
    };
    db.products.push(p);
    return p;
  },
  
  updateStock: (id, newStock) => {
    const p = db.products.find(p => p.id === id);
    if (p) {
      p.stock_level = newStock;
      if (p.status !== 'PRICE_REVIEW_PENDING') {
        p.status = newStock <= 0 ? 'OUT_OF_STOCK' : 'ACTIVE';
      }
    }
    return p;
  },
  
  updatePrice: (id, newPrice) => {
    const p = db.products.find(p => p.id === id);
    if (p) {
      p.current_price = newPrice;
      p.status = p.stock_level <= 0 ? 'OUT_OF_STOCK' : 'ACTIVE';
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
  },

  getCategoryAvgVelocity: (category) => getCategoryAverages()[category] || 0
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
    return enrichSuggestion(s);
  },
  
  reject: (id) => {
    const s = db.pricing_suggestions.find(s => s.id === parseInt(id));
    if (!s || s.status !== 'PENDING') return null;
    
    s.status = 'REJECTED';
    ProductModel.updateStatus(s.product_id, 'ACTIVE'); // release lock
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
    return enrichSuggestion(s);
  },
  
  reject: (id) => {
    const s = db.reorder_suggestions.find(s => s.id === parseInt(id));
    if (!s || s.status !== 'PENDING') return null;
    
    s.status = 'REJECTED';
    return enrichSuggestion(s);
  },
  
  hasPendingForProduct: (productId) => {
    return db.reorder_suggestions.some(s => s.product_id === productId && s.status === 'PENDING');
  }
};

module.exports = {
  ProductModel,
  PricingSuggestionModel,
  ReorderSuggestionModel
};
