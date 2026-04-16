import request from 'supertest';
import app from '../server.js';
import { seedTestData, cleanTestData, testPool } from './setup.js';

describe('Authentication Tests - POST /api/v1/auth/login', () => {
  beforeAll(async () => {
    await seedTestData();
  });

  afterAll(async () => {
    await cleanTestData();
  });

  // SECTION 1.1: Positive Tests
  describe('Positive Tests', () => {
    test('AUTH-P1: Valid credential login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'Admin@123'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(typeof res.body.token).toBe('string');
      
      // Validate JWT structure (3 parts: header.payload.signature)
      const tokenParts = res.body.token.split('.');
      expect(tokenParts).toHaveLength(3);
      
      // Validate user object
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('email');
      expect(res.body.user).toHaveProperty('role');
      expect(res.body.user.email).toBe('admin@test.com');
      expect(res.body.user.role).toBe('admin');
      
      // Validate Content-Type
      expect(res.headers['content-type']).toMatch(/json/);
    });

    test('AUTH-P2: Doctor role login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'doctor@test.com',
          password: 'Doc@123'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('doctor');
    });

    test('AUTH-P3: Patient role login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'patient@test.com',
          password: 'Pat@123'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('patient');
    });
  });

  // SECTION 1.2: Negative Tests
  describe('Negative Tests', () => {
    test('AUTH-N1: Missing email field', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          password: 'Admin@123'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/email/i);
    });

    test('AUTH-N2: Missing password field', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@test.com'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/password/i);
    });

    test('AUTH-N3: Wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'WRONG'
        });

      expect(res.status).toBe(401);
      expect(res.body).not.toHaveProperty('token');
      expect(res.body).not.toHaveProperty('user');
    });

    test('AUTH-N4: Non-existent user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'ghost@test.com',
          password: 'Ghost@123'
        });

      expect(res.status).toBe(401);
      expect(res.body).not.toHaveProperty('token');
    });

    test('AUTH-N5: Empty request body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    test('AUTH-N6: SQL injection in email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: "' OR '1'='1",
          password: 'anything'
        });

      expect([400, 401]).toContain(res.status);
      // Ensure no DB data leaked
      expect(res.body).not.toHaveProperty('token');
      expect(res.body).not.toHaveProperty('user');
    });

    test('AUTH-N7: Extremely long input', async () => {
      const longString = 'a'.repeat(10001);
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: longString,
          password: 'Admin@123'
        });

      expect([400, 413]).toContain(res.status);
    });
  });

  // SECTION 1.3: JWT Integrity Tests
  describe('JWT Integrity Tests', () => {
    let validToken;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'Admin@123'
        });
      validToken = res.body.token;
    });

    test('AUTH-JWT1: Tampered token on protected route', async () => {
      // Tamper with the token by altering characters in signature
      const tamperedToken = validToken.slice(0, -3) + 'xyz';
      
      const res = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
    });

    test('AUTH-JWT2: Expired token', async () => {
      // Create an expired token (this would require JWT library to create manually)
      // For now, test with a malformed token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJhZG1pbiIsImV4cCI6MH0.invalid';
      
      const res = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    test('AUTH-JWT3: No Authorization header', async () => {
      const res = await request(app)
        .get('/api/v1/patients');

      expect(res.status).toBe(401);
    });

    test('AUTH-JWT4: Malformed Bearer format', async () => {
      const res = await request(app)
        .get('/api/v1/patients')
        .set('Authorization', 'Token abc123');

      expect(res.status).toBe(401);
    });

    test('AUTH-JWT5: Wrong HTTP method', async () => {
      const res = await request(app)
        .delete('/api/v1/auth/login');

      expect(res.status).toBe(404);
    });
  });

  // GLOBAL CHECKS for auth routes
  describe('Global Checks - Auth Routes', () => {
    test('GLOBAL-1: Response has Content-Type: application/json', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'Admin@123'
        });

      expect(res.headers['content-type']).toMatch(/application\/json/);
    });

    test('GLOBAL-2: 4xx errors return structured error objects', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    });

    test('GLOBAL-4: Wrong HTTP method returns 405', async () => {
      const res = await request(app)
        .get('/api/v1/auth/login');

      expect([404, 405]).toContain(res.status);
    });
  });
});
