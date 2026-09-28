const { callLLM } = require('./llmGateway');

/**
 * AI Commerce Advisor
 * Generates pricing and reorder suggestions using an LLM.
 */
class AIAdvisor {
  constructor(apiKey, model) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateSuggestions({ product, triggerType }) {
    const prompt = `
      Product Context:
      - ID: ${product.id}
      - SKU: ${product.sku}
      - Name: ${product.name}
      - Category: ${product.category}
      - Current Price: $${product.current_price.toFixed(2)}
      - Current Stock: ${product.stock_level} units
      - Reorder Threshold: ${product.reorder_threshold} units
      - Demand Velocity: ${product.demand_velocity} units sold per day
      - Trigger Reason: ${triggerType === 'AUTO_LOW_STOCK' ? 'Inventory dropped below reorder threshold.' : triggerType === 'AUTO_DEMAND_SPIKE' ? 'Sudden spike in demand velocity.' : 'Manual review requested.'}

      Task:
      Based on the above context, recommend a new price and a reorder quantity.
      If the stock is very low, you might want to raise the price slightly to protect remaining inventory and reorder more.
      If it's a demand spike, a modest price increase might capture more margin.
      If stock is zero, we desperately need a restock.

      Output JSON strictly in the following format:
      {
        "pricing": {
          "suggestedPrice": 0.0,
          "confidence": 0.0, // 0.0 to 1.0
          "reasoning": "Explain why this price makes sense in 1-2 sentences."
        },
        "reorder": {
          "suggestedQuantity": 0,
          "confidence": 0.0, // 0.0 to 1.0
          "reasoning": "Explain why this reorder quantity makes sense in 1-2 sentences."
        }
      }
    `;

    try {
      const response = await callLLM(prompt, { apiKey: this.apiKey, model: this.model });
      
      // Validate response shape
      if (!response.pricing || !response.reorder) {
        throw new Error('LLM response missing pricing or reorder properties');
      }

      return {
        suggestedPrice: response.pricing.suggestedPrice || product.current_price,
        priceConfidence: response.pricing.confidence || 0.5,
        priceReasoning: response.pricing.reasoning || 'AI provided no reasoning.',
        suggestedQuantity: response.reorder.suggestedQuantity || 0,
        reorderConfidence: response.reorder.confidence || 0.5,
        reorderReasoning: response.reorder.reasoning || 'AI provided no reasoning.',
      };
    } catch (error) {
      console.error('AIAdvisor failed to generate suggestions:', error);
      // Fallback to rule-based if AI fails
      return null; 
    }
  }
}

module.exports = { AIAdvisor };
