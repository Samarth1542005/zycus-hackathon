const llmGateway = require('./llmGateway');

class AIAdvisor {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.model = process.env.LLM_MODEL || 'openai/gpt-oss-20b';
  }

  async generateSuggestions(context) {
    if (!this.apiKey) {
      console.warn('No GROQ_API_KEY found, failing AI call intentionally to trigger fallback.');
      return null;
    }

    const { product, triggerReason, categoryAvgVelocity } = context;

    let prompt = '';
    
    // T-3 TWO PROMPTS implementation
    if (triggerReason === 'INVENTORY_LOW') {
      prompt = `
      You are an expert retail merchandiser. The following product has critically LOW INVENTORY.
      Product: ${product.name} (SKU: ${product.sku})
      Category: ${product.category}
      Current Price: $${product.current_price}
      Cost Price: $${product.cost_price} (Margin Floor: ${(product.margin_floor * 100).toFixed(0)}%)
      Stock Level: ${product.stock_level} (Reorder Threshold: ${product.reorder_threshold})
      Demand Velocity: ${product.demand_velocity} orders/day (Category Average: ${categoryAvgVelocity})

      Decide whether to INCREASE price to protect remaining inventory, DECREASE to clear it out, or HOLD.
      Also recommend an urgent reorder quantity and lead time.

      Provide ONLY a JSON object with this exact structure, no markdown formatting:
      {
        "suggestedPrice": number (must be > 0 and between 0.5x and 2.0x of current price),
        "changeDirection": "INCREASE" | "DECREASE" | "HOLD",
        "priceConfidence": number (0.0 to 1.0),
        "priceReasoning": "string",
        "suggestedQuantity": number (must be integer > 0),
        "suggestedLeadTimeDays": number (must be integer > 0),
        "reorderConfidence": number (0.0 to 1.0),
        "reorderReasoning": "string"
      }`;
    } else if (triggerReason === 'DEMAND_SPIKE') {
      prompt = `
      You are an expert retail merchandiser. The following product is experiencing a massive DEMAND SPIKE.
      Product: ${product.name} (SKU: ${product.sku})
      Category: ${product.category}
      Current Price: $${product.current_price}
      Cost Price: $${product.cost_price} (Margin Floor: ${(product.margin_floor * 100).toFixed(0)}%)
      Stock Level: ${product.stock_level} (Reorder Threshold: ${product.reorder_threshold})
      Demand Velocity: ${product.demand_velocity} orders/day (Category Average: ${categoryAvgVelocity})

      Decide how to capitalize on this spike. You should likely INCREASE the price modestly, and place a large reorder to capture momentum.

      Provide ONLY a JSON object with this exact structure, no markdown formatting:
      {
        "suggestedPrice": number (must be > 0 and between 0.5x and 2.0x of current price),
        "changeDirection": "INCREASE" | "DECREASE" | "HOLD",
        "priceConfidence": number (0.0 to 1.0),
        "priceReasoning": "string",
        "suggestedQuantity": number (must be integer > 0),
        "suggestedLeadTimeDays": number (must be integer > 0),
        "reorderConfidence": number (0.0 to 1.0),
        "reorderReasoning": "string"
      }`;
    } else {
      prompt = `
      You are an expert retail merchandiser reviewing a product.
      Product: ${product.name} (SKU: ${product.sku})
      Category: ${product.category}
      Current Price: $${product.current_price}
      Cost Price: $${product.cost_price} (Margin Floor: ${(product.margin_floor * 100).toFixed(0)}%)
      Stock Level: ${product.stock_level}
      Demand Velocity: ${product.demand_velocity} orders/day (Category Average: ${categoryAvgVelocity})
      
      Review the price and reorder status.
      Provide ONLY a JSON object with this exact structure, no markdown formatting:
      {
        "suggestedPrice": number (must be > 0 and between 0.5x and 2.0x of current price),
        "changeDirection": "INCREASE" | "DECREASE" | "HOLD",
        "priceConfidence": number (0.0 to 1.0),
        "priceReasoning": "string",
        "suggestedQuantity": number (must be integer > 0),
        "suggestedLeadTimeDays": number (must be integer > 0),
        "reorderConfidence": number (0.0 to 1.0),
        "reorderReasoning": "string"
      }`;
    }

    try {
      const result = await llmGateway.callLLM(prompt, {
        apiKey: this.apiKey,
        model: this.model
      });

      if (!Number.isFinite(result.suggestedPrice) || result.suggestedPrice <= 0) throw new Error("Invalid price");
      if (result.suggestedPrice > product.current_price * 2 || result.suggestedPrice < product.current_price * 0.5) {
        throw new Error("Price out of sane bounds (0.5x - 2.0x)");
      }
      const minimumPrice = product.cost_price / (1 - product.margin_floor);
      if (result.suggestedPrice < minimumPrice) throw new Error("Price violates margin floor");

      if (!Number.isInteger(result.suggestedQuantity) || result.suggestedQuantity <= 0) throw new Error("Invalid quantity");
      if (!Number.isInteger(result.suggestedLeadTimeDays) || result.suggestedLeadTimeDays <= 0) throw new Error("Invalid lead time");
      if (!isConfidenceScore(result.priceConfidence) || !isConfidenceScore(result.reorderConfidence)) {
        throw new Error("Invalid confidence score");
      }
      if (!['INCREASE', 'DECREASE', 'HOLD'].includes(result.changeDirection)) throw new Error("Invalid change direction");
      if (typeof result.priceReasoning !== 'string' || !result.priceReasoning.trim()) throw new Error("Invalid price reasoning");
      if (typeof result.reorderReasoning !== 'string' || !result.reorderReasoning.trim()) throw new Error("Invalid reorder reasoning");

      return result;
    } catch (e) {
      console.error("[AIAdvisor] Error calling LLM or parsing response:", e.message);
      return null; // Return null to trigger Rule-Based fallback
    }
  }
}

function isConfidenceScore(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

module.exports = { AIAdvisor };
