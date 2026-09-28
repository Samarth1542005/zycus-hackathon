const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'stockpulse.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
    seedIfEmpty();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('ELECTRONICS', 'APPAREL', 'HOME')),
      current_price REAL NOT NULL,
      stock_level INTEGER NOT NULL DEFAULT 0,
      reorder_threshold INTEGER NOT NULL DEFAULT 10,
      demand_velocity REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK(status IN ('ACTIVE', 'PRICE_REVIEW_PENDING', 'LOW_STOCK', 'OUT_OF_STOCK')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL REFERENCES products(id),
      stock_level INTEGER NOT NULL,
      demand_velocity REAL NOT NULL,
      trigger_type TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pricing_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL REFERENCES products(id),
      current_price REAL NOT NULL,
      suggested_price REAL NOT NULL,
      price_change_pct REAL NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.5,
      reasoning TEXT,
      trigger_type TEXT NOT NULL CHECK(trigger_type IN ('AUTO_LOW_STOCK', 'AUTO_DEMAND_SPIKE', 'MANUAL')),
      strategy_used TEXT NOT NULL DEFAULT 'rule-based',
      status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reorder_suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id TEXT NOT NULL REFERENCES products(id),
      current_stock INTEGER NOT NULL,
      suggested_quantity INTEGER NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.5,
      reasoning TEXT,
      trigger_type TEXT NOT NULL CHECK(trigger_type IN ('AUTO_LOW_STOCK', 'AUTO_DEMAND_SPIKE', 'MANUAL')),
      strategy_used TEXT NOT NULL DEFAULT 'rule-based',
      status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_pricing_status ON pricing_suggestions(status);
    CREATE INDEX IF NOT EXISTS idx_reorder_status ON reorder_suggestions(status);
    CREATE INDEX IF NOT EXISTS idx_snapshots_product ON inventory_snapshots(product_id);
  `);
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
  if (count.cnt > 0) return;

  const insert = db.prepare(`
    INSERT INTO products (id, sku, name, category, current_price, stock_level, reorder_threshold, demand_velocity, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const products = [
    ['PRD-001', 'SKU-ELEC-001', 'Wireless Earbuds Pro',     'ELECTRONICS', 79.99,  45,  20, 3,  'ACTIVE'],
    ['PRD-002', 'SKU-ELEC-002', 'USB-C Hub 7-Port',         'ELECTRONICS', 34.99,  120, 30, 1,  'ACTIVE'],
    ['PRD-003', 'SKU-APP-001',  'Organic Cotton T-Shirt',    'APPAREL',     24.99,  8,   15, 12, 'PRICE_REVIEW_PENDING'],
    ['PRD-004', 'SKU-APP-002',  'Running Shorts — Navy',     'APPAREL',     39.99,  55,  20, 2,  'ACTIVE'],
    ['PRD-005', 'SKU-HOME-001', 'Ceramic Pour-Over Set',     'HOME',        49.99,  22,  10, 4,  'ACTIVE'],
    ['PRD-006', 'SKU-HOME-002', 'LED Desk Lamp — Dimmable',  'HOME',        59.99,  0,   15, 0,  'OUT_OF_STOCK'],
    ['PRD-007', 'SKU-ELEC-003', 'Portable Charger 20K',      'ELECTRONICS', 44.99,  18,  25, 8,  'ACTIVE'],
    ['PRD-008', 'SKU-APP-003',  'Hoodie — Heather Grey',     'APPAREL',     54.99,  11,  12, 15, 'ACTIVE'],
  ];

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(...item);
    }
  });

  insertMany(products);
  console.log('✅ Database seeded with 8 products');
}

module.exports = { getDb };
