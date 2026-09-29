const { RuleBasedStrategy, AIStrategy } = require('./strategies');

class CommerceEngine {
  constructor() {
    this.strategies = {
      'rule-based': new RuleBasedStrategy(),
      'ai': new AIStrategy()
    };
    // Default strategy from env or rule-based
    this.currentStrategy = process.env.STRATEGY || 'rule-based';
  }

  setStrategy(strategyName) {
    if (!this.strategies[strategyName]) {
      throw new Error(`Strategy ${strategyName} not found`);
    }
    this.currentStrategy = strategyName;
    console.log(`[CommerceEngine] Strategy switched to: ${this.currentStrategy}`);
  }

  getStrategy() {
    return this.currentStrategy;
  }

  async processTrigger(product, triggerType, suggestionType = 'both') {
    console.log(`[CommerceEngine] Processing ${triggerType} for product ${product.sku} using ${this.currentStrategy} strategy`);
    const strategy = this.strategies[this.currentStrategy];
    
    // Execute asynchronously (fire and forget) so it doesn't block the request
    return strategy.execute(product, triggerType, suggestionType).catch(err => {
      console.error(`[CommerceEngine] Error executing strategy:`, err);
      throw err;
    });
  }
}

// Singleton instance
const engine = new CommerceEngine();

module.exports = engine;
