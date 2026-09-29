const { ProductModel, InventorySnapshotModel, PricingSuggestionModel, ReorderSuggestionModel } = require('../../models');
const engine = require('../engine');

class TriggerService {
  constructor() {
    this.inFlightProducts = new Set();
  }
  
  /**
   * Evaluates if an inventory or demand event should trigger an automated action
   * @param {string} productId 
   */
  async evaluate(productId, { demandSpike = false } = {}) {
    const product = ProductModel.findById(productId);
    if (!product) return;

    let triggerReason = null;
    const categoryAvgVelocity = ProductModel.getCategoryAvgVelocity(product.category);
    const demandSpikeThreshold = categoryAvgVelocity > 0 ? categoryAvgVelocity * 2 : 10;

    // A new velocity spike takes precedence when the same order also lowers stock.
    if (demandSpike) {
      triggerReason = 'DEMAND_SPIKE';
    } else if (product.stock_level < product.reorder_threshold && product.stock_level > 0) {
      triggerReason = 'INVENTORY_LOW';
    } else if (product.demand_velocity >= demandSpikeThreshold) {
      triggerReason = 'DEMAND_SPIKE';
    }

    // If there's a trigger, check if we already have pending suggestions
    if (triggerReason) {
      const hasPendingPricing = PricingSuggestionModel.hasPendingForProduct(product.id);
      const hasPendingReorder = ReorderSuggestionModel.hasPendingForProduct(product.id);
      
      if ((!hasPendingPricing || !hasPendingReorder) && !this.inFlightProducts.has(product.id)) {
        ProductModel.updateStatus(product.id, 'PRICE_REVIEW_PENDING');
        this.inFlightProducts.add(product.id);
        const suggestionType = hasPendingPricing ? 'reorder' : hasPendingReorder ? 'pricing' : 'both';
        // Queue the suggestion generation asynchronously (agentic loop)
        engine.processTrigger(product, triggerReason, suggestionType)
          .catch(error => {
            ProductModel.updateStatus(product.id, product.stock_level <= 0 ? 'OUT_OF_STOCK' : 'ACTIVE');
            console.error(`[Trigger] Failed to generate suggestions for ${product.sku}:`, error.message);
          })
          .finally(() => this.inFlightProducts.delete(product.id));
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

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Order quantity must be a positive integer');
    }

    const categoryAvgVelocityBeforeOrder = ProductModel.getCategoryAvgVelocity(product.category);

    // Update stock and model a sale burst as one order per unit.
    const newStock = product.stock_level - quantity;
    ProductModel.updateStock(productId, newStock);

    const previousVelocity = product.demand_velocity;
    const newVelocity = previousVelocity + quantity;
    ProductModel.updateVelocity(productId, newVelocity);

    const demandSpikeThreshold = categoryAvgVelocityBeforeOrder > 0 ? categoryAvgVelocityBeforeOrder * 2 : 10;
    const demandSpike = previousVelocity < demandSpikeThreshold && newVelocity >= demandSpikeThreshold;
    InventorySnapshotModel.create({
      productId,
      stockLevel: newStock,
      demandVelocity: newVelocity,
      triggerType: demandSpike ? 'DEMAND_SPIKE' : null
    });

    // Evaluate triggers
    await this.evaluate(productId, { demandSpike });
    
    return ProductModel.findById(productId);
  }
}

module.exports = new TriggerService();
