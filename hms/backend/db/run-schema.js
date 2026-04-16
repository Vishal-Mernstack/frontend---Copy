import { query } from "../config/db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSchema() {
  try {
    const schemaPath = path.join(__dirname, "schema_extended.sql");
    const sql = fs.readFileSync(schemaPath, "utf-8");
    
    const statements = sql.split(";").filter(s => s.trim() && !s.trim().startsWith("--"));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await query(statement + ";");
          console.log("Executed successfully");
        } catch (e) {
          if (e.message.includes("already exists")) {
            console.log("Already exists, skipping");
          } else {
            console.log("Error:", e.message);
          }
        }
      }
    }
    
    console.log("Extended schema loaded!");
    process.exit(0);
  } catch (error) {
    console.error("Failed:", error.message);
    process.exit(1);
  }
}

runSchema();