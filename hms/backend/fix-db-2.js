import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    await pool.query(`ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS file_url VARCHAR(1000)`);
    console.log('Successfully completed schema updates');
  } catch (err) {
    console.error('Error updating schema:', err);
  } finally {
    pool.end();
  }
}
run();
