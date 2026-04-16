import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const backupsDir = path.join(__dirname, "..", "backups");

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `medicare_hms_${timestamp}.sql`;
  const filepath = path.join(backupsDir, filename);

  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  try {
    console.log("Starting backup...");

    const tables = [
      "users", "patients", "doctors", "appointments", "billing", 
      "lab_orders", "pharmacy", "audit_logs", "admissions", 
      "beds", "prescriptions", "prescription_items"
    ];

    let dump = "";

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT * FROM ${table} WHERE is_deleted = false`);
        if (result.rows.length > 0) {
          dump += `-- Data from ${table}\n`;
          for (const row of result.rows) {
            const columns = Object.keys(row).filter(k => !["is_deleted", "deleted_at"].includes(k));
            const values = columns.map(c => {
              const val = row[c];
              if (val === null) return "NULL";
              if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
              return val;
            }).join(", ");
            dump += `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${values});\n`;
          }
        }
      } catch (e) {
        console.log(`Table ${table} may not exist: ${e.message}`);
      }
    }

    fs.writeFileSync(filepath, dump);
    console.log(`Backup saved to: ${filepath}`);

    const stats = fs.statSync(filepath);
    console.log(`Backup size: ${(stats.size / 1024).toFixed(2)} KB`);

    const oldBackups = fs.readdirSync(backupsDir)
      .filter(f => f.endsWith(".sql"))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupsDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (oldBackups.length > 10) {
      for (const old of oldBackups.slice(10)) {
        fs.unlinkSync(path.join(backupsDir, old.name));
        console.log(`Deleted old backup: ${old.name}`);
      }
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("Backup failed:", error.message);
    await pool.end();
    process.exit(1);
  }
}

backup();