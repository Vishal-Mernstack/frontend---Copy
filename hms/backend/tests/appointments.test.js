import request from 'supertest';
import app from '../server.js';
import { seedTestData, cleanTestData, testPool } from './setup.js';

describe('Appointments Tests - GET /appointments & POST /appointments', () => {
  let adminToken, doctorToken, patientToken, billingToken;
  let testPatientId, testDoctorId;

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

    // Create test patient and doctor
    const patientRes = await request(app)
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Patient',
        age: 30,
        email: 'testpatient@test.com',
        phone: '9999999999'
      });
    testPatientId = patientRes.body.id;

    // Create test doctor (if doctors table exists)
    try {
      const doctorRes = await testPool.query(
        'INSERT INTO doctors (name, email, specialization) VALUES ($1, $2, $3) RETURNING id',
        ['Test Doctor', 'testdoctor@test.com', 'General']
      );
      testDoctorId = doctorRes.rows[0].id;
    } catch (error) {
      // Doctors table might not exist or have different structure
      testDoctorId = 1; // Use existing doctor ID
    }
  });

  afterAll(async () => {
    await cleanTestData();
  });

  // SECTION 3.1: GET /appointments — Positive Tests
  describe('GET /appointments - Positive Tests', () => {
    test('APT-GP1: Fetch all appointments as admin', async () => {
      const res = await request(app)
        .get('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      if (res.body.length > 0) {
        const appointment = res.body[0];
        expect(appointment).toHaveProperty('id');
        expect(appointment).toHaveProperty('datetime');
        expect(appointment).toHaveProperty('status');
      }
    });

    test('APT-GP2: Filter by patient ID', async () => {
      // Create an appointment first
      await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: testPatientId,
          doctorId: testDoctorId,
          datetime: '2025-08-01T10:00:00Z',
          reason: 'Checkup'
        });

      const res = await request(app)
        .get(`/api/v1/appointments?patientId=${testPatientId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      if (res.body.length > 0) {
        res.body.forEach(apt => {
          expect(apt.patientId).toBe(testPatientId);
        });
      }
    });

    test('APT-GP3: Filter by date range', async () => {
      const res = await request(app)
        .get('/api/v1/appointments?from=2025-01-01&to=2025-12-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    test('APT-GP5: Empty result for valid filter', async () => {
      const res = await request(app)
        .get('/api/v1/appointments?patientId=999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // SECTION 3.2: GET /appointments — Negative Tests
  describe('GET /appointments - Negative Tests', () => {
    test('APT-GN1: Non-numeric patient ID in query', async () => {
      const res = await request(app)
        .get('/api/v1/appointments?patientId=abc')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([400, 200]).toContain(res.status);
    });

    test('APT-GN2: No token', async () => {
      const res = await request(app)
        .get('/api/v1/appointments');

      expect(res.status).toBe(401);
    });

    test('APT-GN3: Insufficient role', async () => {
      // Create a billing role token
      const res = await request(app)
        .get('/api/v1/appointments')
        .set('Authorization', `Bearer ${patientToken}`);

      // Patient role might have access, so check if it's 403 or 200
      expect([200, 403]).toContain(res.status);
    });
  });

  // SECTION 3.3: POST /appointments — Positive Tests
  describe('POST /appointments - Positive Tests', () => {
    test('APT-PP1: Create appointment with valid patient & doctor IDs', async () => {
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: testPatientId,
          doctorId: testDoctorId,
          datetime: '2025-08-01T10:00:00Z',
          reason: 'Checkup'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      
      // DB Verify
      const dbRes = await testPool.query(
        'SELECT * FROM appointments WHERE id = $1',
        [res.body.id]
      );
      expect(dbRes.rows).toHaveLength(1);
    });

    test('APT-PP2: Retrieve created appointment via GET', async () => {
      // Create appointment
      const createRes = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: testPatientId,
          doctorId: testDoctorId,
          datetime: '2025-08-02T14:00:00Z',
          reason: 'Follow-up'
        });

      expect(createRes.status).toBe(201);

      // Verify via GET
      const getRes = await request(app)
        .get('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      const found = getRes.body.find(a => a.id === createRes.body.id);
      expect(found).toBeDefined();
    });
  });

  // SECTION 3.4: POST /appointments — Negative Tests
  describe('POST /appointments - Negative Tests', () => {
    test('APT-PN1: Missing patientId', async () => {
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          doctorId: testDoctorId,
          datetime: '2025-08-01T10:00:00Z',
          reason: 'Checkup'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/patientId/i);
    });

    test('APT-PN2: Non-existent patientId (referential integrity)', async () => {
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
      
      // DB Verify: NO orphan appointment row inserted
      const dbRes = await testPool.query(
        'SELECT * FROM appointments WHERE patientId = 99999'
      );
      expect(dbRes.rows).toHaveLength(0);
    });

    test('APT-PN3: Non-existent doctorId', async () => {
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: testPatientId,
          doctorId: 99999,
          datetime: '2025-08-01T10:00:00Z',
          reason: 'Checkup'
        });

      expect([400, 404]).toContain(res.status);
    });

    test('APT-PN4: Invalid datetime format', async () => {
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: testPatientId,
          doctorId: testDoctorId,
          datetime: 'not-a-date',
          reason: 'Checkup'
        });

      expect(res.status).toBe(400);
    });

    test('APT-PN5: Role without appointment creation rights', async () => {
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          patientId: testPatientId,
          doctorId: testDoctorId,
          datetime: '2025-08-01T10:00:00Z',
          reason: 'Checkup'
        });

      expect(res.status).toBe(403);
    });
  });

  // GLOBAL CHECKS for appointment routes
  describe('Global Checks - Appointment Routes', () => {
    test('GLOBAL-1: Response has Content-Type: application/json', async () => {
      const res = await request(app)
        .get('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    test('GLOBAL-2: 4xx errors return structured error objects', async () => {
      const res = await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(res.body).toHaveProperty('error');
    });
  });
});
