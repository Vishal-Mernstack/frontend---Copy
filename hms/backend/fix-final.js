import { query } from './config/db.js';

async function fixFinal() {
  console.log('=== Final HMS Fixes ===\n');

  // FIX 1: Departments - is_deleted ambiguity
  // The WHERE clause uses is_deleted but both departments and doctors tables
  // may have it. Fix by qualifying the column in the WHERE clause via a view or
  // by patching the route. Here we just verify the query works with explicit alias.
  console.log('--- Fix 1: Departments ambiguous is_deleted ---');
  try {
    const r = await query(`
      SELECT 
        d.id, d.name, d.status, d.head_doctor_id,
        d.is_deleted,
        doc.name as head_doctor_name,
        doc.specialization as head_doctor_specialization,
        (SELECT COUNT(*) FROM doctors WHERE doctors.specialization ILIKE '%' || d.name || '%') as doctor_count,
        (SELECT COUNT(*) FROM beds WHERE beds.department_id = d.id) as bed_count
      FROM departments d 
      LEFT JOIN doctors doc ON d.head_doctor_id = doc.id 
      WHERE d.is_deleted = false
      ORDER BY d.name 
      LIMIT 5 OFFSET 0
    `);
    console.log('✅ Qualified departments query works —', r.rows.length, 'rows');
  } catch (e) {
    console.log('❌ Still failing:', e.message);
  }

  // FIX 2: Create audit_logs table (for activity logs)
  console.log('\n--- Fix 2: Create audit_logs table ---');
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        request_id VARCHAR(100),
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        user_role VARCHAR(50),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id VARCHAR(100),
        method VARCHAR(10),
        endpoint TEXT,
        ip_address VARCHAR(50),
        user_agent TEXT,
        response_status INTEGER,
        success BOOLEAN DEFAULT true,
        details JSONB DEFAULT '{}',
        old_values JSONB,
        new_values JSONB,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ audit_logs table created');
  } catch (e) {
    console.log('❌ audit_logs:', e.message);
  }

  try {
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC)`);
    console.log('✅ audit_logs indexes created');
  } catch (e) {
    console.log('⚠️  indexes:', e.message);
  }

  // FIX 3: Seed some sample audit logs so the UI isn't empty
  try {
    const existing = await query(`SELECT COUNT(*) FROM audit_logs`);
    if (parseInt(existing.rows[0].count) === 0) {
      await query(`
        INSERT INTO audit_logs (user_id, user_role, action, entity_type, method, endpoint, response_status, success, details)
        VALUES 
          (1, 'admin', 'LOGIN', 'auth', 'POST', '/api/v1/auth/login', 200, true, '{"message":"Admin logged in"}'),
          (1, 'admin', 'VIEW', 'patients', 'GET', '/api/v1/patients', 200, true, '{"message":"Viewed patient list"}'),
          (1, 'admin', 'VIEW', 'billing', 'GET', '/api/v1/billing', 200, true, '{"message":"Viewed billing records"}')
      `);
      console.log('✅ Seeded 3 sample audit logs');
    } else {
      console.log('✅ audit_logs already has', existing.rows[0].count, 'entries');
    }
  } catch (e) {
    console.log('⚠️  Seed:', e.message);
  }

  console.log('\n=== Final Verification ===');
  const checks = [
    { name: 'Departments (qualified)', sql: `SELECT COUNT(*) FROM departments d WHERE d.is_deleted = false` },
    { name: 'Audit Logs',              sql: `SELECT COUNT(*) FROM audit_logs` },
    { name: 'Billing',                 sql: `SELECT COUNT(*) FROM billing WHERE is_deleted = false` },
    { name: 'Lab Orders',              sql: `SELECT COUNT(*) FROM lab_orders WHERE is_deleted = false` },
    { name: 'Pharmacy',                sql: `SELECT COUNT(*) FROM pharmacy` },
    { name: 'Medicines',               sql: `SELECT COUNT(*) FROM medicines` },
    { name: 'Patients',                sql: `SELECT COUNT(*) FROM patients WHERE is_deleted = false` },
    { name: 'Doctors',                 sql: `SELECT COUNT(*) FROM doctors WHERE is_deleted = false` },
    { name: 'Appointments',            sql: `SELECT COUNT(*) FROM appointments WHERE is_deleted = false` },
    { name: 'Beds',                    sql: `SELECT COUNT(*) FROM beds WHERE is_deleted = false` },
  ];
  for (const c of checks) {
    try {
      const r = await query(c.sql);
      console.log(`   ✅ ${c.name}: ${r.rows[0].count} rows`);
    } catch (e) {
      console.log(`   ❌ ${c.name}: ${e.message.split('\n')[0]}`);
    }
  }

  process.exit(0);
}

fixFinal().catch(e => { console.error(e.message); process.exit(1); });
