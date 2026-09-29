process.env.STRATEGY = 'rule-based';

const triggerService = require('../src/services/triggers');
const {
  ProductModel,
  PricingSuggestionModel,
  ReorderSuggestionModel,
  InventorySnapshotModel,
  resetState
} = require('../src/models');

async function run() {
  resetState();
  const initialProduct = ProductModel.findById('PRD-008');
  const initialVelocity = initialProduct.demand_velocity;
  await triggerService.simulateOrder('PRD-008', 5);
  await new Promise(resolve => setTimeout(resolve, 10));

  const pricing = PricingSuggestionModel.findPending().filter(suggestion => suggestion.product_id === 'PRD-008');
  const reorder = ReorderSuggestionModel.findPending().filter(suggestion => suggestion.product_id === 'PRD-008');
  const snapshots = InventorySnapshotModel.findByProduct('PRD-008');

  assert(pricing.length === 1, `expected one pricing suggestion, got ${pricing.length}`);
  assert(reorder.length === 1, `expected one reorder suggestion, got ${reorder.length}`);
  assert(pricing[0].triggerReason === 'DEMAND_SPIKE', `unexpected trigger: ${pricing[0].triggerReason}`);
  assert(snapshots.length === 1, 'expected an inventory snapshot');

  await assertRejects(
    () => triggerService.simulateOrder('PRD-008', 0),
    'Order quantity must be a positive integer'
  );

  console.log(`Smoke test passed: PRD-008 velocity ${initialVelocity} -> ${ProductModel.findById('PRD-008').demand_velocity}`);
}

async function assertRejects(action, expectedMessage) {
  try {
    await action();
  } catch (error) {
    assert(error.message === expectedMessage, `unexpected validation message: ${error.message}`);
    return;
  }
  throw new Error('expected action to reject');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

run().catch(error => {
  console.error(`Smoke test failed: ${error.message}`);
  process.exitCode = 1;
});
