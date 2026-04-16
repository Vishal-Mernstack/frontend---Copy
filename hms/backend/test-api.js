import fetch from 'node-fetch';

const API_BASE = 'http://127.0.0.1:5000/api/v1';

// Test authentication
async function testAuth() {
  console.log('🔐 Testing Authentication...\n');
  
  // Test registration
  try {
    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Patient',
        email: 'testpatient@example.com',
        password: 'password123',
        role: 'patient'
      })
    });
    
    const registerData = await registerResponse.json();
    console.log('✅ Register Status:', registerResponse.status);
    console.log('✅ Register Response:', registerData);
    
    if (registerData.success) {
      const token = registerData.data.token;
      
      // Test login
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
        const loginToken = loginData.data.token;
        
        // Test protected route
        const meResponse = await fetch(`${API_BASE}/auth/me`, {
          headers: { 
            'Authorization': `Bearer ${loginToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        const meData = await meResponse.json();
        console.log('✅ Protected Route Status:', meResponse.status);
        console.log('✅ Protected Route Response:', meData);
      }
    }
  } catch (error) {
    console.error('❌ Auth Test Error:', error.message);
  }
}

// Test patients
async function testPatients() {
  console.log('\n👥 Testing Patients...\n');
  
  try {
    // Test create patient
    const createResponse = await fetch(`${API_BASE}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        age: 35,
        gender: 'Male',
        blood_type: 'O+',
        phone: '123-456-7890',
        email: 'john@example.com',
        address: '123 Main St'
      })
    });
    
    const createData = await createResponse.json();
    console.log('✅ Create Patient Status:', createResponse.status);
    console.log('✅ Create Patient Response:', createData);
    
    // Test get patients
    const getResponse = await fetch(`${API_BASE}/patients`);
    const getData = await getResponse.json();
    console.log('✅ Get Patients Status:', getResponse.status);
    console.log('✅ Get Patients Response:', getData);
    
  } catch (error) {
    console.error('❌ Patients Test Error:', error.message);
  }
}

// Test appointments
async function testAppointments() {
  console.log('\n📅 Testing Appointments...\n');
  
  try {
    const response = await fetch(`${API_BASE}/appointments`);
    const data = await response.json();
    console.log('✅ Get Appointments Status:', response.status);
    console.log('✅ Get Appointments Response:', data);
  } catch (error) {
    console.error('❌ Appointments Test Error:', error.message);
  }
}

// Test billing
async function testBilling() {
  console.log('\n💰 Testing Billing...\n');
  
  try {
    const response = await fetch(`${API_BASE}/billing`);
    const data = await response.json();
    console.log('✅ Get Billing Status:', response.status);
    console.log('✅ Get Billing Response:', data);
  } catch (error) {
    console.error('❌ Billing Test Error:', error.message);
  }
}

// Run all tests
async function runTests() {
  await testAuth();
  await testPatients();
  await testAppointments();
  await testBilling();
}

runTests().catch(console.error);
