-- Migration: add status_reason column to appointments table
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS status_reason TEXT DEFAULT NULL;

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'appointments'
  AND column_name = 'status_reason';
