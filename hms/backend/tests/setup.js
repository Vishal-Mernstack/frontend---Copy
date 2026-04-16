import { Pool } from 'pg';

// Test database configuration
process.env.NODE_ENV = 'test';
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.DB_PORT = process.env.TEST_DB_PORT || '5432';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'hms_test';
process.env.DB_USER = process.env.TEST_DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'postgres';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';

// Test database pool
export const testPool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Setup before all tests
beforeAll(async () => {
  try {
    await testPool.connect();
    console.log('Test database connected successfully');
  } catch (error) {
    console.error('Test database connection failed:', error.message);
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    await testPool.end();
    console.log('Test database connection closed');
  } catch (error) {
    console.error('Error closing test database:', error.message);
  }
});

// Helper function to clean test data
export async function cleanTestData() {
  const tables = [
    'appointments',
    'billing',
    'patients',
    'doctors',
    'users'
  ];
  
  for (const table of tables) {
    try {
      await testPool.query(`DELETE FROM ${table} WHERE email LIKE '%test%' OR email LIKE '%@test.com'`);
    } catch (error) {
      // Table might not exist, ignore
    }
  }
}

// Helper function to seed test data
export async function seedTestData() {
  // Clean existing test data first
  await cleanTestData();
  
  // Create test users
  const testUsers = [
    {
      email: 'admin@test.com',
      password: '$2a$10$X7Op2w5z5z5z5z5z5z5z5u', // bcrypt hash for Admin@123
      role: 'admin',
      name: 'Test Admin'
    },
    {
      email: 'doctor@test.com',
      password: '$2a$10$X7Op2w5z5z5z5z5z5z5z5u', // bcrypt hash for Doc@123
      role: 'doctor',
      name: 'Test Doctor'
    },
    {
      email: 'patient@test.com',
      password: '$2a$10$X7Op2w5z5z5z5z5z5z5z5u', // bcrypt hash for Pat@123
      role: 'patient',
      name: 'Test Patient'
    }
  ];
  
  for (const user of testUsers) {
    try {
      await testPool.query(
        'INSERT INTO users (email, password, role, name) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
        [user.email, user.password, user.role, user.name]
      );
    } catch (error) {
      console.error(`Error seeding user ${user.email}:`, error.message);
    }
  }
}
