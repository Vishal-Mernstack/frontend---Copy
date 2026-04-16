import { query, pool } from "./config/db.js";

async function testConnection() {
  console.log("🔍 Testing PostgreSQL connection...\n");

  try {
    // Test 1: Basic connection
    const client = await pool.connect();
    console.log("✅ Connection established");

    // Test 2: Check server version
    const versionResult = await client.query("SELECT version()");
    console.log("📦 PostgreSQL Version:", versionResult.rows[0].version);

    // Test 3: Check current database
    const dbResult = await client.query("SELECT current_database()");
    console.log("🗄️  Database:", dbResult.rows[0].current_database);

    // Test 4: Check tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log("\n📋 Tables found:");
    tablesResult.rows.forEach(row => {
      console.log("   -", row.table_name);
    });

    // Test 5: Check medicines table data
    const countResult = await client.query("SELECT COUNT(*) FROM medicines");
    console.log("\n💊 Medicines count:", countResult.rows[0].count);

    // Test 6: Sample data (if any)
    const sampleResult = await client.query("SELECT * FROM medicines LIMIT 3");
    if (sampleResult.rows.length > 0) {
      console.log("\n📝 Sample medicines:");
      sampleResult.rows.forEach(med => {
        console.log(`   - ${med.name} (${med.manufacturer || 'No mfg'}) - Stock: ${med.stock}, Price: $${med.price}`);
      });
    }

    client.release();
    console.log("\n✅ All connection tests passed!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Connection test failed:");
    console.error("   Error:", error.message);
    process.exit(1);
  }
}

testConnection();
