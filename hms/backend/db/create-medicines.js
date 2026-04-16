import { query } from "../config/db.js";

async function setupMedicinesTable() {
  const createTable = `
    CREATE TABLE IF NOT EXISTS medicines (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      manufacturer VARCHAR(150),
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      min_stock_level INTEGER DEFAULT 10,
      expiry_date DATE,
      batch_number VARCHAR(50),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
    CREATE INDEX IF NOT EXISTS idx_medicines_manufacturer ON medicines(manufacturer);
    CREATE INDEX IF NOT EXISTS idx_medicines_expiry ON medicines(expiry_date);
  `;

  try {
    await query(createTable);
    console.log("✅ Medicines table created");
    await query(createIndexes);
    console.log("✅ Indexes created");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

setupMedicinesTable();