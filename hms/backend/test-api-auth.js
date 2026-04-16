import fetch from 'node-fetch';

const API_BASE = 'http://127.0.0.1:5000/api/v1';

// Test authentication with token
async function testAuthWithToken() {
  console.log('🔐 Testing Authentication with Token...\n');
  
  try {
    // First login to get token
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'testpatient@example.com',
        password: 'password123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('✅ Login Status:', loginResponse.status);
    console.log('✅ Login Response:', loginData);
    
    if (loginData.success) {
      const token = loginData.data.token;
      
      // Test protected routes with token
      const testRoutes = [
        { name: 'Patients', url: '/patients' },
        { name: 'Appointments', url: '/appointments' },
        { name: 'Billing', url: '/billing' },
        { name: 'Lab', url: '/lab' },
        { name: 'Pharmacy', url: '/pharmacy' }
      ];
      
      for (const route of testRoutes) {
        try {
          const response = await fetch(`${API_BASE}${route.url}`, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          const data = await response.json();
          console.log(`✅ ${route.name} Status:`, response.status);
          console.log(`✅ ${route.name} Response:`, data?.success ? 'Success' : data?.message);
        } catch (error) {
          console.error(`❌ ${route.name} Error:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ Auth Test Error:', error.message);
  }
}

// Test different roles
async function testRoles() {
  console.log('\n👥 Testing Role-Based Access...\n');
  
  const roles = ['admin', 'doctor', 'nurse', 'patient'];
  
  for (const role of roles) {
    try {
      // Register user with role
      const registerResponse = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Test ${role}`,
          email: `test${role}@example.com`,
          password: 'password123',
          role: role
        })
      });
      
      const registerData = await registerResponse.json();
      console.log(`✅ Register ${role} Status:`, registerResponse.status);
      console.log(`✅ Register ${role} Response:`, registerData?.success ? 'Success' : registerData?.message);
      
      if (registerData.success) {
        // Login with role
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `test${role}@example.com`,
            password: 'password123'
          })
        });
        
        const loginData = await loginResponse.json();
        console.log(`✅ Login ${role} Status:`, loginResponse.status);
        console.log(`✅ Login ${role} Response:`, loginData?.success ? 'Success' : loginData?.message);
      }
    } catch (error) {
      console.error(`❌ Role ${role} Error:`, error.message);
    }
  }
}

// Test invalid authentication
async function testInvalidAuth() {
  console.log('\n🚫 Testing Invalid Authentication...\n');
  
  const invalidTests = [
    { name: 'Wrong Password', email: 'testpatient@example.com', password: 'wrongpassword' },
    { name: 'Non-existent User', email: 'nonexistent@example.com', password: 'password123' },
    { name: 'Missing Email', email: '', password: 'password123' },
    { name: 'Missing Password', email: 'test@example.com', password: '' }
  ];
  
  for (const test of invalidTests) {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: test.email,
          password: test.password
        })
      });
      
      const data = await response.json();
      console.log(`✅ ${test.name} Status:`, response.status);
      console.log(`✅ ${test.name} Response:`, data?.success ? 'Unexpected Success' : data?.message);
    } catch (error) {
      console.error(`❌ ${test.name} Error:`, error.message);
    }
  }
}

// Test token validation
async function testTokenValidation() {
  console.log('\n🔑 Testing Token Validation...\n');
  
  try {
    // Test with invalid token
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { 
        'Authorization': 'Bearer invalid_token_here',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('✅ Invalid Token Status:', response.status);
    console.log('✅ Invalid Token Response:', data?.success ? 'Unexpected Success' : data?.message);
    
    // Test with no token
    const noTokenResponse = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const noTokenData = await noTokenResponse.json();
    console.log('✅ No Token Status:', noTokenResponse.status);
    console.log('✅ No Token Response:', noTokenData?.success ? 'Unexpected Success' : noTokenData?.message);
    
  } catch (error) {
    console.error('❌ Token Validation Error:', error.message);
  }
}

// Run all auth tests
async function runAuthTests() {
  await testAuthWithToken();
  await testRoles();
  await testInvalidAuth();
  await testTokenValidation();
}

runAuthTests().catch(console.error);
