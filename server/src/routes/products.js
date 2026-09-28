const express = require('express');
const { ProductModel } = require('../models');
const triggerService = require('../services/triggers');
const engine = require('../services/engine');

const router = express.Router();

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
    const product = ProductModel.updateStock(req.params.id, stock_level);
    // Explicit trigger evaluation for manual stock adjustment
    await triggerService.evaluate(req.params.id);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /products/:id/orders
router.post('/:id/orders', async (req, res) => {
  try {
    const quantity = req.body.quantity || 1;
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
