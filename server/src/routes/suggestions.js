const express = require('express');
const { PricingSuggestionModel, ReorderSuggestionModel } = require('../models');

const router = express.Router();

// Get all pending suggestions
router.get('/pending', (req, res) => {
  try {
    const pricing = PricingSuggestionModel.findPending();
    const reorder = ReorderSuggestionModel.findPending();
    res.json({ pricing, reorder });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept pricing suggestion
router.patch('/pricing/:id/accept', (req, res) => {
  try {
    const result = PricingSuggestionModel.accept(req.params.id);
    if (!result) return res.status(400).json({ error: 'Invalid or already resolved suggestion' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject pricing suggestion
router.patch('/pricing/:id/reject', (req, res) => {
  try {
    const result = PricingSuggestionModel.reject(req.params.id);
    if (!result) return res.status(400).json({ error: 'Invalid or already resolved suggestion' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept reorder suggestion
router.patch('/reorder/:id/accept', (req, res) => {
  try {
    const result = ReorderSuggestionModel.accept(req.params.id);
    if (!result) return res.status(400).json({ error: 'Invalid or already resolved suggestion' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject reorder suggestion
router.patch('/reorder/:id/reject', (req, res) => {
  try {
    const result = ReorderSuggestionModel.reject(req.params.id);
    if (!result) return res.status(400).json({ error: 'Invalid or already resolved suggestion' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
