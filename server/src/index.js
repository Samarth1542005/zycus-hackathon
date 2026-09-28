require('dotenv').config();
const express = require('express');
const cors = require('cors');

// In-memory db is initialized automatically inside models/index.js

// Import routes
const productRoutes = require('./routes/products');
const suggestionRoutes = require('./routes/suggestions');
const configRoutes = require('./routes/config');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api/products', productRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/config', configRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!', details: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 StockPulse Server running on http://localhost:${PORT}`);
  console.log(`🤖 Current Strategy: ${process.env.STRATEGY || 'rule-based'}`);
});
