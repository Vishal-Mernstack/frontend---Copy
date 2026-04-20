import { query } from './config/db.js';

async function fixAllTables() {
  console.log('=== HMS Database Full Diagnostic & Fix ===\n');

  // 1. List ALL tables in the database
  const allTables = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  console.log('📋 All tables in database:');
  allTables.rows.forEach(t => console.log('   -', t.table_name));

  // 2. Check billing table
  console.log('\n--- Billing ---');
  try {
    const r = await query(`SELECT COUNT(*) FROM bills`);
    console.log('✅ bills:', r.rows[0].count, 'rows');
  } catch(e) { console.log('❌ bills:', e.message.split('\n')[0]); }
  try {
    const r = await query(`SELECT COUNT(*) FROM invoices`);
    console.log('✅ invoices:', r.rows[0].count, 'rows');
  } catch(e) { console.log('❌ invoices:', e.message.split('\n')[0]); }
  try {
    const r = await query(`SELECT COUNT(*) FROM billing`);
    console.log('✅ billing:', r.rows[0].count, 'rows');
  } catch(e) { console.log('❌ billing:', e.message.split('\n')[0]); }

  // 3. Check lab tables
  console.log('\n--- Lab ---');
  for (const t of ['lab_tests','lab_reports','lab_orders','lab_results','lab_test_orders']) {
    try {
      const r = await query(`SELECT COUNT(*) FROM ${t}`);
      console.log(`✅ ${t}:`, r.rows[0].count, 'rows');
    } catch(e) { console.log(`❌ ${t}:`, e.message.split('\n')[0]); }
  }

  // 4. Check pharmacy tables
  console.log('\n--- Pharmacy ---');
  for (const t of ['pharmacy_inventory','pharmacy_sales','pharmacy_stock','pharmacy_orders','prescriptions','prescription_items']) {
    try {
      const r = await query(`SELECT COUNT(*) FROM ${t}`);
      console.log(`✅ ${t}:`, r.rows[0].count, 'rows');
    } catch(e) { console.log(`❌ ${t}:`, e.message.split('\n')[0]); }
  }

  // 5. Check notifications
  console.log('\n--- Notifications ---');
  for (const t of ['notifications','user_notifications','alerts']) {
    try {
      const r = await query(`SELECT COUNT(*) FROM ${t}`);
      console.log(`✅ ${t}:`, r.rows[0].count, 'rows');
    } catch(e) { console.log(`❌ ${t}:`, e.message.split('\n')[0]); }
  }

  // 6. Check the actual billing route's query
  console.log('\n--- Testing billing controller query ---');
  try {
    const r = await query(`SELECT table_name FROM information_schema.tables WHERE table_name ILIKE '%bill%' AND table_schema='public'`);
    console.log('Bill-related tables:', r.rows.map(x => x.table_name));
  } catch(e) { console.log('ERR:', e.message); }
  try {
    const r = await query(`SELECT table_name FROM information_schema.tables WHERE table_name ILIKE '%lab%' AND table_schema='public'`);
    console.log('Lab-related tables:', r.rows.map(x => x.table_name));
  } catch(e) { console.log('ERR:', e.message); }
  try {
    const r = await query(`SELECT table_name FROM information_schema.tables WHERE table_name ILIKE '%pharma%' AND table_schema='public'`);
    console.log('Pharma-related tables:', r.rows.map(x => x.table_name));
  } catch(e) { console.log('ERR:', e.message); }
  try {
    const r = await query(`SELECT table_name FROM information_schema.tables WHERE table_name ILIKE '%notif%' AND table_schema='public'`);
    console.log('Notification-related tables:', r.rows.map(x => x.table_name));
  } catch(e) { console.log('ERR:', e.message); }

  console.log('\n=== Diagnostic Complete ===');
  process.exit(0);
}

fixAllTables().catch(e => { console.error(e.message); process.exit(1); });
