import { query } from './config/db.js';

async function fixSchema() {
  console.log('Fixing database schema...\n');

  // 1. Add status_reason column to appointments
  try {
    await query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status_reason TEXT`);
    console.log('✅ Added status_reason column to appointments');
  } catch (e) {
    console.log('⚠️  status_reason:', e.message);
  }

  // 2. Create appointment_status_history table
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS appointment_status_history (
        id SERIAL PRIMARY KEY,
        appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE,
        previous_status VARCHAR(50),
        new_status VARCHAR(50),
        reason TEXT,
        changed_by INTEGER REFERENCES users(id),
        changed_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created appointment_status_history table');
  } catch (e) {
    console.log('⚠️  appointment_status_history:', e.message);
  }

  console.log('\nSchema fixes complete.');
  process.exit(0);
}

fixSchema();
