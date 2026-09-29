const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

const requestJson = async (url, options) => {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
};

export const getProducts = async () => {
  return requestJson(`${API_BASE}/products`);
};

export const getSuggestions = async () => {
  const [pricingRes, reorderRes] = await Promise.all([
    requestJson(`${API_BASE}/pricing-suggestions/pending`),
    requestJson(`${API_BASE}/reorder-suggestions/pending`)
  ]);

  return { pricing: pricingRes, reorder: reorderRes };
};

export const simulateOrder = async (productId, quantity = 1) => {
  return requestJson(`${API_BASE}/products/${productId}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity })
  });
};

export const resolvePricing = async (id, status) => {
  return requestJson(`${API_BASE}/pricing-suggestions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
};

export const resolveReorder = async (id, status) => {
  return requestJson(`${API_BASE}/reorder-suggestions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
};
