import fetch from 'node-fetch';

const API_BASE = 'http://127.0.0.1:5000/api/v1';

// Test CRUD operations
async function testCRUD() {
  console.log('🧪 Testing CRUD Operations...\n');
  
  // Get admin token for testing
  const loginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'testpatient@example.com',
      password: 'password123'
    })
  });
  
  const loginData = await loginResponse.json();
  const token = loginData.data?.token;
  
  if (!token) {
    console.error('❌ Cannot get token for testing');
    return;
  }
  
  const headers = { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  // Test Patients CRUD
  console.log('👥 Testing Patients CRUD...');
  try {
    // Create patient
    const createResponse = await fetch(`${API_BASE}/patients`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'CRUD Test Patient',
        age: 30,
        gender: 'Male',
        blood_type: 'O+',
        phone: '123-456-7890',
        email: 'crudtest@example.com'
      })
    });
    
    const createData = await createResponse.json();
    console.log('✅ Create Patient:', createResponse.status, createData.success ? 'Success' : createData.message);
    
    if (createData.success) {
      const patientId = createData.data.id;
      
      // Read patient
      const readResponse = await fetch(`${API_BASE}/patients/${patientId}`, { headers });
      const readData = await readResponse.json();
      console.log('✅ Read Patient:', readResponse.status, readData.success ? 'Success' : readData.message);
      
      // Update patient
      const updateResponse = await fetch(`${API_BASE}/patients/${patientId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: 'Updated Patient Name',
          age: 31
        })
      });
      
      const updateData = await updateResponse.json();
      console.log('✅ Update Patient:', updateResponse.status, updateData.success ? 'Success' : updateData.message);
      
      // Delete patient
      const deleteResponse = await fetch(`${API_BASE}/patients/${patientId}`, {
        method: 'DELETE',
        headers
      });
      
      const deleteData = await deleteResponse.json();
      console.log('✅ Delete Patient:', deleteResponse.status, deleteData.success ? 'Success' : deleteData.message);
    }
  } catch (error) {
    console.error('❌ Patients CRUD Error:', error.message);
  }
  
  // Test Appointments CRUD
  console.log('\n📅 Testing Appointments CRUD...');
  try {
    const createResponse = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        patient_id: 1,
        doctor_id: 1,
        appointment_date: new Date().toISOString(),
        duration: 30,
        type: 'consultation',
        status: 'scheduled'
      })
    });
    
    const createData = await createResponse.json();
    console.log('✅ Create Appointment:', createResponse.status, createData.success ? 'Success' : createData.message);
  } catch (error) {
    console.error('❌ Appointments CRUD Error:', error.message);
  }
  
  // Test Billing CRUD
  console.log('\n💰 Testing Billing CRUD...');
  try {
    const createResponse = await fetch(`${API_BASE}/billing`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        patient_id: 1,
        doctor_id: 1,
        amount: 500.00,
        status: 'pending',
        payment_method: 'cash'
      })
    });
    
    const createData = await createResponse.json();
    console.log('✅ Create Billing:', createResponse.status, createData.success ? 'Success' : createData.message);
  } catch (error) {
    console.error('❌ Billing CRUD Error:', error.message);
  }
}

// Test validation
async function testValidation() {
  console.log('\n🔍 Testing Input Validation...');
  
  const invalidTests = [
    {
      name: 'Empty Name',
      endpoint: '/patients',
      data: { name: '', age: 30 }
    },
    {
      name: 'Invalid Age',
      endpoint: '/patients',
      data: { name: 'Test', age: -5 }
    },
    {
      name: 'Invalid Email',
      endpoint: '/auth/register',
      data: { name: 'Test', email: 'invalid-email', password: 'password123' }
    },
    {
      name: 'Short Password',
      endpoint: '/auth/register',
      data: { name: 'Test', email: 'test@example.com', password: '123' }
    }
  ];
  
  for (const test of invalidTests) {
    try {
      const response = await fetch(`${API_BASE}${test.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.data)
      });
      
      const data = await response.json();
      console.log(`✅ ${test.name}:`, response.status, data.success ? 'Unexpected Success' : 'Properly Rejected');
    } catch (error) {
      console.error(`❌ ${test.name} Error:`, error.message);
    }
  }
}

// Test error handling
async function testErrorHandling() {
  console.log('\n⚠️ Testing Error Handling...');
  
  try {
    // Test 404
    const response = await fetch(`${API_BASE}/nonexistent`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    console.log('✅ 404 Handling:', response.status, data.success === false ? 'Proper' : 'Issue');
    
    // Test invalid ID
    const invalidResponse = await fetch(`${API_BASE}/patients/999999`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const invalidData = await invalidResponse.json();
    console.log('✅ Invalid ID Handling:', invalidResponse.status, invalidData.success === false ? 'Proper' : 'Issue');
    
  } catch (error) {
    console.error('❌ Error Handling Test Error:', error.message);
  }
}

// Run all CRUD tests
async function runCRUDTests() {
  await testCRUD();
  await testValidation();
  await testErrorHandling();
}

runCRUDTests().catch(console.error);
