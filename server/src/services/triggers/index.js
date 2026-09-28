const { ProductModel, PricingSuggestionModel, ReorderSuggestionModel } = require('../../models');
const engine = require('../engine');

class TriggerService {
  
  /**
   * Evaluates if an inventory or demand event should trigger an automated action
   * @param {string} productId 
   */
  async evaluate(productId) {
    const product = ProductModel.findById(productId);
    if (!product) return;

    let triggerReason = null;
    const categoryAvgVelocity = ProductModel.getCategoryAvgVelocity(product.category);
    const demandSpikeThreshold = categoryAvgVelocity > 0 ? categoryAvgVelocity * 3 : 10;

    // Check for INVENTORY_LOW trigger
    if (product.stock_level < product.reorder_threshold && product.stock_level > 0) {
      triggerReason = 'INVENTORY_LOW';
    } 
    // Check for DEMAND_SPIKE trigger
    else if (product.demand_velocity >= demandSpikeThreshold) {
      triggerReason = 'DEMAND_SPIKE';
    }

    // If there's a trigger, check if we already have pending suggestions
    if (triggerReason) {
      const hasPendingPricing = PricingSuggestionModel.hasPendingForProduct(product.id);
      const hasPendingReorder = ReorderSuggestionModel.hasPendingForProduct(product.id);
      
      if (!hasPendingPricing && !hasPendingReorder) {
        ProductModel.updateStatus(product.id, 'PRICE_REVIEW_PENDING');
        // Queue the suggestion generation asynchronously (agentic loop)
        engine.processTrigger(product, triggerReason);
      } else {
        console.log(`[Trigger] ${product.sku} triggered ${triggerReason}, but already has pending suggestions. Ignored.`);
      }
    } else if (product.stock_level <= 0) {
       ProductModel.updateStatus(product.id, 'OUT_OF_STOCK');
    }
  }

  /**
   * Simulates an order which reduces stock and possibly increases demand velocity
   * @param {string} productId 
   * @param {number} quantity 
   */
  async simulateOrder(productId, quantity = 1) {
    const product = ProductModel.findById(productId);
    if (!product) throw new Error('Product not found');
    
    if (product.stock_level < quantity) {
      throw new Error(`Insufficient stock for ${product.sku}`);
    }

    // Update stock and simulate a slight velocity increase
    const newStock = product.stock_level - quantity;
    ProductModel.updateStock(productId, newStock);
    
    // Naive velocity increase for demo purposes
    const newVelocity = product.demand_velocity + (quantity * 0.5);
    ProductModel.updateVelocity(productId, newVelocity);

    // Evaluate triggers
    await this.evaluate(productId);
    
    return ProductModel.findById(productId);
  }
}

module.exports = new TriggerService();
