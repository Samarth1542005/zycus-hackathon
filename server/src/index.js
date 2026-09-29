require('dotenv').config();

const express = require('express');
const cors = require('cors');

const productsRouter = require('./routes/products');
const { pricingRouter, reorderRouter, suggestionsRouter } = require('./routes/suggestions');
const configRouter = require('./routes/config');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productsRouter);
app.use('/api/pricing-suggestions', pricingRouter);
app.use('/api/reorder-suggestions', reorderRouter);
app.use('/api/suggestions', suggestionsRouter);
app.use('/api/config', configRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[StockPulse Engine] Backend running on port ${PORT}`);
  });
}

module.exports = { app };
