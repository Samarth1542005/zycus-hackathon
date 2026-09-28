const { AIAdvisor } = require('../ai/advisor');
const { PricingSuggestionModel, ReorderSuggestionModel, ProductModel } = require('../../models');

// Strategy Interface Pattern
class PricingStrategy {
  async execute(product, triggerReason, suggestionType = 'both') {
    throw new Error('execute() must be implemented');
  }
}

class RuleBasedStrategy extends PricingStrategy {
  async execute(product, triggerReason, suggestionType = 'both') {
    let suggestedPrice = product.current_price;
    let changeDirection = 'HOLD';
    let suggestedQuantity = 1;
    let priceReasoning = '';
    let reorderReasoning = '';
    
    // T-2 Rule-Based Math Requirements
    const categoryAvgVelocity = ProductModel.getCategoryAvgVelocity(product.category);

    if (product.stock_level < product.reorder_threshold) {
      suggestedPrice = +(product.current_price * 1.10).toFixed(2);
      changeDirection = 'INCREASE';
      priceReasoning = 'Rule: Stock below reorder threshold. 10% price increase recommended.';
    } else if (product.demand_velocity > categoryAvgVelocity * 2) {
      suggestedPrice = +(product.current_price * 1.05).toFixed(2);
      changeDirection = 'INCREASE';
      priceReasoning = 'Rule: Demand velocity > 2x category average. 5% price increase recommended.';
    } else {
      priceReasoning = 'Rule: No significant triggers, maintaining price.';
    }

    // T-2 Reorder Rule: (threshold * 3) - current stock, minimum 1
    const calcQty = (product.reorder_threshold * 3) - product.stock_level;
    suggestedQuantity = Math.max(1, calcQty);
    reorderReasoning = `Rule: Reorder quantity calculated as (threshold * 3) - current (${product.reorder_threshold * 3} - ${product.stock_level}).`;

    // Save to DB
    if (suggestionType === 'pricing' || suggestionType === 'both') {
      PricingSuggestionModel.create({
        productId: product.id,
        currentPrice: product.current_price,
        suggestedPrice,
        changeDirection,
        confidence: 0.8,
        reasoning: priceReasoning,
        triggerReason,
        strategyUsed: 'rule-based'
      });
    }

    if (suggestionType === 'reorder' || suggestionType === 'both') {
      ReorderSuggestionModel.create({
        productId: product.id,
        currentStock: product.stock_level,
        suggestedQuantity,
        suggestedLeadTimeDays: 7, // rule-based fallback
        confidence: 0.8,
        reasoning: reorderReasoning,
        triggerReason,
        strategyUsed: 'rule-based'
      });
    }
  }
}

class AIStrategy extends PricingStrategy {
  constructor() {
    super();
    this.advisor = new AIAdvisor();
    this.fallbackStrategy = new RuleBasedStrategy();
  }

  async execute(product, triggerReason, suggestionType = 'both') {
    try {
      const categoryAvgVelocity = ProductModel.getCategoryAvgVelocity(product.category);
      
      const aiResult = await this.advisor.generateSuggestions({ 
        product, 
        triggerReason,
        categoryAvgVelocity
      });
      
      if (!aiResult) {
        throw new Error("AI returned empty result");
      }

      if (suggestionType === 'pricing' || suggestionType === 'both') {
        PricingSuggestionModel.create({
          productId: product.id,
          currentPrice: product.current_price,
          suggestedPrice: aiResult.suggestedPrice,
          changeDirection: aiResult.changeDirection,
          confidence: aiResult.priceConfidence,
          reasoning: aiResult.priceReasoning,
          triggerReason,
          strategyUsed: 'ai'
        });
      }

      if (suggestionType === 'reorder' || suggestionType === 'both') {
        ReorderSuggestionModel.create({
          productId: product.id,
          currentStock: product.stock_level,
          suggestedQuantity: aiResult.suggestedQuantity,
          suggestedLeadTimeDays: aiResult.suggestedLeadTimeDays,
          confidence: aiResult.reorderConfidence,
          reasoning: aiResult.reorderReasoning,
          triggerReason,
          strategyUsed: 'ai'
        });
      }
    } catch (err) {
      console.warn(`[AI Strategy] Failed for ${product.id} (${err.message}). Falling back to Rule-Based.`);
      return this.fallbackStrategy.execute(product, triggerReason, suggestionType);
    }
  }
}

module.exports = {
  RuleBasedStrategy,
  AIStrategy
};
