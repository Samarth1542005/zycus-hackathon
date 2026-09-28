const express = require('express');
const engine = require('../services/engine');

const router = express.Router();

router.get('/strategy', (req, res) => {
  res.json({ strategy: engine.getStrategy() });
});

router.put('/strategy', (req, res) => {
  const { strategy } = req.body;
  if (!strategy) return res.status(400).json({ error: 'Strategy is required' });
  
  try {
    engine.setStrategy(strategy);
    res.json({ message: `Strategy updated to ${strategy}`, strategy: engine.getStrategy() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
