-- UPI Configuration Table (admin-only settings)
CREATE TABLE IF NOT EXISTS upi_config (
  id SERIAL PRIMARY KEY,
  upi_id VARCHAR(100) NOT NULL,
  merchant_name VARCHAR(150) NOT NULL,
  merchant_code VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Payment Transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id SERIAL PRIMARY KEY,
  billing_id INTEGER NOT NULL REFERENCES billing(id) ON DELETE CASCADE,
  transaction_id VARCHAR(100) UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  upi_reference VARCHAR(100),
  notes TEXT,
  processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_billing ON payment_transactions(billing_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_method ON payment_transactions(payment_method);

-- Insert default UPI config if not exists
INSERT INTO upi_config (upi_id, merchant_name, merchant_code, is_active)
SELECT 'medicarehospital@upi', 'Medicare Hospital', 'MEDI001', true
WHERE NOT EXISTS (SELECT 1 FROM upi_config WHERE upi_id = 'medicarehospital@upi');
