const { AIAdvisor } = require('../ai/advisor');
const { PricingSuggestionModel, ReorderSuggestionModel } = require('../../models');

// Strategy Interface Pattern
class PricingStrategy {
  async execute(product, triggerType) {
    throw new Error('execute() must be implemented');
  }
}

class RuleBasedStrategy extends PricingStrategy {
  async execute(product, triggerType) {
    let suggestedPrice = product.current_price;
    let suggestedQuantity = 0;
    let priceReasoning = '';
    let reorderReasoning = '';

    if (triggerType === 'AUTO_LOW_STOCK') {
      // 10% price increase to protect stock
      suggestedPrice = +(product.current_price * 1.10).toFixed(2);
      priceReasoning = 'Rule: Automatically increase price by 10% when stock drops below threshold to manage demand.';
      // Reorder 2x threshold
      suggestedQuantity = product.reorder_threshold * 2;
      reorderReasoning = 'Rule: Automatically reorder 2x the threshold amount when stock is low.';
    } else if (triggerType === 'AUTO_DEMAND_SPIKE') {
      // 15% price increase for high demand
      suggestedPrice = +(product.current_price * 1.15).toFixed(2);
      priceReasoning = 'Rule: Automatically increase price by 15% during demand spikes to maximize margin.';
      // Reorder 3x threshold
      suggestedQuantity = product.reorder_threshold * 3;
      reorderReasoning = 'Rule: Automatically reorder 3x the threshold amount due to high demand velocity.';
    } else {
      suggestedQuantity = product.reorder_threshold;
      priceReasoning = 'Rule: No significant triggers, maintaining price.';
      reorderReasoning = 'Rule: Standard manual reorder.';
    }

    // Save to DB
    PricingSuggestionModel.create({
      productId: product.id,
      currentPrice: product.current_price,
      suggestedPrice,
      confidence: 0.8,
      reasoning: priceReasoning,
      triggerType,
      strategyUsed: 'rule-based'
    });

    ReorderSuggestionModel.create({
      productId: product.id,
      currentStock: product.stock_level,
      suggestedQuantity,
      confidence: 0.8,
      reasoning: reorderReasoning,
      triggerType,
      strategyUsed: 'rule-based'
    });
  }
}

class AIStrategy extends PricingStrategy {
  constructor() {
    super();
    this.advisor = new AIAdvisor(process.env.GROQ_API_KEY, process.env.LLM_MODEL);
    this.fallbackStrategy = new RuleBasedStrategy();
  }

  async execute(product, triggerType) {
    const aiResult = await this.advisor.generateSuggestions({ product, triggerType });
    
    if (!aiResult) {
      console.warn(`[AI Strategy] Failed for ${product.id}. Falling back to Rule-Based.`);
      return this.fallbackStrategy.execute(product, triggerType);
    }

    PricingSuggestionModel.create({
      productId: product.id,
      currentPrice: product.current_price,
      suggestedPrice: aiResult.suggestedPrice,
      confidence: aiResult.priceConfidence,
      reasoning: aiResult.priceReasoning,
      triggerType,
      strategyUsed: 'ai'
    });

    ReorderSuggestionModel.create({
      productId: product.id,
      currentStock: product.stock_level,
      suggestedQuantity: aiResult.suggestedQuantity,
      confidence: aiResult.reorderConfidence,
      reasoning: aiResult.reorderReasoning,
      triggerType,
      strategyUsed: 'ai'
    });
  }
}

module.exports = {
  RuleBasedStrategy,
  AIStrategy
};
