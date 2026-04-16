import { query } from "../config/db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration(migrationFile) {
  try {
    const migrationPath = path.join(__dirname, migrationFile);
    const sql = fs.readFileSync(migrationPath, "utf-8");
    
    const statements = sql.split(";").filter(s => s.trim() && !s.trim().startsWith("--"));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await query(statement + ";");
          console.log("Executed successfully:", statement.substring(0, 50) + "...");
        } catch (e) {
          if (e.message.includes("already exists") || e.message.includes("duplicate column")) {
            console.log("Already exists, skipping:", statement.substring(0, 50) + "...");
          } else {
            console.log("Error:", e.message);
            throw e;
          }
        }
      }
    }
    
    console.log(`Migration ${migrationFile} completed!`);
    return true;
  } catch (error) {
    console.error(`Migration ${migrationFile} failed:`, error.message);
    return false;
  }
}

async function main() {
  const migrationFiles = [
    "add_status_reason_to_appointments.sql",
    "create_appointment_status_history.sql"
  ];
  
  console.log("Running migrations...");
  
  for (const file of migrationFiles) {
    const success = await runMigration(file);
    if (!success) {
      console.error(`Failed to run ${file}, aborting`);
      process.exit(1);
    }
  }
  
  console.log("All migrations completed successfully!");
  process.exit(0);
}

if (process.argv.length > 2) {
  // Run specific migration
  const specificFile = process.argv[2];
  runMigration(specificFile)
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
} else {
  main();
}
