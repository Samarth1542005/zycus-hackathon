import React from 'react';
import SuggestionCard from './SuggestionCard';

export default function SuggestionList({ type, suggestions, onResolve, busyAction }) {
  if (suggestions.length === 0) return null;

  return (
    <div className="suggestion-list">
      <h3 className="section-title">
        {type === 'pricing' ? 'Pricing adjustments' : 'Reorder recommendations'}
      </h3>
      {suggestions.map(sug => (
        <SuggestionCard 
          key={sug.id} 
          type={type} 
          suggestion={sug} 
          onResolve={onResolve}
          busy={busyAction === `${type}:${sug.id}`}
        />
      ))}
    </div>
  );
}
