const express = require('express');
const { ProductModel } = require('../models');
const triggerService = require('../services/triggers');

const router = express.Router();

// Get all products
router.get('/', (req, res) => {
  try {
    const products = ProductModel.findAll();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product
router.get('/:id', (req, res) => {
  try {
    const product = ProductModel.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simulate an order
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

module.exports = router;
