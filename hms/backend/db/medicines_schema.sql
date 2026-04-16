-- Medicines table for pharmacy inventory
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

CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_manufacturer ON medicines(manufacturer);
CREATE INDEX IF NOT EXISTS idx_medicines_expiry ON medicines(expiry_date);

-- Medicine batches table for batch tracking
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

CREATE INDEX IF NOT EXISTS idx_batches_medicine_id ON medicine_batches(medicine_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON medicine_batches(expiry_date);

-- Medicine stock movement history
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

CREATE INDEX IF NOT EXISTS idx_stock_movements_medicine ON medicine_stock_movements(medicine_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON medicine_stock_movements(created_at);

-- Low stock alerts view
CREATE OR REPLACE VIEW view_low_stock_alerts AS
SELECT 
  m.id,
  m.name,
  m.manufacturer,
  m.stock,
  m.min_stock_level,
  m.expiry_date,
  CASE 
    WHEN m.stock = 0 THEN 'Out of Stock'
    WHEN m.expiry_date < CURRENT_DATE THEN 'Expired'
    WHEN m.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
    WHEN m.stock < m.min_stock_level THEN 'Low Stock'
    ELSE 'Active'
  END AS status
FROM medicines m
WHERE m.stock < m.min_stock_level 
   OR m.expiry_date < CURRENT_DATE + INTERVAL '30 days'
ORDER BY 
  CASE 
    WHEN m.stock = 0 THEN 0
    WHEN m.expiry_date < CURRENT_DATE THEN 1
    ELSE 2
  END;