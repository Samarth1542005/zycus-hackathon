import React, { useState, useEffect } from 'react';
import { getProducts, getSuggestions, acceptPricing, rejectPricing, acceptReorder, rejectReorder, simulateOrder } from '../api';
import ProductList from './ProductList';
import SuggestionList from './SuggestionList';
import './Dashboard.css';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [pricingSuggestions, setPricingSuggestions] = useState([]);
  const [reorderSuggestions, setReorderSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [prodData, suggData] = await Promise.all([
        getProducts(),
        getSuggestions()
      ]);
      setProducts(prodData);
      setPricingSuggestions(suggData.pricing);
      setReorderSuggestions(suggData.reorder);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll for updates every 3 seconds to feel "reactive"
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateOrder = async (productId, quantity = 1) => {
    await simulateOrder(productId, quantity);
    await fetchData();
  };

  const handleResolve = async (type, id, action) => {
    try {
      if (type === 'pricing') {
        if (action === 'accept') await acceptPricing(id);
        else await rejectPricing(id);
      } else {
        if (action === 'accept') await acceptReorder(id);
        else await rejectReorder(id);
      }
      await fetchData();
    } catch (err) {
      console.error('Failed to resolve suggestion', err);
    }
  };

  if (loading) return <div className="loading">Loading ShopStream Dashboard...</div>;

  return (
    <div className="dashboard">
      <header className="header">
        <h1>📦 ShopStream Merchandising Console</h1>
        <div className="stats">
          <div className="stat-card">
            <span>Pending Suggestions</span>
            <strong>{pricingSuggestions.length + reorderSuggestions.length}</strong>
          </div>
        </div>
      </header>

      <main className="grid">
        <section className="column">
          <h2>Pending Approvals</h2>
          {pricingSuggestions.length === 0 && reorderSuggestions.length === 0 && (
            <div className="empty-state">No pending actions required.</div>
          )}
          
          <SuggestionList 
            type="pricing" 
            suggestions={pricingSuggestions} 
            onResolve={handleResolve} 
          />
          <SuggestionList 
            type="reorder" 
            suggestions={reorderSuggestions} 
            onResolve={handleResolve} 
          />
        </section>

        <section className="column">
          <h2>Product Inventory</h2>
          <ProductList products={products} onSimulateOrder={handleSimulateOrder} />
        </section>
      </main>
    </div>
  );
}
