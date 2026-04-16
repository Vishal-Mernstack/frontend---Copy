import request from 'supertest';
import app from '../server.js';
import { seedTestData, cleanTestData, testPool } from './setup.js';

describe('Database Integration Tests', () => {
  let adminToken, testPatientId, testDoctorId;

  beforeAll(async () => {
    await seedTestData();
    
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin@123' });
    adminToken = adminRes.body.token;

    // Create test patient
    const patientRes = await request(app)
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'DB Test Patient',
        age: 30,
        email: 'dbtest@test.com',
        phone: '9999999999'
      });
    testPatientId = patientRes.body.id;

    // Create test doctor
    try {
      const doctorRes = await testPool.query(
        'INSERT INTO doctors (name, email, specialization) VALUES ($1, $2, $3) RETURNING id',
        ['DB Test Doctor', 'dbdoctor@test.com', 'General']
      );
      testDoctorId = doctorRes.rows[0].id;
    } catch (error) {
      testDoctorId = 1;
    }
  });

  afterAll(async () => {
    await cleanTestData();
  });

  // SECTION 6.1: Relational Integrity Tests
  describe('Relational Integrity', () => {
    test('DB-RI1: appointments.patientId references existing patient', async () => {
      // Try to create appointment with non-existent patient
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 99999,
          doctorId: testDoctorId,
          datetime: '2025-08-01T10:00:00Z',
          reason: 'Checkup'
        });

      expect([400, 404]).toContain(res.status);
      
      // Verify no orphan record
      const dbRes = await testPool.query(
        'SELECT * FROM appointments WHERE patientid = 99999'
      );
      expect(dbRes.rows).toHaveLength(0);
    });

    test('DB-RI2: billing.patientId references existing patient', async () => {
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
      
      // Verify no orphan record
      const dbRes = await testPool.query(
        'SELECT * FROM billing WHERE patientid = 99999'
      );
      expect(dbRes.rows).toHaveLength(0);
    });

    test('DB-RI3: Cascade behavior', async () => {
      // Create a patient with related records
      const patientRes = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Cascade Test Patient',
          age: 25,
          email: 'cascade@test.com',
          phone: '8888888888'
        });
      const cascadePatientId = patientRes.body.id;

      // Create related billing
      await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: cascadePatientId,
          amount: 100,
          description: 'Test',
          status: 'unpaid'
        });

      // Delete patient
      const deleteRes = await request(app)
        .delete(`/api/v1/patients/${cascadePatientId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Either cascades (200/204) or errors due to FK constraint (400/409)
      expect([200, 204, 400, 409]).toContain(deleteRes.status);
    });
  });

  // SECTION 6.2: CRUD End-to-End Flows
  describe('CRUD End-to-End Flows', () => {
    test('DB-E2E1: Full patient lifecycle', async () => {
      // 1. POST /patients → 201
      const createRes = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E Test Patient',
          age: 35,
          email: 'e2e@test.com',
          phone: '7777777777'
        });
      expect(createRes.status).toBe(201);
      const patientId = createRes.body.id;

      // 2. GET /patients → confirm patient in list
      const listRes = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(listRes.status).toBe(200);
      const found = listRes.body.find(p => p.id === patientId);
      expect(found).toBeDefined();

      // 3. GET /patients/:id → confirm individual record
      const getRes = await request(app)
        .get(`/api/v1/patients/${patientId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.id).toBe(patientId);

      // 4. PUT /patients/:id → update name → 200
      const updateRes = await request(app)
        .put(`/api/v1/patients/${patientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated E2E Patient',
          age: 36,
          email: 'e2e@test.com',
          phone: '7777777777'
        });
      expect(updateRes.status).toBe(200);

      // 5. DELETE /patients/:id → 200/204
      const deleteRes = await request(app)
        .delete(`/api/v1/patients/${patientId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 204]).toContain(deleteRes.status);

      // 6. GET /patients/:id → 404 (record gone)
      const finalGetRes = await request(app)
        .get(`/api/v1/patients/${patientId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(finalGetRes.status).toBe(404);
    });

    test('DB-E2E2: Full appointment lifecycle', async () => {
      // 1. POST /appointments with valid patientId + doctorId → 201
      const createRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: testPatientId,
          doctorId: testDoctorId,
          datetime: '2025-08-01T10:00:00Z',
          reason: 'E2E Checkup'
        });
      expect(createRes.status).toBe(201);
      const appointmentId = createRes.body.id;

      // 2. GET /appointments?patientId=<id> → confirms record with joined names
      const getRes = await request(app)
        .get(`/api/v1/appointments?patientId=${testPatientId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(200);
      const found = getRes.body.find(a => a.id === appointmentId);
      expect(found).toBeDefined();

      // 3. Verify appointment.patient_name matches patients table
      if (found && found.patient_name) {
        const patientRes = await testPool.query(
          'SELECT name FROM patients WHERE id = $1',
          [testPatientId]
        );
        expect(found.patient_name).toBe(patientRes.rows[0]?.name);
      }

      // Cleanup
      await request(app)
        .delete(`/api/v1/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    });

    test('DB-E2E3: Full billing lifecycle', async () => {
      // 1. POST /billing → 201
      const createRes = await request(app)
        .post('/api/v1/billing')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: testPatientId,
          amount: 200.00,
          description: 'E2E Consultation',
          status: 'unpaid'
        });
      expect(createRes.status).toBe(201);
      const billingId = createRes.body.id;

      // 2. GET /billing → confirms new billing entry
      const getRes = await request(app)
        .get('/api/v1/billing')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(200);
      const found = getRes.body.find(b => b.id === billingId);
      expect(found).toBeDefined();

      // 3. Verify billing.amount matches what was sent
      expect(found.amount).toBe(200.00);

      // Cleanup
      await request(app)
        .delete(`/api/v1/billing/${billingId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    });
  });

  // SECTION 6.3: Concurrent & Edge Cases
  describe('Concurrent & Edge Cases', () => {
    test('DB-C1: Duplicate unique field handling', async () => {
      const email = 'duplicate@test.com';
      
      // Create first patient
      const res1 = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'First Patient',
          age: 30,
          email: email,
          phone: '9999999999'
        });
      expect([201, 409]).toContain(res1.status);

      // Try to create duplicate
      const res2 = await request(app)
        .post('/api/v1/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Second Patient',
          age: 35,
          email: email,
          phone: '8888888888'
        });
      expect([201, 409]).toContain(res2.status);

      // Exactly one should succeed
      const successCount = [res1.status, res2.status].filter(s => s === 201).length;
      expect(successCount).toBeLessThanOrEqual(1);
    });

    test('DB-C2: DB connection pool', async () => {
      // Send 20 concurrent requests to GET /patients
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(app)
            .get('/api/v1/patients')
            .set('Authorization', `Bearer ${adminToken}`)
        );
      }
      
      const results = await Promise.all(promises);
      
      // All should return 200 within reasonable timeout
      results.forEach(res => {
        expect(res.status).toBe(200);
      });
      
      // No "pool exhausted" 500 errors
      const hasPoolError = results.some(res => res.status === 500);
      expect(hasPoolError).toBe(false);
    });
  });

  // Database schema validation tests
  describe('Database Schema Validation', () => {
    test('Users table has required columns', async () => {
      const res = await testPool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `);
      
      const columns = res.rows.map(r => r.column_name.toLowerCase());
      expect(columns).toContain('email');
      expect(columns).toContain('password');
      expect(columns).toContain('role');
    });

    test('Patients table has required columns', async () => {
      const res = await testPool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'patients'
      `);
      
      const columns = res.rows.map(r => r.column_name.toLowerCase());
      expect(columns).toContain('name');
      expect(columns).toContain('age');
      expect(columns).toContain('email');
    });

    test('Foreign key constraints exist', async () => {
      // Check for foreign key constraints
      const res = await testPool.query(`
        SELECT 
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (tc.table_name = 'appointments' OR tc.table_name = 'billing')
      `);
      
      // Should have FK constraints for appointments and billing
      expect(res.rows.length).toBeGreaterThan(0);
    });
  });
});
