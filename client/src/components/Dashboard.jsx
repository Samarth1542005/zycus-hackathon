import React, { useState, useEffect } from 'react';
import { getProducts, getSuggestions, resolvePricing, resolveReorder, simulateOrder } from '../api';
import ProductList from './ProductList';
import SuggestionList from './SuggestionList';
import './Dashboard.css';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [pricingSuggestions, setPricingSuggestions] = useState([]);
  const [reorderSuggestions, setReorderSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState(null);
  const [actionError, setActionError] = useState('');
  const [dataError, setDataError] = useState('');
  const lowStockCount = products.filter(product => product.stock_level < product.reorder_threshold && product.stock_level > 0).length;
  const activeCount = products.filter(product => product.status === 'ACTIVE').length;

  const fetchData = async () => {
    try {
      const [prodData, suggData] = await Promise.all([
        getProducts(),
        getSuggestions()
      ]);
      setProducts(prodData);
      setPricingSuggestions(suggData.pricing);
      setReorderSuggestions(suggData.reorder);
      setDataError('');
    } catch (err) {
      console.error(err);
      setDataError(err.message);
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
    setBusyAction(`${productId}:${quantity}`);
    setActionError('');
    try {
      await simulateOrder(productId, quantity);
      await fetchData();
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusyAction(null);
    }
  };

  const handleResolve = async (type, id, action) => {
    // action is passed from SuggestionCard: 'ACCEPTED' or 'REJECTED'
    try {
      setBusyAction(`${type}:${id}`);
      setActionError('');
      if (type === 'pricing') {
        await resolvePricing(id, action);
      } else {
        await resolveReorder(id, action);
      }
      await fetchData();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyAction(null);
    }
  };

  if (loading) return <div className="loading">Loading ShopStream Dashboard...</div>;

  return (
    <div className="dashboard">
      <header className="header">
        <div className="brand-lockup">
          <div>
            <span className="eyebrow">StockPulse · Hackathon · Solo</span>
            <h1><em>AI</em> Inventory &amp;<br />Dynamic Pricing</h1>
          </div>
        </div>
        <div className="header-meta">
          <strong>Live console</strong>
          <span>Groq AI · {products.length} tracked SKUs</span>
        </div>
      </header>

      <nav className="console-nav" aria-label="Console sections">
        <span className="active">Dashboard</span>
        <span>Approvals</span>
        <span>Inventory</span>
        <span>Activity</span>
        <span className="nav-live"><span className="live-dot" /> Live monitoring</span>
      </nav>

      <section className="overview-strip" aria-label="Inventory overview">
        <div className="overview-item overview-alert">
          <span className="overview-icon">01</span>
          <div><strong>{pricingSuggestions.length + reorderSuggestions.length}</strong><span>pending actions</span></div>
        </div>
        <div className="overview-item">
          <span className="overview-icon blue">02</span>
          <div><strong>{products.length}</strong><span>tracked products</span></div>
        </div>
        <div className="overview-item">
          <span className="overview-icon orange">03</span>
          <div><strong>{lowStockCount}</strong><span>low stock signals</span></div>
        </div>
        <div className="overview-item">
          <span className="overview-icon green">04</span>
          <div><strong>{activeCount}</strong><span>active products</span></div>
        </div>
      </section>

      {dataError && <div className="action-error" role="alert">Unable to refresh live data: {dataError}</div>}

      <main className="grid">
        <section className="column approvals-column" id="approvals">
          <div className="section-heading">
            <div><span className="eyebrow">Human checkpoint</span><h2>Pending Approvals</h2></div>
            <span className="section-count">{pricingSuggestions.length + reorderSuggestions.length} open</span>
          </div>
          {pricingSuggestions.length === 0 && reorderSuggestions.length === 0 && (
            <div className="empty-state">No pending actions required.</div>
          )}
          {actionError && <div className="action-error" role="alert">{actionError}</div>}
          
          <SuggestionList 
            type="pricing" 
            suggestions={pricingSuggestions} 
            onResolve={handleResolve}
            busyAction={busyAction}
          />
          <SuggestionList 
            type="reorder" 
            suggestions={reorderSuggestions} 
            onResolve={handleResolve}
            busyAction={busyAction}
          />
        </section>

        <section className="column inventory-column" id="inventory">
          <div className="section-heading">
            <div><span className="eyebrow">Live catalog</span><h2>Product Inventory</h2></div>
            <span className="section-count">{products.length} SKUs</span>
          </div>
          <ProductList products={products} onSimulateOrder={handleSimulateOrder} busyAction={busyAction} />
        </section>
      </main>
    </div>
  );
}
