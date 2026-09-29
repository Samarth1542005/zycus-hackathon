const express = require('express');
const { PricingSuggestionModel, ReorderSuggestionModel } = require('../models');

const pricingRouter = express.Router();
const reorderRouter = express.Router();
const suggestionsRouter = express.Router();

function findSuggestions(status = null) {
  return [
    ...PricingSuggestionModel.findAll(status),
    ...ReorderSuggestionModel.findAll(status)
  ].sort((left, right) => right.id - left.id);
}

suggestionsRouter.get('/', (req, res) => {
  res.json(findSuggestions(req.query.status || null));
});

suggestionsRouter.get('/pending', (req, res) => {
  res.json(findSuggestions('PENDING'));
});

suggestionsRouter.patch('/:type/:id/accept', (req, res) => {
  resolveUnifiedSuggestion(req, res, 'ACCEPTED');
});

suggestionsRouter.patch('/:type/:id/reject', (req, res) => {
  resolveUnifiedSuggestion(req, res, 'REJECTED');
});

function resolveUnifiedSuggestion(req, res, status) {
  const models = req.params.type === 'pricing'
    ? PricingSuggestionModel
    : req.params.type === 'reorder'
      ? ReorderSuggestionModel
      : null;
  if (!models) return res.status(400).json({ error: 'type must be pricing or reorder' });

  const result = status === 'ACCEPTED'
    ? models.accept(req.params.id)
    : models.reject(req.params.id);
  if (!result) return res.status(400).json({ error: 'Invalid suggestion or status' });
  res.json(result);
}

// ─── PRICING SUGGESTIONS ────────────────────────────────────────

pricingRouter.get('/', (req, res) => {
  res.json(PricingSuggestionModel.findAll());
});

pricingRouter.get('/pending', (req, res) => {
  res.json(PricingSuggestionModel.findPending());
});

pricingRouter.patch('/:id', (req, res) => {
  try {
    const { status } = req.body;
    let result = null;
    
    if (status === 'ACCEPTED') result = PricingSuggestionModel.accept(req.params.id);
    else if (status === 'REJECTED') result = PricingSuggestionModel.reject(req.params.id);
    
    if (!result) return res.status(400).json({ error: 'Invalid suggestion or status' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── REORDER SUGGESTIONS ────────────────────────────────────────

reorderRouter.get('/', (req, res) => {
  res.json(ReorderSuggestionModel.findAll());
});

reorderRouter.get('/pending', (req, res) => {
  res.json(ReorderSuggestionModel.findPending());
});

reorderRouter.patch('/:id', (req, res) => {
  try {
    const { status } = req.body;
    let result = null;
    
    if (status === 'ACCEPTED') result = ReorderSuggestionModel.accept(req.params.id);
    else if (status === 'REJECTED') result = ReorderSuggestionModel.reject(req.params.id);
    
    if (!result) return res.status(400).json({ error: 'Invalid suggestion or status' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { pricingRouter, reorderRouter, suggestionsRouter };
