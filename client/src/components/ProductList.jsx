import React from 'react';

export default function ProductList({ products, onSimulateOrder }) {
  return (
    <div className="product-list">
      {products.map(p => (
        <div key={p.id} className="product-card">
          <div className="product-header">
            <h3>{p.name}</h3>
            <span className={`status badge-${p.status.toLowerCase()}`}>
              {p.status.replace(/_/g, ' ')}
            </span>
          </div>
          
          <div className="product-meta">
            <span className="sku">{p.sku} • {p.category}</span>
            <span className="price">${p.current_price.toFixed(2)}</span>
          </div>

          <div className="product-stats">
            <div className="stat">
              <label>Stock</label>
              <span className={p.stock_level < p.reorder_threshold ? 'text-danger' : ''}>
                {p.stock_level} (Min: {p.reorder_threshold})
              </span>
            </div>
            <div className="stat">
              <label>Velocity</label>
              <span className={p.demand_velocity >= 10 ? 'text-warning' : ''}>
                {p.demand_velocity}/day
              </span>
            </div>
          </div>

          <div className="product-actions">
            <button 
              className="btn btn-simulate"
              onClick={() => onSimulateOrder(p.id, 1)}
              disabled={p.stock_level === 0}
            >
              🛒 Simulate 1 Order
            </button>
            <button 
              className="btn btn-simulate-spike"
              onClick={() => onSimulateOrder(p.id, 5)}
              disabled={p.stock_level < 5}
            >
              🔥 Simulate Demand Spike (5)
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
