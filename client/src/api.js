const API_BASE = 'http://localhost:3001/api';

export const getProducts = async () => {
  const res = await fetch(`${API_BASE}/products`);
  return res.json();
};

export const getSuggestions = async () => {
  const res = await fetch(`${API_BASE}/suggestions/pending`);
  return res.json();
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

export const acceptPricing = async (id) => {
  const res = await fetch(`${API_BASE}/suggestions/pricing/${id}/accept`, { method: 'PATCH' });
  return res.json();
};

export const rejectPricing = async (id) => {
  const res = await fetch(`${API_BASE}/suggestions/pricing/${id}/reject`, { method: 'PATCH' });
  return res.json();
};

export const acceptReorder = async (id) => {
  const res = await fetch(`${API_BASE}/suggestions/reorder/${id}/accept`, { method: 'PATCH' });
  return res.json();
};

export const rejectReorder = async (id) => {
  const res = await fetch(`${API_BASE}/suggestions/reorder/${id}/reject`, { method: 'PATCH' });
  return res.json();
};
