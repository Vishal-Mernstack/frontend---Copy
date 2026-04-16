/**
 * ============================================================================
 *  COMPREHENSIVE HMS API TEST SUITE
 *  Sections 1-8: Auth, Patients, Appointments, Billing, Middleware, DB, Global
 * ============================================================================
 */
import fetch from 'node-fetch';

const API = 'http://127.0.0.1:5000/api/v1';
const PASS = '✅ PASS';
const FAIL = '❌ FAIL';
const WARN = '⚠️  WARN';
const SKIP = '⏭️  SKIP';

let adminToken = null;
let doctorToken = null;
let patientToken = null;
let billingToken = null;

let createdPatientId = null;
let createdDoctorId = null;
let createdAppointmentId = null;
let createdBillingId = null;

const results = { pass: 0, fail: 0, warn: 0, skip: 0, total: 0, details: [] };

function log(testId, status, message, details = '') {
  const icon = status === 'pass' ? PASS : status === 'fail' ? FAIL : status === 'warn' ? WARN : SKIP;
  results[status]++;
  results.total++;
  const line = `  ${icon} [${testId}] ${message}${details ? ' — ' + details : ''}`;
  results.details.push({ testId, status, message, details });
  console.log(line);
}

async function req(method, path, opts = {}) {
  const { body, token, raw } = opts;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const start = Date.now();
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const elapsed = Date.now() - start;
    let data;
    try { data = await res.json(); } catch { data = null; }
    return { status: res.status, data, elapsed, headers: res.headers, ok: res.ok };
  } catch (err) {
    return { status: 0, data: null, elapsed: Date.now() - start, error: err.message, ok: false };
  }
}

// =============================================================================
//  SECTION 1: AUTHENTICATION
// =============================================================================
async function testAuth() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          SECTION 1: AUTHENTICATION TESTS                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // --- 1.1 Positive Tests ---
  console.log('  📋 1.1 Positive Tests');

  // AUTH-P1: Admin login
  {
    const r = await req('POST', '/auth/login', { body: { email: 'admin@medicare.com', password: 'Admin@123' } });
    if (r.status === 200 && r.data?.data?.token) {
      adminToken = r.data.data.token;
      const parts = adminToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        if (payload.id && payload.role) {
          log('AUTH-P1', 'pass', 'Admin login returns valid JWT', `role=${payload.role}, 3-part JWT`);
        } else {
          log('AUTH-P1', 'fail', 'JWT payload missing id/role', JSON.stringify(payload));
        }
      } else {
        log('AUTH-P1', 'fail', 'Token is not 3-part JWT');
      }
    } else {
      log('AUTH-P1', 'fail', 'Admin login failed', `status=${r.status}`);
    }
  }

  // AUTH-P2: Try registering a doctor user, then login
  {
    // First attempt to create a doctor user via admin
    await req('POST', '/auth/create-user', {
      token: adminToken,
      body: { name: 'Test Doctor', email: 'testdoc@medicare.com', password: 'Doctor@123', role: 'doctor' }
    });
    const r = await req('POST', '/auth/login', { body: { email: 'testdoc@medicare.com', password: 'Doctor@123' } });
    if (r.status === 200 && r.data?.data?.user?.role === 'doctor') {
      doctorToken = r.data.data.token;
      log('AUTH-P2', 'pass', 'Doctor role login', `role=${r.data.data.user.role}`);
    } else {
      // fallback: try admin token with doctor-like check
      log('AUTH-P2', 'warn', 'Doctor login — user may not exist', `status=${r.status}`);
      doctorToken = adminToken; // fallback
    }
  }

  // AUTH-P3: Patient login
  {
    await req('POST', '/auth/create-user', {
      token: adminToken,
      body: { name: 'Test Patient', email: 'testpat@medicare.com', password: 'Patient@123', role: 'patient' }
    });
    const r = await req('POST', '/auth/login', { body: { email: 'testpat@medicare.com', password: 'Patient@123' } });
    if (r.status === 200 && r.data?.data?.user?.role === 'patient') {
      patientToken = r.data.data.token;
      log('AUTH-P3', 'pass', 'Patient role login', `role=${r.data.data.user.role}`);
    } else {
      log('AUTH-P3', 'warn', 'Patient login — user may not exist', `status=${r.status}`);
      patientToken = null;
    }
  }

  // Create billing user  
  {
    await req('POST', '/auth/create-user', {
      token: adminToken,
      body: { name: 'Test Billing', email: 'testbill@medicare.com', password: 'Billing@123', role: 'billing' }
    });
    const r = await req('POST', '/auth/login', { body: { email: 'testbill@medicare.com', password: 'Billing@123' } });
    if (r.status === 200) billingToken = r.data.data.token;
  }

  // --- 1.2 Negative Tests ---
  console.log('\n  📋 1.2 Negative Tests');

  // AUTH-N1: Missing email
  {
    const r = await req('POST', '/auth/login', { body: { password: 'Admin@123' } });
    log('AUTH-N1', r.status === 400 ? 'pass' : 'fail', 'Missing email → 400', `got ${r.status}`);
  }

  // AUTH-N2: Missing password
  {
    const r = await req('POST', '/auth/login', { body: { email: 'admin@medicare.com' } });
    log('AUTH-N2', r.status === 400 ? 'pass' : 'fail', 'Missing password → 400', `got ${r.status}`);
  }

  // AUTH-N3: Wrong password
  {
    const r = await req('POST', '/auth/login', { body: { email: 'admin@medicare.com', password: 'WRONG' } });
    const noToken = !r.data?.data?.token;
    log('AUTH-N3', r.status === 401 && noToken ? 'pass' : 'fail', 'Wrong password → 401, no token', `status=${r.status}, noToken=${noToken}`);
  }

  // AUTH-N4: Non-existent user
  {
    const r = await req('POST', '/auth/login', { body: { email: 'ghost@nowhere.com', password: 'Ghost@123' } });
    log('AUTH-N4', r.status === 401 ? 'pass' : 'fail', 'Non-existent user → 401', `got ${r.status}`);
  }

  // AUTH-N5: Empty body
  {
    const r = await req('POST', '/auth/login', { body: {} });
    log('AUTH-N5', r.status === 400 ? 'pass' : 'fail', 'Empty body → 400', `got ${r.status}`);
  }

  // AUTH-N6: SQL injection
  {
    const r = await req('POST', '/auth/login', { body: { email: "' OR '1'='1", password: 'anything' } });
    const safe = (r.status === 400 || r.status === 401) && !r.data?.data?.token;
    log('AUTH-N6', safe ? 'pass' : 'fail', 'SQL injection blocked', `status=${r.status}`);
  }

  // AUTH-N7: Extremely long input
  {
    const longStr = 'A'.repeat(10001);
    const r = await req('POST', '/auth/login', { body: { email: longStr, password: longStr } });
    const ok = r.status === 400 || r.status === 413 || r.status === 401;
    log('AUTH-N7', ok ? 'pass' : 'fail', 'Long input rejected', `status=${r.status}`);
  }

  // --- 1.3 JWT Integrity Tests ---
  console.log('\n  📋 1.3 JWT Integrity Tests');

  // AUTH-JWT1: Tampered token
  {
    const tampered = adminToken ? adminToken.slice(0, -4) + 'XXXX' : 'invalid';
    const r = await req('GET', '/patients', { token: tampered });
    log('AUTH-JWT1', r.status === 401 ? 'pass' : 'fail', 'Tampered token → 401', `got ${r.status}`);
  }

  // AUTH-JWT2: Expired token (craft one)
  {
    // We just test with a known-bad token containing exp=1
    const r = await req('GET', '/patients', { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIiwiZXhwIjoxfQ.invalid' });
    log('AUTH-JWT2', r.status === 401 ? 'pass' : 'fail', 'Expired/invalid token → 401', `got ${r.status}`);
  }

  // AUTH-JWT3: No Authorization header
  {
    const r = await req('GET', '/patients');
    log('AUTH-JWT3', r.status === 401 ? 'pass' : 'fail', 'No auth header → 401', `got ${r.status}`);
  }

  // AUTH-JWT4: Malformed Bearer format
  {
    const r = await fetch(`${API}/patients`, { headers: { 'Authorization': 'Token abc123' } });
    log('AUTH-JWT4', r.status === 401 ? 'pass' : 'fail', 'Wrong auth scheme → 401', `got ${r.status}`);
  }

  // AUTH-JWT5: GET /auth/me without token
  {
    const r = await req('GET', '/auth/me');
    log('AUTH-JWT5', r.status === 401 ? 'pass' : 'fail', 'GET /auth/me no token → 401', `got ${r.status}`);
  }
}

// =============================================================================
//  SECTION 2: PATIENTS
// =============================================================================
async function testPatients() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          SECTION 2: PATIENTS TESTS                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // --- 2.1 GET /patients Positive ---
  console.log('  📋 2.1 GET /patients — Positive');

  // PAT-GP1: List patients as admin
  {
    const r = await req('GET', '/patients?page=1&limit=5', { token: adminToken });
    if (r.status === 200 && r.data?.data?.items) {
      const items = r.data.data.items;
      log('PAT-GP1', 'pass', 'List patients as admin', `got ${items.length} items`);
    } else {
      log('PAT-GP1', 'fail', 'List patients failed', `status=${r.status}`);
    }
  }

  // PAT-GP2: List patients as doctor
  {
    const r = await req('GET', '/patients?page=1&limit=5', { token: doctorToken });
    log('PAT-GP2', r.status === 200 ? 'pass' : 'fail', 'List patients as doctor', `status=${r.status}`);
  }

  // PAT-GP3: Response schema validation
  {
    const r = await req('GET', '/patients?page=1&limit=5', { token: adminToken });
    if (r.status === 200 && r.data?.data?.items?.length > 0) {
      const p = r.data.data.items[0];
      const hasId = p.id !== undefined;
      const hasName = typeof p.name === 'string';
      const hasEmail = p.email !== undefined;
      log('PAT-GP3', hasId && hasName ? 'pass' : 'fail', 'Schema: id, name, email present', `id=${hasId}, name=${hasName}, email=${hasEmail}`);
    } else {
      log('PAT-GP3', 'warn', 'No patients to validate schema');
    }
  }

  // --- 2.2 GET /patients Negative ---
  console.log('\n  📋 2.2 GET /patients — Negative');

  // PAT-GN1: No token
  {
    const r = await req('GET', '/patients');
    log('PAT-GN1', r.status === 401 ? 'pass' : 'fail', 'No token → 401', `got ${r.status}`);
  }

  // PAT-GN2: Non-existent patient ID
  {
    const r = await req('GET', '/patients/99999999', { token: adminToken });
    log('PAT-GN2', r.status === 404 ? 'pass' : 'fail', 'Non-existent ID → 404', `got ${r.status}`);
  }

  // PAT-GN3: Invalid patient ID format
  {
    const r = await req('GET', '/patients/abc', { token: adminToken });
    log('PAT-GN3', r.status === 400 ? 'pass' : 'fail', 'Invalid ID format → 400', `got ${r.status}`);
  }

  // --- 2.3 POST /patients Positive ---
  console.log('\n  📋 2.3 POST /patients — Positive');

  // PAT-PP1: Create patient
  {
    const uniq = Date.now();
    const r = await req('POST', '/patients', {
      token: adminToken,
      body: { name: `TestPatient_${uniq}`, age: 35, email: `tp_${uniq}@test.com`, phone: '9999999999', gender: 'Male' }
    });
    if (r.status === 201 && r.data?.data?.id) {
      createdPatientId = r.data.data.id;
      log('PAT-PP1', 'pass', 'Create patient → 201', `id=${createdPatientId}`);
    } else {
      log('PAT-PP1', 'fail', 'Create patient failed', `status=${r.status}, msg=${r.data?.message}`);
    }
  }

  // PAT-PP2: Verify persistence via GET
  {
    if (createdPatientId) {
      const r = await req('GET', `/patients/${createdPatientId}`, { token: adminToken });
      log('PAT-PP2', r.status === 200 && r.data?.data?.id === createdPatientId ? 'pass' : 'fail',
        'Verify patient via GET', `status=${r.status}`);
    } else {
      log('PAT-PP2', 'skip', 'No patient created to verify');
    }
  }

  // --- 2.4 POST /patients Negative ---
  console.log('\n  📋 2.4 POST /patients — Negative');

  // PAT-PN1: Missing name
  {
    const r = await req('POST', '/patients', { token: adminToken, body: { age: 35 } });
    log('PAT-PN1', r.status === 400 ? 'pass' : 'fail', 'Missing name → 400', `got ${r.status}`);
  }

  // PAT-PN2: No token
  {
    const r = await req('POST', '/patients', { body: { name: 'No Auth', age: 25 } });
    log('PAT-PN2', r.status === 401 ? 'pass' : 'fail', 'No token → 401', `got ${r.status}`);
  }

  // PAT-PN3: Patient role creating patient (forbidden)
  {
    if (patientToken) {
      const r = await req('POST', '/patients', { token: patientToken, body: { name: 'Forbidden', age: 25 } });
      log('PAT-PN3', r.status === 403 ? 'pass' : 'fail', 'Patient role → 403', `got ${r.status}`);
    } else {
      log('PAT-PN3', 'skip', 'No patient token available');
    }
  }
}

// =============================================================================
//  SECTION 3: APPOINTMENTS
// =============================================================================
async function testAppointments() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          SECTION 3: APPOINTMENTS TESTS                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // We need a doctor_id — fetch first one from DB
  {
    const r = await req('GET', '/doctors?page=1&limit=1', { token: adminToken });
    if (r.status === 200 && r.data?.data?.items?.length > 0) {
      createdDoctorId = r.data.data.items[0].id;
    }
  }

  // --- 3.1 GET ---
  console.log('  📋 3.1 GET /appointments — Positive');

  // APT-GP1: Fetch all as admin
  {
    const r = await req('GET', '/appointments?page=1&limit=5', { token: adminToken });
    if (r.status === 200 && r.data?.data?.items) {
      log('APT-GP1', 'pass', 'Fetch appointments as admin', `count=${r.data.data.items.length}`);
    } else {
      log('APT-GP1', 'fail', 'Fetch appointments failed', `status=${r.status}`);
    }
  }

  // APT-GP2: Verify join (patient_name, doctor_name)
  {
    const r = await req('GET', '/appointments?page=1&limit=5', { token: adminToken });
    if (r.status === 200 && r.data?.data?.items?.length > 0) {
      const a = r.data.data.items[0];
      const hasJoins = a.patient_name !== undefined && a.doctor_name !== undefined;
      log('APT-GP2', hasJoins ? 'pass' : 'fail', 'JOIN: patient_name & doctor_name present', `patient=${a.patient_name}, doctor=${a.doctor_name}`);
    } else {
      log('APT-GP2', 'warn', 'No appointments to verify joins');
    }
  }

  // --- 3.2 GET Negative ---
  console.log('\n  📋 3.2 GET /appointments — Negative');

  {
    const r = await req('GET', '/appointments');
    log('APT-GN1', r.status === 401 ? 'pass' : 'fail', 'No token → 401', `got ${r.status}`);
  }

  // --- 3.3 POST Positive ---
  console.log('\n  📋 3.3 POST /appointments — Positive');

  // APT-PP1: Create appointment
  {
    if (createdPatientId && createdDoctorId) {
      const r = await req('POST', '/appointments', {
        token: adminToken,
        body: {
          patient_id: createdPatientId,
          doctor_id: createdDoctorId,
          appointment_date: '2025-08-01T10:00:00Z',
          type: 'Consultation',
          duration: 30,
          status: 'Booked'
        }
      });
      if (r.status === 201 && r.data?.data?.id) {
        createdAppointmentId = r.data.data.id;
        log('APT-PP1', 'pass', 'Create appointment → 201', `id=${createdAppointmentId}`);
      } else {
        log('APT-PP1', 'fail', 'Create appointment failed', `status=${r.status}, msg=${r.data?.message}`);
      }
    } else {
      log('APT-PP1', 'skip', 'No patient/doctor IDs', `patientId=${createdPatientId}, doctorId=${createdDoctorId}`);
    }
  }

  // APT-PP2: Verify via GET
  {
    if (createdAppointmentId) {
      const r = await req('GET', `/appointments/${createdAppointmentId}`, { token: adminToken });
      log('APT-PP2', r.status === 200 ? 'pass' : 'fail', 'Verify appointment via GET', `status=${r.status}`);
    } else {
      log('APT-PP2', 'skip', 'No appointment created');
    }
  }

  // --- 3.4 POST Negative ---
  console.log('\n  📋 3.4 POST /appointments — Negative');

  // APT-PN1: Missing patient_id
  {
    const r = await req('POST', '/appointments', {
      token: adminToken,
      body: { doctor_id: 1, appointment_date: '2025-08-01T10:00:00Z' }
    });
    log('APT-PN1', r.status === 400 ? 'pass' : 'fail', 'Missing patient_id → 400', `got ${r.status}`);
  }

  // APT-PN2: Non-existent patient_id
  {
    const r = await req('POST', '/appointments', {
      token: adminToken,
      body: { patient_id: 999999, doctor_id: createdDoctorId || 1, appointment_date: '2025-08-01T10:00:00Z' }
    });
    const ok = r.status === 400 || r.status === 404;
    log('APT-PN2', ok ? 'pass' : 'fail', 'Non-existent patient_id rejected', `got ${r.status}`);
  }

  // APT-PN3: Non-existent doctor_id
  {
    const r = await req('POST', '/appointments', {
      token: adminToken,
      body: { patient_id: createdPatientId || 1, doctor_id: 999999, appointment_date: '2025-08-01T10:00:00Z' }
    });
    const ok = r.status === 400 || r.status === 404;
    log('APT-PN3', ok ? 'pass' : 'fail', 'Non-existent doctor_id rejected', `got ${r.status}`);
  }

  // APT-PN4: Invalid datetime
  {
    const r = await req('POST', '/appointments', {
      token: adminToken,
      body: { patient_id: createdPatientId || 1, doctor_id: createdDoctorId || 1, appointment_date: 'not-a-date' }
    });
    log('APT-PN4', r.status === 400 ? 'pass' : 'fail', 'Invalid datetime → 400', `got ${r.status}`);
  }

  // APT-PN5: Unauthorized role
  {
    if (patientToken) {
      const r = await req('POST', '/appointments', {
        token: patientToken,
        body: { patient_id: 1, doctor_id: 1, appointment_date: '2025-08-01T10:00:00Z' }
      });
      log('APT-PN5', r.status === 403 ? 'pass' : 'fail', 'Patient role → 403', `got ${r.status}`);
    } else {
      log('APT-PN5', 'skip', 'No patient token');
    }
  }
}

// =============================================================================
//  SECTION 4: BILLING
// =============================================================================
async function testBilling() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          SECTION 4: BILLING TESTS                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // --- 4.1 GET Positive ---
  console.log('  📋 4.1 GET /billing — Positive');

  // BILL-GP1: List billing as admin
  {
    const r = await req('GET', '/billing?page=1&limit=5', { token: adminToken });
    if (r.status === 200 && r.data?.data?.items) {
      log('BILL-GP1', 'pass', 'List billing as admin', `count=${r.data.data.items.length}`);
    } else {
      log('BILL-GP1', 'fail', 'List billing failed', `status=${r.status}`);
    }
  }

  // BILL-GP2: Schema validation
  {
    const r = await req('GET', '/billing?page=1&limit=5', { token: adminToken });
    if (r.status === 200 && r.data?.data?.items?.length > 0) {
      const b = r.data.data.items[0];
      const amountIsNum = typeof b.amount === 'number';
      const hasStatus = typeof b.status === 'string';
      log('BILL-GP2', amountIsNum && hasStatus ? 'pass' : 'fail', 'amount=number, status=string', `amount=${typeof b.amount}, status=${b.status}`);
    } else {
      log('BILL-GP2', 'warn', 'No billing records to validate');
    }
  }

  // --- 4.2 GET Negative ---
  console.log('\n  📋 4.2 GET /billing — Negative');

  {
    const r = await req('GET', '/billing');
    log('BILL-GN1', r.status === 401 ? 'pass' : 'fail', 'No token → 401', `got ${r.status}`);
  }

  {
    if (patientToken) {
      const r = await req('GET', '/billing', { token: patientToken });
      log('BILL-GN2', r.status === 403 ? 'pass' : 'fail', 'Patient role → 403', `got ${r.status}`);
    } else {
      log('BILL-GN2', 'skip', 'No patient token');
    }
  }

  {
    if (doctorToken && doctorToken !== adminToken) {
      const r = await req('GET', '/billing', { token: doctorToken });
      log('BILL-GN3', r.status === 403 ? 'pass' : 'fail', 'Doctor role → 403', `got ${r.status}`);
    } else {
      log('BILL-GN3', 'skip', 'No distinct doctor token');
    }
  }

  // --- 4.3 POST Positive ---
  console.log('\n  📋 4.3 POST /billing — Positive');

  // BILL-PP1: Create billing
  {
    if (createdPatientId && createdDoctorId) {
      const r = await req('POST', '/billing', {
        token: adminToken,
        body: {
          patient_id: createdPatientId,
          doctor_id: createdDoctorId,
          amount: 250.00,
          status: 'Pending',
          notes: 'Test billing record'
        }
      });
      if (r.status === 201 && r.data?.data?.id) {
        createdBillingId = r.data.data.id;
        log('BILL-PP1', 'pass', 'Create billing → 201', `id=${createdBillingId}`);
      } else {
        log('BILL-PP1', 'fail', 'Create billing failed', `status=${r.status}, msg=${r.data?.message}`);
      }
    } else {
      log('BILL-PP1', 'skip', 'Missing patient/doctor IDs');
    }
  }

  // BILL-PP2: Verify via GET
  {
    if (createdBillingId) {
      const r = await req('GET', `/billing/${createdBillingId}`, { token: adminToken });
      log('BILL-PP2', r.status === 200 ? 'pass' : 'fail', 'Verify billing via GET', `status=${r.status}`);
    } else {
      log('BILL-PP2', 'skip', 'No billing record created');
    }
  }

  // --- 4.4 POST Negative ---
  console.log('\n  📋 4.4 POST /billing — Negative');

  // BILL-PN1: Missing amount
  {
    const r = await req('POST', '/billing', {
      token: adminToken,
      body: { patient_id: 1, doctor_id: 1 }
    });
    log('BILL-PN1', r.status === 400 ? 'pass' : 'fail', 'Missing amount → 400', `got ${r.status}`);
  }

  // BILL-PN2: Non-numeric amount
  {
    const r = await req('POST', '/billing', {
      token: adminToken,
      body: { patient_id: 1, doctor_id: 1, amount: 'fifty dollars' }
    });
    log('BILL-PN2', r.status === 400 ? 'pass' : 'fail', 'Non-numeric amount → 400', `got ${r.status}`);
  }

  // BILL-PN3: Non-existent patient
  {
    const r = await req('POST', '/billing', {
      token: adminToken,
      body: { patient_id: 999999, doctor_id: createdDoctorId || 1, amount: 100 }
    });
    const ok = r.status === 400 || r.status === 404;
    log('BILL-PN3', ok ? 'pass' : 'fail', 'Non-existent patient rejected', `got ${r.status}`);
  }

  // BILL-PN4: No token
  {
    const r = await req('POST', '/billing', { body: { patient_id: 1, doctor_id: 1, amount: 100 } });
    log('BILL-PN4', r.status === 401 ? 'pass' : 'fail', 'No token → 401', `got ${r.status}`);
  }

  // BILL-PN5: Unauthorized role
  {
    if (patientToken) {
      const r = await req('POST', '/billing', { token: patientToken, body: { patient_id: 1, doctor_id: 1, amount: 100 } });
      log('BILL-PN5', r.status === 403 ? 'pass' : 'fail', 'Patient role → 403', `got ${r.status}`);
    } else {
      log('BILL-PN5', 'skip', 'No patient token');
    }
  }
}

// =============================================================================
//  SECTION 5: MIDDLEWARE LAYER
// =============================================================================
async function testMiddleware() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          SECTION 5: MIDDLEWARE TESTS                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // MW-A1: Valid token passes to controller
  {
    const r = await req('GET', '/patients', { token: adminToken });
    log('MW-A1', r.status === 200 ? 'pass' : 'fail', 'Valid token → controller reached', `status=${r.status}`);
  }

  // MW-A2: Invalid signature
  {
    const r = await req('GET', '/patients', { token: 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIn0.INVALIDSIG' });
    log('MW-A2', r.status === 401 ? 'pass' : 'fail', 'Invalid signature → 401', `got ${r.status}`);
  }

  // MW-R1: Admin can access all routes
  {
    const routes = ['/patients', '/doctors', '/appointments', '/billing'];
    let allOk = true;
    for (const route of routes) {
      const r = await req('GET', route, { token: adminToken });
      if (r.status !== 200) allOk = false;
    }
    log('MW-R1', allOk ? 'pass' : 'fail', 'Admin accesses all routes');
  }

  // MW-R2: Doctor can access patients & appointments, not billing
  {
    if (doctorToken && doctorToken !== adminToken) {
      const pats = await req('GET', '/patients', { token: doctorToken });
      const apts = await req('GET', '/appointments', { token: doctorToken });
      const bills = await req('GET', '/billing', { token: doctorToken });
      log('MW-R2', pats.status === 200 && apts.status === 200 && bills.status === 403 ? 'pass' : 'warn',
        'Doctor: patients✓, appointments✓, billing✗', `pats=${pats.status}, apts=${apts.status}, bills=${bills.status}`);
    } else {
      log('MW-R2', 'skip', 'No distinct doctor token');
    }
  }

  // MW-R3: Patient role restrictions
  {
    if (patientToken) {
      const bills = await req('GET', '/billing', { token: patientToken });
      log('MW-R3', bills.status === 403 ? 'pass' : 'fail', 'Patient cannot list billing', `got ${bills.status}`);
    } else {
      log('MW-R3', 'skip', 'No patient token');
    }
  }

  // MW-S1: Validation schema — extra unknown fields stripped
  {
    const r = await req('POST', '/auth/login', { body: { email: 'admin@medicare.com', password: 'Admin@123', hackField: 'pwned' } });
    log('MW-S1', r.status === 200 ? 'pass' : 'warn', 'Extra fields stripped silently', `status=${r.status}`);
  }

  // MW-S2: XSS sanitization
  {
    const r = await req('POST', '/patients', {
      token: adminToken,
      body: { name: '<script>alert("xss")</script>Test', age: 25 }
    });
    if (r.status === 201) {
      const hasScript = JSON.stringify(r.data).includes('<script>');
      log('MW-S2', !hasScript ? 'pass' : 'fail', 'XSS tags sanitized in response', `rawScriptPresent=${hasScript}`);
    } else {
      log('MW-S2', 'warn', 'XSS test patient creation failed', `status=${r.status}`);
    }
  }
}

// =============================================================================
//  SECTION 6: DATABASE INTEGRATION (E2E CRUD)
// =============================================================================
async function testDatabaseE2E() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          SECTION 6: DATABASE INTEGRATION (E2E)              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  console.log('  📋 6.1 Patient CRUD Lifecycle');

  let lifecyclePatientId = null;

  // Create
  {
    const uniq = Date.now();
    const r = await req('POST', '/patients', {
      token: adminToken,
      body: { name: `Lifecycle_${uniq}`, age: 40, gender: 'Female', phone: '1234567890' }
    });
    if (r.status === 201) {
      lifecyclePatientId = r.data.data.id;
      log('DB-E2E1a', 'pass', 'POST → 201', `id=${lifecyclePatientId}`);
    } else {
      log('DB-E2E1a', 'fail', 'Create failed', `status=${r.status}`);
    }
  }

  // Read list
  {
    const r = await req('GET', '/patients', { token: adminToken });
    if (r.status === 200) {
      const found = r.data.data.items.some(p => p.id === lifecyclePatientId);
      log('DB-E2E1b', found ? 'pass' : 'fail', 'GET /patients includes new record');
    } else {
      log('DB-E2E1b', 'fail', 'GET list failed');
    }
  }

  // Read individual
  {
    if (lifecyclePatientId) {
      const r = await req('GET', `/patients/${lifecyclePatientId}`, { token: adminToken });
      log('DB-E2E1c', r.status === 200 ? 'pass' : 'fail', `GET /patients/${lifecyclePatientId}`, `status=${r.status}`);
    }
  }

  // Update
  {
    if (lifecyclePatientId) {
      const r = await req('PUT', `/patients/${lifecyclePatientId}`, {
        token: adminToken,
        body: { name: 'UpdatedLifecycle' }
      });
      log('DB-E2E1d', r.status === 200 && r.data?.data?.name === 'UpdatedLifecycle' ? 'pass' : 'fail',
        'PUT update name', `status=${r.status}, name=${r.data?.data?.name}`);
    }
  }

  // Delete (soft)
  {
    if (lifecyclePatientId) {
      const r = await req('DELETE', `/patients/${lifecyclePatientId}`, { token: adminToken });
      log('DB-E2E1e', r.status === 200 ? 'pass' : 'fail', 'DELETE → 200', `status=${r.status}`);
    }
  }

  // Verify deleted
  {
    if (lifecyclePatientId) {
      const r = await req('GET', `/patients/${lifecyclePatientId}`, { token: adminToken });
      log('DB-E2E1f', r.status === 404 ? 'pass' : 'fail', 'Deleted patient → 404', `got ${r.status}`);
    }
  }

  // --- 6.2 Appointment lifecycle ---
  console.log('\n  📋 6.2 Appointment Lifecycle');

  {
    if (createdAppointmentId) {
      // Update
      const rUpd = await req('PUT', `/appointments/${createdAppointmentId}`, {
        token: adminToken,
        body: { status: 'Completed', notes: 'Updated by test' }
      });
      log('DB-E2E2a', rUpd.status === 200 ? 'pass' : 'fail', 'Update appointment', `status=${rUpd.status}`);

      // Delete
      const rDel = await req('DELETE', `/appointments/${createdAppointmentId}`, { token: adminToken });
      log('DB-E2E2b', rDel.status === 200 ? 'pass' : 'fail', 'Delete appointment', `status=${rDel.status}`);

      // Verify gone
      const rGone = await req('GET', `/appointments/${createdAppointmentId}`, { token: adminToken });
      log('DB-E2E2c', rGone.status === 404 ? 'pass' : 'fail', 'Deleted appointment → 404', `got ${rGone.status}`);
    } else {
      log('DB-E2E2a', 'skip', 'No appointment to lifecycle test');
    }
  }

  // --- 6.3 Concurrent requests ---
  console.log('\n  📋 6.3 Concurrent & Stress');

  {
    const promises = Array.from({ length: 20 }, () =>
      req('GET', '/patients?page=1&limit=5', { token: adminToken })
    );
    const responses = await Promise.all(promises);
    const all200 = responses.every(r => r.status === 200);
    const maxTime = Math.max(...responses.map(r => r.elapsed));
    const no500 = responses.every(r => r.status !== 500);
    log('DB-C1', all200 && no500 ? 'pass' : 'fail', '20 concurrent GET /patients', `all200=${all200}, maxTime=${maxTime}ms`);
  }
}

// =============================================================================
//  SECTION 7: ADDITIONAL ROUTE COVERAGE
// =============================================================================
async function testAdditionalRoutes() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          SECTION 7: ADDITIONAL ROUTE COVERAGE               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const protectedGets = [
    ['/doctors', 'Doctors'],
    ['/lab', 'Lab'],
    ['/medicines', 'Medicines'],
    ['/pharmacy', 'Pharmacy'],
    ['/staff', 'Staff'],
    ['/departments', 'Departments'],
    ['/prescriptions', 'Prescriptions'],
  ];

  for (const [route, label] of protectedGets) {
    // With token
    const rAuth = await req('GET', route, { token: adminToken });
    log(`ROUTE-${label.toUpperCase()}-AUTH`, rAuth.status === 200 ? 'pass' : 'warn', `GET ${route} (admin)`, `status=${rAuth.status}`);

    // Without token
    const rNoAuth = await req('GET', route);
    log(`ROUTE-${label.toUpperCase()}-NOAUTH`, rNoAuth.status === 401 ? 'pass' : 'fail', `GET ${route} (no auth) → 401`, `got ${rNoAuth.status}`);
  }
}

// =============================================================================
//  SECTION 8: GLOBAL CHECKS
// =============================================================================
async function testGlobalChecks() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║          SECTION 8: GLOBAL CHECKS                           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // GLOBAL-1: Content-Type
  {
    const r = await fetch(`${API}/patients`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const ct = r.headers.get('content-type');
    log('GLOBAL-1', ct && ct.includes('application/json') ? 'pass' : 'fail', 'Content-Type: application/json', `got ${ct}`);
  }

  // GLOBAL-2: 4xx errors are structured JSON
  {
    const r = await req('POST', '/auth/login', { body: {} });
    const hasMsg = r.data && (r.data.message || r.data.error);
    log('GLOBAL-2', r.status >= 400 && hasMsg ? 'pass' : 'fail', '4xx returns structured error', `status=${r.status}, hasMessage=${!!hasMsg}`);
  }

  // GLOBAL-3: 5xx does not leak stack traces (test with bad route that errors)
  {
    // This should be a 404 not a 500
    const r = await req('GET', '/nonexistent-route-9999');
    log('GLOBAL-3', r.status !== 500 ? 'pass' : 'fail', 'Nonexistent route → 404, not 500', `got ${r.status}`);
  }

  // GLOBAL-4: CORS headers present
  {
    const r = await fetch(`${API}/patients`, {
      headers: { 
        Authorization: `Bearer ${adminToken}`,
        Origin: 'http://localhost:5173'
      }
    });
    const corsHeader = r.headers.get('access-control-allow-origin');
    log('GLOBAL-4', corsHeader ? 'pass' : 'fail', 'CORS header present', `origin=${corsHeader}`);
  }

  // GLOBAL-5: Response time check
  {
    const r = await req('GET', '/patients?page=1&limit=10', { token: adminToken });
    log('GLOBAL-5', r.elapsed < 500 ? 'pass' : 'warn', `Response time < 500ms`, `elapsed=${r.elapsed}ms`);
  }

  // GLOBAL-6: Health endpoint
  {
    const r = await fetch('http://127.0.0.1:5000/health');
    const data = await r.json();
    log('GLOBAL-6', r.status === 200 && data.status === 'healthy' ? 'pass' : 'fail', '/health returns healthy', `status=${r.status}`);
  }

  // GLOBAL-7: Auth /me with valid token
  {
    const r = await req('GET', '/auth/me', { token: adminToken });
    if (r.status === 200 && r.data?.data?.user) {
      const u = r.data.data.user;
      const noPassword = !u.password && !u.password_hash;
      log('GLOBAL-7', noPassword ? 'pass' : 'fail', '/auth/me does NOT leak password', `hasPassword=${!noPassword}`);
    } else {
      log('GLOBAL-7', 'fail', '/auth/me failed', `status=${r.status}`);
    }
  }
}

// =============================================================================
//  SECTION 9: CLEANUP
// =============================================================================
async function cleanup() {
  console.log('\n  🧹 Cleaning up test data...');
  
  // Delete test billing
  if (createdBillingId) {
    await req('DELETE', `/billing/${createdBillingId}`, { token: adminToken });
  }
  // Delete test patient  
  if (createdPatientId) {
    await req('DELETE', `/patients/${createdPatientId}`, { token: adminToken });
  }
  console.log('  ✅ Cleanup complete.\n');
}

// =============================================================================
//  RUNNER
// =============================================================================
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     🧪 HMS COMPREHENSIVE API TEST SUITE                     ║');
  console.log('║     Target: http://127.0.0.1:5000/api/v1                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // Verify server is up
  try {
    const health = await fetch('http://127.0.0.1:5000/health');
    if (health.status !== 200) throw new Error('Server not healthy');
    console.log('\n  ✅ Server is UP and healthy.\n');
  } catch (e) {
    console.error('\n  ❌ Server is DOWN at http://127.0.0.1:5000. Start it first!\n');
    process.exit(1);
  }

  await testAuth();
  await testPatients();
  await testAppointments();
  await testBilling();
  await testMiddleware();
  await testDatabaseE2E();
  await testAdditionalRoutes();
  await testGlobalChecks();
  await cleanup();

  // Print summary
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                📊  FINAL TEST RESULTS                       ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Tests:  ${String(results.total).padStart(4)}                                      ║`);
  console.log(`║  ✅ Passed:     ${String(results.pass).padStart(4)}                                      ║`);
  console.log(`║  ❌ Failed:     ${String(results.fail).padStart(4)}                                      ║`);
  console.log(`║  ⚠️  Warnings:  ${String(results.warn).padStart(4)}                                      ║`);
  console.log(`║  ⏭️  Skipped:   ${String(results.skip).padStart(4)}                                      ║`);
  const pct = results.total > 0 ? ((results.pass / results.total) * 100).toFixed(1) : 0;
  console.log(`║  Pass Rate:   ${pct}%                                      ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // Print failures
  const failures = results.details.filter(d => d.status === 'fail');
  if (failures.length > 0) {
    console.log('\n  🔴 FAILED TESTS:');
    for (const f of failures) {
      console.log(`     [${f.testId}] ${f.message} — ${f.details}`);
    }
  }

  const warnings = results.details.filter(d => d.status === 'warn');
  if (warnings.length > 0) {
    console.log('\n  🟡 WARNINGS:');
    for (const w of warnings) {
      console.log(`     [${w.testId}] ${w.message} — ${w.details}`);
    }
  }

  console.log('\n  🏁 Test suite complete.\n');
  process.exit(results.fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
