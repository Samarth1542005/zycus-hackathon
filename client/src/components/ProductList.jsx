import React, { useState } from 'react';

function ProductList({ products, onSimulateOrder, busyAction }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const categories = ['ALL', ...new Set(products.map(product => product.category))];
  const statuses = ['ALL', ...new Set(products.map(product => product.status))];
  const visibleProducts = products.filter(product => {
    const matchesQuery = `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (category === 'ALL' || product.category === category) && (status === 'ALL' || product.status === status);
  });

  return (
    <div>
      <div className="catalog-tools">
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search catalog" aria-label="Search catalog" />
        <select value={category} onChange={event => setCategory(event.target.value)} aria-label="Filter by category">
          {categories.map(option => <option key={option} value={option}>{option === 'ALL' ? 'All categories' : option}</option>)}
        </select>
        <select value={status} onChange={event => setStatus(event.target.value)} aria-label="Filter by status">
          {statuses.map(option => <option key={option} value={option}>{option === 'ALL' ? 'All statuses' : option.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <div className="catalog-result-count">Showing {visibleProducts.length} of {products.length} products</div>
      <div className="product-list">
      {visibleProducts.map(p => (
        <div key={p.id} className={`product-card ${p.stock_level < p.reorder_threshold ? 'product-card-alert' : ''}`}>
          <div className="product-header">
            <h3>{p.name}</h3>
            <span className={`status badge-${p.status.toLowerCase()}`}>
              {p.status.replace(/_/g, ' ')}
            </span>
          </div>
          
          <div className="product-meta">
            <span className="sku"><span className="sku-dot" />{p.sku} <span className="meta-divider">/</span> {p.category}</span>
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

          <div className="product-insights">
            <div className="insight-line">
              <span>Stock health</span>
              <strong>{Math.round((p.stock_level / Math.max(p.reorder_threshold, 1)) * 100)}%</strong>
            </div>
            <div className="stock-health-track">
              <span className={`stock-health-fill ${p.stock_level < p.reorder_threshold ? 'is-low' : 'is-healthy'}`} style={{ width: `${Math.min(100, (p.stock_level / Math.max(p.reorder_threshold, 1)) * 100)}%` }} />
            </div>
            <div className="insight-line margin-line">
              <span>Gross margin</span>
              <strong>{Math.round(((p.current_price - p.cost_price) / p.current_price) * 100)}% <small>floor {Math.round(p.margin_floor * 100)}%</small></strong>
            </div>
            <div className="history-line">
              <span>Price history</span>
              <div className="history-bars" aria-label="Price history">
                {(p.price_history || []).slice(-8).map((point, index, history) => {
                  const prices = history.map(item => item.price);
                  const min = Math.min(...prices);
                  const max = Math.max(...prices);
                  const height = max === min ? 55 : 25 + ((point.price - min) / (max - min)) * 55;
                  return <span key={`${point.created_at}-${index}`} style={{ height: `${height}%` }} />;
                })}
              </div>
            </div>
          </div>

          <div className="product-actions">
            <button 
              className="btn btn-simulate"
              onClick={() => onSimulateOrder(p.id, 1)}
              disabled={p.stock_level === 0 || Boolean(busyAction)}
            >
              {busyAction === `${p.id}:1` ? 'Processing...' : 'Simulate 1 order'}
            </button>
            <button 
              className="btn btn-simulate-spike"
              onClick={() => onSimulateOrder(p.id, 5)}
              disabled={p.stock_level < 5 || Boolean(busyAction)}
            >
              {busyAction === `${p.id}:5` ? 'Processing...' : 'Simulate demand spike (5)'}
            </button>
          </div>
        </div>
      ))}
      {visibleProducts.length === 0 && <div className="empty-state catalog-empty">No products match these filters.</div>}
      </div>
    </div>
  );
}

export { ProductList };
export default ProductList;
