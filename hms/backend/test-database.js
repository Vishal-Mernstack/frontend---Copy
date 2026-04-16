import fetch from 'node-fetch';

const API_BASE = 'http://127.0.0.1:5000/api/v1';

// Test database constraints and relationships
async function testDatabaseConstraints() {
  console.log('🗄️ Testing Database Constraints...\n');
  
  // Get admin token
  const loginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@medicare.com',
      password: 'Admin@123'
    })
  });
  
  const loginData = await loginResponse.json();
  const token = loginData.data?.token;
  
  if (!token) {
    console.error('❌ Cannot get admin token for database testing');
    return;
  }
  
  const headers = { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // Test 1: Create patient with valid data
    console.log('👥 Creating test patient...');
    const patientResponse = await fetch(`${API_BASE}/patients`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Database Test Patient',
        age: 35,
        gender: 'Male',
        blood_type: 'O+',
        phone: '123-456-7890',
        email: 'dbtest@example.com'
      })
    });
    
    const patientData = await patientResponse.json();
    console.log('✅ Create Patient:', patientResponse.status, patientData.success ? 'Success' : patientData.message);
    
    if (patientData.success) {
      const patientId = patientData.data.id;
      
      // Test 2: Create appointment for this patient
      console.log('📅 Creating appointment for patient...');
      const appointmentResponse = await fetch(`${API_BASE}/appointments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          patient_id: patientId,
          doctor_id: 1,
          appointment_date: new Date().toISOString(),
          duration: 30,
          type: 'consultation',
          status: 'scheduled'
        })
      });
      
      const appointmentData = await appointmentResponse.json();
      console.log('✅ Create Appointment:', appointmentResponse.status, appointmentData.success ? 'Success' : appointmentData.message);
      
      if (appointmentData.success) {
        const appointmentId = appointmentData.data.id;
        
        // Test 3: Create billing for this appointment
        console.log('💰 Creating billing for appointment...');
        const billingResponse = await fetch(`${API_BASE}/billing`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            patient_id: patientId,
            doctor_id: 1,
            appointment_id: appointmentId,
            amount: 500.00,
            status: 'pending',
            payment_method: 'cash'
          })
        });
        
        const billingData = await billingResponse.json();
        console.log('✅ Create Billing:', billingResponse.status, billingData.success ? 'Success' : billingData.message);
        
        if (billingData.success) {
          const billingId = billingData.data.id;
          
          // Test 4: Try to delete patient (should fail due to FK constraints)
          console.log('🗑️ Testing FK constraint - trying to delete patient...');
          const deleteResponse = await fetch(`${API_BASE}/patients/${patientId}`, {
            method: 'DELETE',
            headers
          });
          
          const deleteData = await deleteResponse.json();
          console.log('✅ Delete Patient (should fail):', deleteResponse.status, deleteData.success ? 'Unexpected Success' : deleteData.message);
          
          // Test 5: Delete billing first, then patient (should work)
          console.log('💰 Deleting billing first...');
          const deleteBillingResponse = await fetch(`${API_BASE}/billing/${billingId}`, {
            method: 'DELETE',
            headers
          });
          
          const deleteBillingData = await deleteBillingResponse.json();
          console.log('✅ Delete Billing:', deleteBillingResponse.status, deleteBillingData.success ? 'Success' : deleteBillingData.message);
          
          if (deleteBillingData.success) {
            console.log('🗑️ Now deleting patient (should work)...');
            const deletePatientResponse = await fetch(`${API_BASE}/patients/${patientId}`, {
              method: 'DELETE',
              headers
            });
            
            const deletePatientData = await deletePatientResponse.json();
            console.log('✅ Delete Patient (after billing):', deletePatientResponse.status, deletePatientData.success ? 'Success' : deletePatientData.message);
          }
        }
      }
    }
    
    // Test 6: Invalid foreign key
    console.log('❌ Testing invalid foreign key...');
    const invalidFKResponse = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        patient_id: 999999, // Non-existent patient
        doctor_id: 999999, // Non-existent doctor
        appointment_date: new Date().toISOString(),
        duration: 30,
        type: 'consultation',
        status: 'scheduled'
      })
    });
    
    const invalidFKData = await invalidFKResponse.json();
    console.log('✅ Invalid FK Test:', invalidFKResponse.status, invalidFKData.success ? 'Unexpected Success' : invalidFKData.message);
    
  } catch (error) {
    console.error('❌ Database Constraint Test Error:', error.message);
  }
}

// Test data integrity
async function testDataIntegrity() {
  console.log('\n🔒 Testing Data Integrity...\n');
  
  try {
    // Test unique constraints
    console.log('🔍 Testing unique constraints...');
    
    // Test duplicate email
    const duplicateResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Test',
        email: 'admin@medicare.com', // Already exists
        password: 'password123',
        role: 'patient'
      })
    });
    
    const duplicateData = await duplicateResponse.json();
    console.log('✅ Duplicate Email Test:', duplicateResponse.status, duplicateData.success ? 'Unexpected Success' : duplicateData.message);
    
    // Test null constraints
    console.log('🚫 Testing null constraints...');
    
    const nullResponse = await fetch(`${API_BASE}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '', // Required field
        age: 35,
        gender: 'Male'
      })
    });
    
    const nullData = await nullResponse.json();
    console.log('✅ Null Constraint Test:', nullResponse.status, nullData.success ? 'Unexpected Success' : nullData.message);
    
  } catch (error) {
    console.error('❌ Data Integrity Test Error:', error.message);
  }
}

// Run database tests
async function runDatabaseTests() {
  await testDatabaseConstraints();
  await testDataIntegrity();
}

runDatabaseTests().catch(console.error);
