import pg from "pg";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then((client) => {
    console.log("Connected to PostgreSQL");
    client.release();
  })
  .catch((error) => {
    console.error("PostgreSQL connection error", error.message);
  });

export const query = (text, params) => pool.query(text, params);
export const getClient = () => pool.connect();
export { pool };

const runMigrations = async () => {
  try {
    console.log("Running database migrations...");
    
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medicines' AND column_name = 'min_stock_level') THEN
          ALTER TABLE medicines ADD COLUMN min_stock_level INTEGER DEFAULT 10;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medicines' AND column_name = 'expiry_date') THEN
          ALTER TABLE medicines ADD COLUMN expiry_date DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medicines' AND column_name = 'batch_number') THEN
          ALTER TABLE medicines ADD COLUMN batch_number VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medicines' AND column_name = 'created_at') THEN
          ALTER TABLE medicines ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medicines' AND column_name = 'updated_at') THEN
          ALTER TABLE medicines ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        END IF;
      END $$;
    `);
    console.log("Medicine table migrated");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS medicine_batches (
        id SERIAL PRIMARY KEY,
        medicine_id INT REFERENCES medicines(id) ON DELETE CASCADE,
        batch_number VARCHAR(50) NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        expiry_date DATE,
        purchase_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(medicine_id, batch_number)
      )
    `);
    console.log("Medicine batches table ready");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS medicine_stock_movements (
        id SERIAL PRIMARY KEY,
        medicine_id INT REFERENCES medicines(id) ON DELETE CASCADE,
        batch_id INT REFERENCES medicine_batches(id) ON DELETE SET NULL,
        quantity INT NOT NULL,
        movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'EXPIRED', 'RETURN')),
        reference_type VARCHAR(50),
        reference_id INT,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by INT REFERENCES users(id)
      )
    `);
    console.log("Medicine stock movements table ready");

    console.log("All migrations complete");
  } catch (error) {
    console.error("Migration error:", error.message);
  }
};

pool.on("connect", () => {
  runMigrations();
});
