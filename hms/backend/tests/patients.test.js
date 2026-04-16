import request from 'supertest';
import app from '../server.js';
import { seedTestData, cleanTestData, testPool } from './setup.js';

describe('Patients Tests - GET /patients & POST /patients', () => {
  let adminToken, doctorToken, patientToken;

  beforeAll(async () => {
    await seedTestData();
    
    // Get tokens for different roles
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin@123' });
    adminToken = adminRes.body.token;

    const docRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'doctor@test.com', password: 'Doc@123' });
    doctorToken = docRes.body.token;

    const patRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'patient@test.com', password: 'Pat@123' });
    patientToken = patRes.body.token;
  });

  afterAll(async () => {
    await cleanTestData();
  });

  // SECTION 2.1: GET /patients — Positive Tests
  describe('GET /patients - Positive Tests', () => {
    test('PAT-GP1: List all patients as admin', async () => {
      const res = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      if (res.body.length > 0) {
        const patient = res.body[0];
        expect(patient).toHaveProperty('id');
        expect(patient).toHaveProperty('name');
        expect(patient).toHaveProperty('age');
        expect(patient).toHaveProperty('email');
        expect(patient).toHaveProperty('createdAt');
      }
    });

    test('PAT-GP2: List patients as doctor', async () => {
      const res = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('PAT-GP3: Empty patients table', async () => {
      // Clean all patients temporarily
      await testPool.query('DELETE FROM patients');
      
      const res = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('PAT-GP4: Response schema validation', async () => {
      // Create a test patient first
      await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Schema Test Patient',
          age: 30,
          email: 'schema@test.com',
          phone: '9999999999'
        });

      const res = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      
      if (res.body.length > 0) {
        const patient = res.body[0];
        expect(typeof patient.id).toBe('number');
        expect(typeof patient.name).toBe('string');
        expect(typeof patient.age).toBe('number');
        expect(typeof patient.email).toBe('string');
      }
    });
  });

  // SECTION 2.2: GET /patients — Negative Tests
  describe('GET /patients - Negative Tests', () => {
    test('PAT-GN1: No token', async () => {
      const res = await request(app)
        .get('/api/v1/patients');

      expect(res.status).toBe(401);
    });

    test('PAT-GN2: Patient role tries to list all patients', async () => {
      const res = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
    });

    test('PAT-GN3: Wrong path', async () => {
      const res = await request(app)
        .get('/api/v1/patients/99999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    test('PAT-GN4: Wrong HTTP method', async () => {
      const res = await request(app)
        .put('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([404, 405]).toContain(res.status);
    });
  });

  // SECTION 2.3: POST /patients — Positive Tests
  describe('POST /patients - Positive Tests', () => {
    test('PAT-PP1: Create patient with all required fields', async () => {
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'John Doe',
          age: 35,
          email: 'john@test.com',
          phone: '9999999999'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      
      // DB Verify
      const dbRes = await testPool.query(
        'SELECT * FROM patients WHERE email = $1',
        ['john@test.com']
      );
      expect(dbRes.rows).toHaveLength(1);
    });

    test('PAT-PP2: Create patient — verify DB persistence', async () => {
      // Create patient
      const createRes = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Jane Smith',
          age: 28,
          email: 'jane@test.com',
          phone: '8888888888'
        });

      expect(createRes.status).toBe(201);

      // Verify via GET
      const getRes = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      const found = getRes.body.find(p => p.email === 'jane@test.com');
      expect(found).toBeDefined();
    });
  });

  // SECTION 2.4: POST /patients — Negative Tests
  describe('POST /patients - Negative Tests', () => {
    test('PAT-PN1: Missing required field "name"', async () => {
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          age: 35,
          email: 'x@test.com',
          phone: '9999999999'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/name/i);
    });

    test('PAT-PN2: Invalid age (string instead of number)', async () => {
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Patient',
          age: 'not-a-number',
          email: 'x@test.com',
          phone: '9999999999'
        });

      expect(res.status).toBe(400);
    });

    test('PAT-PN3: Duplicate email (unique constraint)', async () => {
      // Create first patient
      await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'First Patient',
          age: 30,
          email: 'dup@test.com',
          phone: '9999999999'
        });

      // Try to create duplicate
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Second Patient',
          age: 35,
          email: 'dup@test.com',
          phone: '8888888888'
        });

      expect([400, 409]).toContain(res.status);
    });

    test('PAT-PN4: Unauthorized role creates patient', async () => {
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          name: 'Unauthorized Patient',
          age: 30,
          email: 'unauth@test.com',
          phone: '9999999999'
        });

      expect(res.status).toBe(403);
    });

    test('PAT-PN5: No token', async () => {
      const res = await request(app)
        .post('/api/v1/patients')
        .send({
          name: 'No Token Patient',
          age: 30,
          email: 'notoken@test.com',
          phone: '9999999999'
        });

      expect(res.status).toBe(401);
    });
  });

  // GLOBAL CHECKS for patient routes
  describe('Global Checks - Patient Routes', () => {
    test('GLOBAL-1: Response has Content-Type: application/json', async () => {
      const res = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    test('GLOBAL-2: 4xx errors return structured error objects', async () => {
      const res = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(res.body).toHaveProperty('error');
    });
  });
});
