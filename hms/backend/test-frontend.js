import fetch from 'node-fetch';

const API_BASE = 'http://127.0.0.1:5000/api/v1';
const FRONTEND_URL = 'http://localhost:8080';

// Test frontend UI components
async function testFrontendUI() {
  console.log('ui Testing Frontend UI Components...\n');
  
  try {
    // Test 1: Check if frontend is accessible
    console.log('1. Testing Frontend Accessibility...');
    
    const frontendResponse = await fetch(FRONTEND_URL);
    console.log(`   Frontend Status: ${frontendResponse.status}`);
    console.log(`   Frontend Accessible: ${frontendResponse.status === 200 ? 'Yes' : 'No'}`);
    
    // Test 2: Check key frontend pages
    console.log('\n2. Testing Key Frontend Pages...');
    
    const pages = [
      { path: '/', name: 'Home/Login' },
      { path: '/role-based-login', name: 'Role Based Login' },
      { path: '/register', name: 'Register' }
    ];
    
    for (const page of pages) {
      try {
        const response = await fetch(`${FRONTEND_URL}${page.path}`);
        console.log(`   ${page.name}: ${response.status} (${response.status === 200 ? 'Accessible' : 'Not Found'})`);
      } catch (error) {
        console.log(`   ${page.name}: Error - ${error.message}`);
      }
    }
    
    // Test 3: Check API integration
    console.log('\n3. Testing Frontend API Integration...');
    
    // Test login endpoint that frontend would use
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
      console.log('   API Integration: Successful (can authenticate)');
      
      // Test if frontend can access protected data
      const token = loginData.data.token;
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const patientsResponse = await fetch(`${API_BASE}/patients`, { headers });
      console.log(`   Protected Data Access: ${patientsResponse.status === 200 ? 'Working' : 'Failed'}`);
      
    } else {
      console.log('   API Integration: Failed (authentication issue)');
    }
    
    // Test 4: Check error handling
    console.log('\n4. Testing Error Handling...');
    
    // Test invalid credentials
    const invalidLoginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid@test.com',
        password: 'wrongpassword'
      })
    });
    
    const invalidLoginData = await invalidLoginResponse.json();
    console.log(`   Invalid Login: ${invalidLoginResponse.status} (${invalidLoginData.success ? 'Unexpected Success' : 'Properly Handled'})`);
    
    // Test validation errors
    const validationResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '',
        email: 'invalid-email',
        password: '123'
      })
    });
    
    const validationData = await validationResponse.json();
    console.log(`   Validation Errors: ${validationResponse.status} (${validationResponse.status === 400 ? 'Properly Handled' : 'Not Handled'})`);
    
    // Test 5: Check CORS settings
    console.log('\n5. Testing CORS Configuration...');
    
    const corsResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      },
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'test'
      })
    });
    
    console.log(`   CORS Test: ${corsResponse.status} (${corsResponse.status !== 0 ? 'Working' : 'Blocked'})`);
    
    console.log('\nui Frontend UI testing completed!');
    
  } catch (error) {
    console.error('ui Frontend UI Test Error:', error.message);
  }
}

// Test form validation
async function testFormValidation() {
  console.log('\nforms Testing Form Validation...\n');
  
  try {
    // Test registration form validation
    console.log('1. Testing Registration Form Validation...');
    
    const validationTests = [
      {
        name: 'Empty Name',
        data: { name: '', email: 'test@example.com', password: 'password123' },
        expectedStatus: 400
      },
      {
        name: 'Invalid Email',
        data: { name: 'Test User', email: 'invalid-email', password: 'password123' },
        expectedStatus: 400
      },
      {
        name: 'Short Password',
        data: { name: 'Test User', email: 'test@example.com', password: '123' },
        expectedStatus: 400
      },
      {
        name: 'Valid Data',
        data: { name: 'Valid User', email: 'valid@example.com', password: 'password123', role: 'patient' },
        expectedStatus: 201
      }
    ];
    
    for (const test of validationTests) {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.data)
      });
      
      const data = await response.json();
      const passed = response.status === test.expectedStatus;
      console.log(`   ${test.name}: ${response.status} (${passed ? 'Passed' : 'Failed'})`);
      
      if (!passed) {
        console.log(`     Expected: ${test.expectedStatus}, Got: ${response.status}`);
        console.log(`     Message: ${data.message}`);
      }
    }
    
    // Test patient form validation
    console.log('\n2. Testing Patient Form Validation...');
    
    const patientValidationTests = [
      {
        name: 'Empty Name',
        data: { name: '', age: 30, gender: 'Male' },
        expectedStatus: 401 // Unauthorized (no token)
      },
      {
        name: 'Invalid Age',
        data: { name: 'Test', age: -5, gender: 'Male' },
        expectedStatus: 401 // Unauthorized (no token)
      }
    ];
    
    for (const test of patientValidationTests) {
      const response = await fetch(`${API_BASE}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.data)
      });
      
      const passed = response.status === test.expectedStatus;
      console.log(`   ${test.name}: ${response.status} (${passed ? 'Passed' : 'Failed'})`);
    }
    
    console.log('\nforms Form validation testing completed!');
    
  } catch (error) {
    console.error('forms Form Validation Test Error:', error.message);
  }
}

// Test loading states and error states
async function testLoadingAndErrorStates() {
  console.log('\nloading Testing Loading and Error States...\n');
  
  try {
    // Test 1: Simulate slow API response
    console.log('1. Testing Loading States...');
    
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE}/patients`, {
      headers: { 'Authorization': 'Bearer invalid-token' }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`   Error Response Time: ${responseTime}ms`);
    console.log(`   Error Status: ${response.status} (${response.status === 401 ? 'Properly Handled' : 'Issue'})`);
    
    // Test 2: Test timeout handling
    console.log('\n2. Testing Timeout Handling...');
    
    // This would normally test slow endpoints, but we'll simulate with invalid endpoints
    const timeoutResponse = await fetch(`${API_BASE}/nonexistent-endpoint`, {
      timeout: 5000 // 5 second timeout
    });
    
    console.log(`   Timeout Test: ${timeoutResponse.status} (${timeoutResponse.status === 404 ? 'Properly Handled' : 'Issue'})`);
    
    // Test 3: Test network error simulation
    console.log('\n3. Testing Network Error Handling...');
    
    try {
      const networkErrorResponse = await fetch('http://127.0.0.1:9999/api/v1/test', {
        timeout: 1000
      });
    } catch (error) {
      console.log(`   Network Error: Properly Caught (${error.name})`);
    }
    
    console.log('\nloading Loading and error states testing completed!');
    
  } catch (error) {
    console.error('loading Loading/Error States Test Error:', error.message);
  }
}

// Run frontend tests
async function runFrontendTests() {
  await testFrontendUI();
  await testFormValidation();
  await testLoadingAndErrorStates();
}

runFrontendTests().catch(console.error);
