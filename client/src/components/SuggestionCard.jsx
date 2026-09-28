import React from 'react';

export default function SuggestionCard({ type, suggestion, onResolve }) {
  const isPricing = type === 'pricing';
  
  const getBadgeClass = (trigger) => {
    switch(trigger) {
      case 'AUTO_LOW_STOCK': return 'badge-trigger-low';
      case 'AUTO_DEMAND_SPIKE': return 'badge-trigger-spike';
      default: return 'badge-trigger-manual';
    }
  };

  const getTriggerText = (trigger) => {
    switch(trigger) {
      case 'AUTO_LOW_STOCK': return '📉 Low Stock Trigger';
      case 'AUTO_DEMAND_SPIKE': return '🔥 Demand Spike Trigger';
      default: return '👤 Manual Review';
    }
  };

  return (
    <div className={`suggestion-card ${isPricing ? 'border-pricing' : 'border-reorder'}`}>
      <div className="card-header">
        <div className="card-title">
          <h4>{suggestion.product_name}</h4>
          <span className="sku">{suggestion.sku}</span>
        </div>
        <div className="card-badges">
          <span className={`badge ${getBadgeClass(suggestion.trigger_type)}`}>
            {getTriggerText(suggestion.trigger_type)}
          </span>
          <span className={`badge strategy-${suggestion.strategy_used}`}>
            {suggestion.strategy_used === 'ai' ? '🤖 AI' : '⚙️ Rule'}
          </span>
        </div>
      </div>

      <div className="card-body">
        {isPricing ? (
          <div className="metrics pricing-metrics">
            <div className="metric">
              <label>Current Price</label>
              <span>${suggestion.current_price.toFixed(2)}</span>
            </div>
            <div className="metric highlight">
              <label>Suggested Price</label>
              <span>${suggestion.suggested_price.toFixed(2)}</span>
            </div>
            <div className="metric">
              <label>Change</label>
              <span className={suggestion.price_change_pct > 0 ? 'text-success' : 'text-danger'}>
                {suggestion.price_change_pct > 0 ? '+' : ''}{suggestion.price_change_pct}%
              </span>
            </div>
          </div>
        ) : (
          <div className="metrics reorder-metrics">
            <div className="metric text-danger">
              <label>Current Stock</label>
              <span>{suggestion.current_stock}</span>
            </div>
            <div className="metric highlight">
              <label>Reorder Qty</label>
              <span>{suggestion.suggested_quantity}</span>
            </div>
          </div>
        )}

        <div className="reasoning-box">
          <div className="reasoning-header">
            <strong>Reasoning</strong>
            <span className="confidence">Confidence: {(suggestion.confidence * 100).toFixed(0)}%</span>
          </div>
          <p>{suggestion.reasoning}</p>
        </div>
      </div>

      <div className="card-actions">
        <button 
          className="btn btn-reject"
          onClick={() => onResolve(type, suggestion.id, 'reject')}
        >
          ✕ Reject
        </button>
        <button 
          className="btn btn-accept"
          onClick={() => onResolve(type, suggestion.id, 'accept')}
        >
          ✓ Accept
        </button>
      </div>
    </div>
  );
}
