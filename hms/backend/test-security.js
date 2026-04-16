import fetch from 'node-fetch';

const API_BASE = 'http://127.0.0.1:5000/api/v1';

// Test security vulnerabilities
async function testSecurity() {
  console.log('security Testing Security Vulnerabilities...\n');
  
  try {
    // Test 1: SQL Injection attempts
    console.log('1. Testing SQL Injection...');
    const sqlInjectionTests = [
      { email: "' OR '1'='1", password: "password" },
      { email: "admin@medicare.com' --", password: "password" },
      { email: "admin@medicare.com'; DROP TABLE users; --", password: "password" },
      { email: "admin@medicare.com' UNION SELECT * FROM users --", password: "password" }
    ];
    
    for (const test of sqlInjectionTests) {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test)
      });
      
      const data = await response.json();
      console.log(`   SQL Injection Test: ${response.status}, ${data.success ? 'VULNERABLE!' : 'Protected'}`);
    }
    
    // Test 2: XSS attempts
    console.log('2. Testing XSS Protection...');
    const xssTests = [
      { name: '<script>alert("XSS")</script>', email: 'xss@test.com', password: 'password123' },
      { name: '<img src=x onerror=alert("XSS")>', email: 'xss2@test.com', password: 'password123' },
      { name: 'javascript:alert("XSS")', email: 'xss3@test.com', password: 'password123' }
    ];
    
    for (const test of xssTests) {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...test, role: 'patient' })
      });
      
      const data = await response.json();
      console.log(`   XSS Test: ${response.status}, ${data.success ? 'Success (check sanitization)' : data.message}`);
    }
    
    // Test 3: JWT Security
    console.log('3. Testing JWT Security...');
    
    // Test with malformed JWT
    const malformedJWTResponse = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': 'Bearer malformed.jwt.token' }
    });
    
    console.log(`   Malformed JWT: ${malformedJWTResponse.status} (should be 401)`);
    
    // Test with expired JWT (simulate)
    const expiredJWTResponse = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.invalid' }
    });
    
    console.log(`   Expired JWT: ${expiredJWTResponse.status} (should be 401)`);
    
    // Test 4: Rate limiting (if implemented)
    console.log('4. Testing Rate Limiting...');
    let rateLimitHit = false;
    
    for (let i = 0; i < 20; i++) {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: 'wrongpassword' })
      });
      
      if (response.status === 429) {
        rateLimitHit = true;
        console.log(`   Rate Limiting: Hit after ${i + 1} attempts`);
        break;
      }
    }
    
    if (!rateLimitHit) {
      console.log('   Rate Limiting: Not implemented or not triggered');
    }
    
    // Test 5: CORS Security
    console.log('5. Testing CORS Security...');
    const corsResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': 'http://malicious-site.com'
      },
      body: JSON.stringify({ email: 'test@test.com', password: 'password' })
    });
    
    console.log(`   CORS Test: ${corsResponse.status} (check if CORS headers are properly set)`);
    
    // Test 6: Password Strength
    console.log('6. Testing Password Requirements...');
    const weakPasswords = [
      '123',
      'password',
      'qwerty',
      'admin',
      '12345678',
      'abc'
    ];
    
    for (const password of weakPasswords) {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Weak Password Test',
          email: `weak${password}@test.com`,
          password: password,
          role: 'patient'
        })
      });
      
      const data = await response.json();
      console.log(`   Weak Password "${password}": ${response.status} (${data.success ? 'Accepted' : 'Rejected'})`);
    }
    
    // Test 7: Input Validation
    console.log('7. Testing Input Validation...');
    const invalidInputs = [
      { email: 'not-an-email', password: 'password123' },
      { email: '', password: 'password123' },
      { email: 'test@test.com', password: '' },
      { email: 'test@test.com', password: 'a' }
    ];
    
    for (const input of invalidInputs) {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      
      console.log(`   Invalid Input: ${response.status} (should be 400)`);
    }
    
    // Test 8: Authentication Bypass Attempts
    console.log('8. Testing Authentication Bypass...');
    
    // Test accessing protected routes without token
    const protectedRoutes = ['/patients', '/doctors', '/appointments', '/billing', '/lab', '/pharmacy'];
    
    for (const route of protectedRoutes) {
      const response = await fetch(`${API_BASE}${route}`, {
        method: 'GET'
      });
      
      console.log(`   No Token ${route}: ${response.status} (should be 401)`);
    }
    
    // Test with invalid role
    const adminLoginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@medicare.com',
        password: 'Admin@123'
      })
    });
    
    const adminLoginData = await adminLoginResponse.json();
    
    if (adminLoginData.success) {
      const token = adminLoginData.data.token;
      
      // Try to modify token (this won't work but tests the validation)
      const modifiedTokenResponse = await fetch(`${API_BASE}/patients`, {
        headers: { 'Authorization': `Bearer ${token}modified` }
      });
      
      console.log(`   Modified Token: ${modifiedTokenResponse.status} (should be 401)`);
    }
    
    console.log('\nsecurity Security testing completed!');
    
  } catch (error) {
    console.error('security Security Test Error:', error.message);
  }
}

// Test data exposure
async function testDataExposure() {
  console.log('\ndata Testing Data Exposure...\n');
  
  try {
    // Test if sensitive data is exposed in responses
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@medicare.com',
        password: 'Admin@123'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (loginData.success) {
      const user = loginData.data.user;
      
      // Check if password hash is exposed
      const hasPassword = Object.prototype.hasOwnProperty.call(user, 'password') || Object.prototype.hasOwnProperty.call(user, 'password_hash');
      console.log(`   Password Exposure: ${hasPassword ? 'VULNERABLE - Password exposed!' : 'Protected'}`);
      
      // Check if sensitive fields are properly filtered
      const sensitiveFields = ['password', 'password_hash', 'salt', 'secret', 'token'];
      const exposedFields = sensitiveFields.filter(field => Object.prototype.hasOwnProperty.call(user, field));
      
      if (exposedFields.length > 0) {
        console.log(`   Sensitive Data Exposure: ${exposedFields.join(', ')} - VULNERABLE!`);
      } else {
        console.log('   Sensitive Data Exposure: Protected');
      }
    }
    
    // Test error messages for information disclosure
    const nonExistentResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'password123'
      })
    });
    
    const nonExistentData = await nonExistentResponse.json();
    console.log(`   Error Message: "${nonExistentData.message}" - ${nonExistentData.message.includes('Invalid credentials') ? 'Generic (Good)' : 'Specific (May leak info)'}`);
    
  } catch (error) {
    console.error('data Data Exposure Test Error:', error.message);
  }
}

// Run security tests
async function runSecurityTests() {
  await testSecurity();
  await testDataExposure();
}

runSecurityTests().catch(console.error);
