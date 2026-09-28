import React from 'react';
import SuggestionCard from './SuggestionCard';

export default function SuggestionList({ type, suggestions, onResolve }) {
  if (suggestions.length === 0) return null;

  return (
    <div className="suggestion-list">
      <h3 className="section-title">
        {type === 'pricing' ? '💰 Pricing Adjustments' : '📦 Reorder Recommendations'}
      </h3>
      {suggestions.map(sug => (
        <SuggestionCard 
          key={sug.id} 
          type={type} 
          suggestion={sug} 
          onResolve={onResolve} 
        />
      ))}
    </div>
  );
}
