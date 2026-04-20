import { query } from './config/db.js';

async function fixDepartments() {
  console.log('=== Fixing Departments Table ===\n');

  // 1. Add missing head_doctor_id column
  try {
    await query(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS head_doctor_id INTEGER REFERENCES doctors(id) ON DELETE SET NULL`);
    console.log('✅ head_doctor_id column added (or already existed)');
  } catch (e) {
    console.log('❌ head_doctor_id:', e.message);
  }

  // 2. Add index if missing
  try {
    await query(`CREATE INDEX IF NOT EXISTS idx_departments_head ON departments(head_doctor_id)`);
    console.log('✅ Index on head_doctor_id ensured');
  } catch (e) {
    console.log('⚠️  Index:', e.message);
  }

  // 3. Show full departments schema
  try {
    const r = await query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'departments'
      ORDER BY ordinal_position
    `);
    console.log('\n📋 departments columns:');
    r.rows.forEach(c => console.log(`   ${c.column_name} (${c.data_type}) nullable=${c.is_nullable}`));
  } catch (e) {
    console.log('❌ Schema check:', e.message);
  }

  // 4. Test the departments query that was failing
  try {
    const r = await query(`
      SELECT d.id, d.name, d.status, d.head_doctor_id,
             doc.name as head_doctor_name
      FROM departments d
      LEFT JOIN doctors doc ON d.head_doctor_id = doc.id
      WHERE d.is_deleted = false
      ORDER BY d.name
      LIMIT 5
    `);
    console.log(`\n✅ Departments query OK — ${r.rows.length} rows returned`);
    if (r.rows.length > 0) {
      console.log('   Sample:', JSON.stringify(r.rows[0]));
    }
  } catch (e) {
    console.log('❌ Departments query still failing:', e.message);
  }

  // 5. Check all other key tables exist
  const tables = ['users', 'patients', 'doctors', 'appointments', 'billing_records',
                  'lab_tests', 'pharmacy_inventory', 'medicines', 'departments',
                  'staff', 'beds', 'admissions', 'notifications'];
  console.log('\n📦 Table existence check:');
  for (const t of tables) {
    try {
      const r = await query(`SELECT COUNT(*) FROM ${t}`);
      console.log(`   ✅ ${t} — ${r.rows[0].count} rows`);
    } catch (e) {
      console.log(`   ❌ ${t} — ${e.message}`);
    }
  }

  console.log('\n=== Fix Complete ===');
  process.exit(0);
}

fixDepartments().catch(e => { console.error(e); process.exit(1); });
