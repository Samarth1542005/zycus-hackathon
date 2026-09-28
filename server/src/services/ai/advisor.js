const llmGateway = require('./llmGateway');

class AIAdvisor {
  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'groq';
    this.apiKey = process.env.GROQ_API_KEY; 
    this.model = process.env.LLM_MODEL || 'llama3-8b-8192'; // Using llama3 on Groq as default
  }

  async generateSuggestions(context) {
    if (!this.apiKey && this.provider === 'groq') {
      console.warn("No GROQ_API_KEY found, failing AI call intentionally to trigger fallback.");
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
      const responseText = await llmGateway.callLLM(prompt, this.provider, this.apiKey, this.model);
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleaned);

      // Validation Step
      if (typeof result.suggestedPrice !== 'number' || result.suggestedPrice <= 0) throw new Error("Invalid price");
      if (result.suggestedPrice > product.current_price * 2 || result.suggestedPrice < product.current_price * 0.5) {
        throw new Error("Price out of sane bounds (0.5x - 2.0x)");
      }
      
      if (!Number.isInteger(result.suggestedQuantity) || result.suggestedQuantity <= 0) throw new Error("Invalid quantity");
      if (!Number.isInteger(result.suggestedLeadTimeDays) || result.suggestedLeadTimeDays <= 0) throw new Error("Invalid lead time");

      return result;
    } catch (e) {
      console.error("[AIAdvisor] Error calling LLM or parsing response:", e.message);
      return null; // Return null to trigger Rule-Based fallback
    }
  }
}

module.exports = { AIAdvisor };
