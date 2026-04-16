import request from 'supertest';
import app from '../server.js';
import { seedTestData, cleanTestData, testPool } from './setup.js';

describe('Billing Tests - GET /billing & POST /billing', () => {
  let adminToken, doctorToken, patientToken, billingToken;
  let testPatientId;

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

    // Create test patient
    const patientRes = await request(app)
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Patient',
        age: 30,
        email: 'testpatient2@test.com',
        phone: '9999999999'
      });
    testPatientId = patientRes.body.id;
  });

  afterAll(async () => {
    await cleanTestData();
  });

  // SECTION 4.1: GET /billing — Positive Tests
  describe('GET /billing - Positive Tests', () => {
    test('BILL-GP1: List all billing records as admin', async () => {
      const res = await request(app)
        .get('/api/v1/billing')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      if (res.body.length > 0) {
        const billing = res.body[0];
        expect(billing).toHaveProperty('id');
        expect(billing).toHaveProperty('patientId');
        expect(billing).toHaveProperty('amount');
        expect(billing).toHaveProperty('status');
        expect(billing).toHaveProperty('createdAt');
      }
    });

    test('BILL-GP2: Billing records with correct numeric types', async () => {
      // Create a billing record first
      await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: testPatientId,
          amount: 250.00,
          description: 'Consultation',
          status: 'unpaid'
        });

      const res = await request(app)
        .get('/api/v1/billing')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      
      if (res.body.length > 0) {
        const billing = res.body[0];
        expect(typeof billing.amount).toBe('number');
        expect(['paid', 'unpaid', 'pending']).toContain(billing.status);
      }
    });
  });

  // SECTION 4.2: GET /billing — Negative Tests
  describe('GET /billing - Negative Tests', () => {
    test('BILL-GN1: No token → 401', async () => {
      const res = await request(app)
        .get('/api/v1/billing');

      expect(res.status).toBe(401);
    });

    test('BILL-GN2: Patient role → 403', async () => {
      const res = await request(app)
        .get('/api/v1/billing')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
    });

    test('BILL-GN3: Doctor role → 403', async () => {
      const res = await request(app)
        .get('/api/v1/billing')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
    });
  });

  // SECTION 4.3: POST /billing — Positive Tests
  describe('POST /billing - Positive Tests', () => {
    test('BILL-PP1: Create valid billing record', async () => {
      const res = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: testPatientId,
          amount: 250.00,
          description: 'Consultation',
          status: 'unpaid'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      
      // DB Verify
      const dbRes = await testPool.query(
        'SELECT * FROM billing WHERE id = $1',
        [res.body.id]
      );
      expect(dbRes.rows).toHaveLength(1);
      expect(dbRes.rows[0].patientid).toBe(testPatientId);
    });

    test('BILL-PP2: Verify billing record via GET', async () => {
      // Create billing
      const createRes = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: testPatientId,
          amount: 150.00,
          description: 'Lab Test',
          status: 'pending'
        });

      expect(createRes.status).toBe(201);

      // Verify via GET
      const getRes = await request(app)
        .get('/api/v1/billing')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      const found = getRes.body.find(b => b.id === createRes.body.id);
      expect(found).toBeDefined();
    });
  });

  // SECTION 4.4: POST /billing — Negative Tests
  describe('POST /billing - Negative Tests', () => {
    test('BILL-PN1: Missing amount field', async () => {
      const res = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: testPatientId,
          description: 'Consultation',
          status: 'unpaid'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/amount/i);
    });

    test('BILL-PN2: Non-numeric amount', async () => {
      const res = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: testPatientId,
          amount: 'fifty dollars',
          description: 'Consultation',
          status: 'unpaid'
        });

      expect(res.status).toBe(400);
    });

    test('BILL-PN3: Negative amount', async () => {
      const res = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: testPatientId,
          amount: -100,
          description: 'Consultation',
          status: 'unpaid'
        });

      expect(res.status).toBe(400);
    });

    test('BILL-PN4: Non-existent patientId', async () => {
      const res = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 99999,
          amount: 100,
          description: 'Consultation',
          status: 'unpaid'
        });

      expect([400, 404]).toContain(res.status);
      
      // DB Verify: no orphan billing record
      const dbRes = await testPool.query(
        'SELECT * FROM billing WHERE patientid = 99999'
      );
      expect(dbRes.rows).toHaveLength(0);
    });

    test('BILL-PN5: Unauthorized role (patient creating billing)', async () => {
      const res = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          patientId: testPatientId,
          amount: 100,
          description: 'Consultation',
          status: 'unpaid'
        });

      expect(res.status).toBe(403);
    });

    test('BILL-PN6: No token', async () => {
      const res = await request(app)
        .post('/api/v1/billing')
        .send({
          patientId: testPatientId,
          amount: 100,
          description: 'Consultation',
          status: 'unpaid'
        });

      expect(res.status).toBe(401);
    });
  });

  // GLOBAL CHECKS for billing routes
  describe('Global Checks - Billing Routes', () => {
    test('GLOBAL-1: Response has Content-Type: application/json', async () => {
      const res = await request(app)
        .get('/api/v1/billing')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    test('GLOBAL-2: 4xx errors return structured error objects', async () => {
      const res = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(res.body).toHaveProperty('error');
    });
  });
});
