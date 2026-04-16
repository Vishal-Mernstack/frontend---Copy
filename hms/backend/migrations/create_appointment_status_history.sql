CREATE TABLE IF NOT EXISTS appointment_status_history (
  id              SERIAL PRIMARY KEY,
  appointment_id  INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  old_status      VARCHAR(50),
  new_status      VARCHAR(50) NOT NULL,
  status_reason   TEXT,
  changed_by      INTEGER REFERENCES users(id),
  changed_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ash_appointment_id
  ON appointment_status_history(appointment_id);

-- Verify table exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'appointment_status_history';
