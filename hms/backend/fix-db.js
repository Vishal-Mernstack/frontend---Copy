import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const tables = ['patients', 'doctors', 'lab_orders', 'billing', 'appointments'];
    for (const table of tables) {
      console.log(`Adding columns to ${table}...`);
      await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`);
      await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
    }
    console.log('Successfully completed schema updates');
  } catch (err) {
    console.error('Error updating schema:', err);
  } finally {
    pool.end();
  }
}
run();
