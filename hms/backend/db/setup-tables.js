import { query } from "../config/db.js";

async function setupTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS departments (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      code VARCHAR(20) UNIQUE NOT NULL,
      description TEXT,
      head_of_department VARCHAR(100),
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS staff (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      employee_code VARCHAR(20) UNIQUE NOT NULL,
      department_id INTEGER REFERENCES departments(id),
      position VARCHAR(50),
      salary DECIMAL(10,2),
      join_date DATE,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id INTEGER,
      details TEXT,
      ip_address VARCHAR(50),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS prescriptions (
      id SERIAL PRIMARY KEY,
      prescription_code VARCHAR(20) UNIQUE NOT NULL,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      diagnosis TEXT,
      symptoms TEXT,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS beds (
      id SERIAL PRIMARY KEY,
      bed_number VARCHAR(20) NOT NULL,
      ward_type VARCHAR(50) NOT NULL,
      department_id INTEGER REFERENCES departments(id),
      status VARCHAR(20) NOT NULL DEFAULT 'Available',
      price_per_day DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
    `INSERT INTO departments (name, code, description) VALUES 
      ('General Medicine', 'GEN', 'General Medicine Department'),
      ('Cardiology', 'CARD', 'Heart and Cardiovascular'),
      ('Neurology', 'NEURO', 'Brain and Nervous System'),
      ('Orthopedics', 'ORTHO', 'Bones and Joints'),
      ('Pediatrics', 'PEDIA', 'Child Healthcare'),
      ('Gynecology', 'GYNE', 'Women Healthcare')
    ON CONFLICT (name) DO NOTHING`,
    `INSERT INTO beds (bed_number, ward_type, status, price_per_day) VALUES 
      ('101-A', 'General', 'Available', 500),
      ('101-B', 'General', 'Available', 500),
      ('102-A', 'General', 'Occupied', 500),
      ('201-A', 'ICU', 'Available', 1500),
      ('202-A', 'ICU', 'Available', 1500),
      ('301-A', 'Private', 'Available', 2500)
    ON CONFLICT (bed_number) DO NOTHING`
  ];

  for (const sql of tables) {
    try {
      await query(sql);
      console.log("OK:", sql.slice(0, 50) + "...");
    } catch (e) {
      console.log("Error:", e.message);
    }
  }
  
  process.exit(0);
}

setupTables();