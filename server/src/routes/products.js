const express = require('express');
const { ProductModel, resetState } = require('../models');
const triggerService = require('../services/triggers');
const engine = require('../services/engine');

const router = express.Router();

router.post('/demo/reset', (req, res) => {
  resetState();
  res.json({ message: 'Demo state reset successfully' });
});

// GET /products?status=&category=
router.get('/', (req, res) => {
  try {
    const { status, category } = req.query;
    const products = ProductModel.findAll(category, status);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /products/:id
router.get('/:id', (req, res) => {
  try {
    const product = ProductModel.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /products
router.post('/', (req, res) => {
  try {
    validateProductInput(req.body);
    const product = ProductModel.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PATCH /products/:id/stock
router.patch('/:id/stock', async (req, res) => {
  try {
    const { stock_level } = req.body;
    validateNonNegativeInteger(stock_level, 'stock_level');
    if (!ProductModel.findById(req.params.id)) return res.status(404).json({ error: 'Product not found' });
    const product = ProductModel.updateStock(req.params.id, stock_level);
    // Explicit trigger evaluation for manual stock adjustment
    await triggerService.evaluate(req.params.id);
    res.json(product);
  } catch (error) {
    const status = /must be a non-negative integer/.test(error.message) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

// POST /products/:id/orders
router.post('/:id/orders', async (req, res) => {
  try {
    const quantity = req.body.quantity === undefined ? 1 : req.body.quantity;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'quantity must be a positive integer' });
    }
    const product = await triggerService.simulateOrder(req.params.id, quantity);
    res.json({ message: 'Order processed successfully', product });
  } catch (error) {
    if (error.message.includes('Insufficient stock') || error.message.includes('not found')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /products/:id/suggest-pricing
router.post('/:id/suggest-pricing', async (req, res) => {
  try {
    const product = ProductModel.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    // Trigger MANUAL suggestion
    await engine.processTrigger(product, 'MANUAL', 'pricing');
    res.json({ message: 'Pricing suggestion generation started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /products/:id/suggest-reorder
router.post('/:id/suggest-reorder', async (req, res) => {
  try {
    const product = ProductModel.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    // Trigger MANUAL suggestion
    await engine.processTrigger(product, 'MANUAL', 'reorder');
    res.json({ message: 'Reorder suggestion generation started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

function validateProductInput(product) {
  if (!product || typeof product !== 'object') throw new Error('Product body is required');
  if (!product.sku || !product.name || !product.category) throw new Error('sku, name, and category are required');
  if (!['ELECTRONICS', 'APPAREL', 'HOME'].includes(product.category)) throw new Error('Invalid category');
  if (!Number.isFinite(product.current_price) || product.current_price <= 0) throw new Error('current_price must be positive');
  if (product.cost_price !== undefined && (!Number.isFinite(product.cost_price) || product.cost_price < 0)) throw new Error('cost_price must be non-negative');
  if (product.margin_floor !== undefined && (!Number.isFinite(product.margin_floor) || product.margin_floor < 0 || product.margin_floor >= 1)) throw new Error('margin_floor must be between 0 and 1');
  validateNonNegativeInteger(product.stock_level, 'stock_level');
  validateNonNegativeInteger(product.reorder_threshold, 'reorder_threshold');
}

function validateNonNegativeInteger(value, fieldName) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${fieldName} must be a non-negative integer`);
}
