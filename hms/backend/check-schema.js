import { query } from './config/db.js';

const result = await query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'appointments' ORDER BY ordinal_position`);
console.log('APPOINTMENTS COLUMNS:', result.rows.map(c => c.column_name).join(', '));

const result2 = await query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'billing' ORDER BY ordinal_position`);
console.log('BILLING COLUMNS:', result2.rows.map(c => c.column_name).join(', '));

// Check if appointment_status_history table exists
const result3 = await query(`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointment_status_history') AS exists`);
console.log('appointment_status_history exists:', result3.rows[0].exists);

process.exit(0);
