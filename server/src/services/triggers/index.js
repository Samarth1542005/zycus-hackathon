const { ProductModel, SnapshotModel, PricingSuggestionModel, ReorderSuggestionModel } = require('../../models');
const engine = require('../engine');

const DEMAND_SPIKE_THRESHOLD = 10; // Units sold per day that constitutes a spike

class TriggerService {
  
  /**
   * Evaluates if an inventory or demand event should trigger an automated action
   * @param {string} productId 
   */
  async evaluate(productId) {
    const product = ProductModel.findById(productId);
    if (!product) return;

    let triggerType = null;

    // Check for LOW_STOCK trigger
    if (product.stock_level < product.reorder_threshold && product.stock_level > 0) {
      triggerType = 'AUTO_LOW_STOCK';
    } 
    // Check for DEMAND_SPIKE trigger
    else if (product.demand_velocity >= DEMAND_SPIKE_THRESHOLD) {
      triggerType = 'AUTO_DEMAND_SPIKE';
    }

    // Always take a snapshot
    SnapshotModel.create(product.id, product.stock_level, product.demand_velocity, triggerType);

    // If there's a trigger, check if we already have pending suggestions
    if (triggerType) {
      const hasPendingPricing = PricingSuggestionModel.hasPendingForProduct(product.id);
      const hasPendingReorder = ReorderSuggestionModel.hasPendingForProduct(product.id);
      
      if (!hasPendingPricing && !hasPendingReorder) {
        ProductModel.updateStatus(product.id, 'PRICE_REVIEW_PENDING');
        // Queue the suggestion generation
        engine.processTrigger(product, triggerType);
      } else {
        console.log(`[Trigger] ${product.sku} triggered ${triggerType}, but already has pending suggestions. Ignored.`);
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
