const test = require('node:test');
const assert = require('node:assert/strict');
process.env.STRATEGY = 'rule-based';
const { app } = require('../src/index');
const { resetState } = require('../src/models');

let server;
let baseUrl;

test.before(async () => {
  resetState();
  server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test('health and product catalog endpoints respond', async () => {
  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'OK' });

  const products = await fetch(`${baseUrl}/api/products`);
  assert.equal(products.status, 200);
  assert.equal((await products.json()).length, 8);
});

test('invalid order quantities are rejected', async () => {
  const response = await fetch(`${baseUrl}/api/products/PRD-008/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: 0 })
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /positive integer/);
});

test('invalid stock and margin inputs return bad request', async () => {
  const stockResponse = await fetch(`${baseUrl}/api/products/PRD-008/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock_level: -1 })
  });
  assert.equal(stockResponse.status, 400);

  const productResponse = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sku: 'SKU-TEST-001',
      name: 'Invalid Margin Product',
      category: 'HOME',
      current_price: 25,
      stock_level: 10,
      reorder_threshold: 5,
      margin_floor: 1
    })
  });
  assert.equal(productResponse.status, 400);
});

test('orders create both pending suggestion types', async () => {
  const order = await fetch(`${baseUrl}/api/products/PRD-003/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: 1 })
  });
  assert.equal(order.status, 200);

  await new Promise(resolve => setTimeout(resolve, 25));
  const suggestions = await fetch(`${baseUrl}/api/suggestions/pending`);
  const body = await suggestions.json();
  assert.equal(suggestions.status, 200);
  assert.equal(body.length, 2);
  assert.deepEqual(new Set(body.map(item => item.strategy_used)), new Set(['rule-based']));
});

test('demo reset restores seed data', async () => {
  const response = await fetch(`${baseUrl}/api/products/demo/reset`, { method: 'POST' });
  assert.equal(response.status, 200);
  const products = await fetch(`${baseUrl}/api/products`);
  const hoodie = (await products.json()).find(product => product.id === 'PRD-008');
  assert.equal(hoodie.stock_level, 11);
  assert.equal(hoodie.demand_velocity, 15);
});
