-- Migration: Add pharmacy upgrade columns to existing medicines table
-- Run this SQL to add the missing columns for the pharmacy upgrade

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add min_stock_level column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medicines' AND column_name = 'min_stock_level') THEN
    ALTER TABLE medicines ADD COLUMN min_stock_level INTEGER DEFAULT 10;
  END IF;
  
  -- Add expiry_date column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medicines' AND column_name = 'expiry_date') THEN
    ALTER TABLE medicines ADD COLUMN expiry_date DATE;
  END IF;
  
  -- Add batch_number column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medicines' AND column_name = 'batch_number') THEN
    ALTER TABLE medicines ADD COLUMN batch_number VARCHAR(50);
  END IF;
  
  -- Add created_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medicines' AND column_name = 'created_at') THEN
    ALTER TABLE medicines ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
  END IF;
  
  -- Add updated_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medicines' AND column_name = 'updated_at') THEN
    ALTER TABLE medicines ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- Create medicine_batches table if not exists
CREATE TABLE IF NOT EXISTS medicine_batches (
  id SERIAL PRIMARY KEY,
  medicine_id INT REFERENCES medicines(id) ON DELETE CASCADE,
  batch_number VARCHAR(50) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  expiry_date DATE,
  purchase_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(medicine_id, batch_number)
);

-- Create stock movements table if not exists  
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
);

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_medicines_expiry ON medicines(expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_medicine_id ON medicine_batches(medicine_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON medicine_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_medicine ON medicine_stock_movements(medicine_id);