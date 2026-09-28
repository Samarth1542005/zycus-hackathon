const API_BASE = 'http://localhost:3001/api';

export const getProducts = async () => {
  const res = await fetch(`${API_BASE}/products`);
  return res.json();
};

export const getSuggestions = async () => {
  const [pricingRes, reorderRes] = await Promise.all([
    fetch(`${API_BASE}/pricing-suggestions/pending`),
    fetch(`${API_BASE}/reorder-suggestions/pending`)
  ]);
  
  const pricing = await pricingRes.json();
  const reorder = await reorderRes.json();
  
  return { pricing, reorder };
};

export const simulateOrder = async (productId, quantity = 1) => {
  const res = await fetch(`${API_BASE}/products/${productId}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const resolvePricing = async (id, status) => {
  const res = await fetch(`${API_BASE}/pricing-suggestions/${id}`, { 
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return res.json();
};

export const resolveReorder = async (id, status) => {
  const res = await fetch(`${API_BASE}/reorder-suggestions/${id}`, { 
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  return res.json();
};
