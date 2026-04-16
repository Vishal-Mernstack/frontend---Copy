import fetch from 'node-fetch';

const API_BASE = 'http://127.0.0.1:5000/api/v1';

// Test complete hospital workflow
async function testCompleteWorkflow() {
  console.log('hospital Testing Complete Hospital Workflow...\n');
  
  // Get admin token for setup
  const adminLoginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@medicare.com',
      password: 'Admin@123'
    })
  });
  
  const adminLoginData = await adminLoginResponse.json();
  const adminToken = adminLoginData.data?.token;
  
  if (!adminToken) {
    console.error('Cannot get admin token for workflow testing');
    return;
  }
  
  const adminHeaders = { 
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // Step 1: Create a test patient
    console.log('1. Creating test patient...');
    const patientResponse = await fetch(`${API_BASE}/patients`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'Workflow Test Patient',
        age: 45,
        gender: 'Female',
        blood_type: 'A+',
        phone: '555-123-4567',
        email: 'workflow@example.com',
        address: '123 Workflow Street, Test City'
      })
    });
    
    const patientData = await patientResponse.json();
    console.log('   Patient Creation:', patientResponse.status, patientData.success ? 'Success' : patientData.message);
    
    if (!patientData.success) {
      console.error('Failed to create patient, stopping workflow');
      return;
    }
    
    const patientId = patientData.data.id;
    console.log(`   Patient ID: ${patientId}`);
    
    // Step 2: Create doctor if needed, then book appointment
    console.log('2. Creating doctor...');
    const doctorResponse = await fetch(`${API_BASE}/doctors`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'Dr. Workflow Test',
        specialization: 'General Medicine',
        qualification: 'MD',
        experience: 10,
        phone: '555-987-6543',
        email: 'doctor@workflow.com',
        status: 'active'
      })
    });
    
    const doctorData = await doctorResponse.json();
    console.log('   Doctor Creation:', doctorResponse.status, doctorData.success ? 'Success' : doctorData.message);
    
    const doctorId = doctorData.success ? doctorData.data.id : 1; // Use existing if creation fails
    console.log(`   Doctor ID: ${doctorId}`);
    
    // Step 3: Book appointment
    console.log('3. Booking appointment...');
    const appointmentResponse = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        duration: 30,
        type: 'consultation',
        status: 'scheduled',
        symptoms: 'Patient reports headache and fatigue',
        notes: 'Initial consultation'
      })
    });
    
    const appointmentData = await appointmentResponse.json();
    console.log('   Appointment Booking:', appointmentResponse.status, appointmentData.success ? 'Success' : appointmentData.message);
    
    if (!appointmentData.success) {
      console.error('Failed to book appointment, stopping workflow');
      return;
    }
    
    const appointmentId = appointmentData.data.id;
    console.log(`   Appointment ID: ${appointmentId}`);
    
    // Step 4: Create lab test order
    console.log('4. Ordering lab tests...');
    const labResponse = await fetch(`${API_BASE}/lab`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        patient_id: patientId,
        doctor_id: doctorId,
        test_name: 'Complete Blood Count (CBC)',
        result: 'Pending',
        status: 'Pending'
      })
    });
    
    const labData = await labResponse.json();
    console.log('   Lab Test Order:', labResponse.status, labData.success ? 'Success' : labData.message);
    
    const labId = labData.success ? labData.data.id : null;
    console.log(`   Lab Test ID: ${labId}`);
    
    // Step 5: Add medicines to pharmacy
    console.log('5. Adding medicines to pharmacy...');
    const pharmacyResponse = await fetch(`${API_BASE}/pharmacy`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        medicine_name: 'Ibuprofen 400mg',
        manufacturer: 'Test Pharma',
        stock: 100,
        price: 15.99,
        status: 'Active'
      })
    });
    
    const pharmacyData = await pharmacyResponse.json();
    console.log('   Pharmacy Medicine:', pharmacyResponse.status, pharmacyData.success ? 'Success' : pharmacyData.message);
    
    // Step 6: Generate billing
    console.log('6. Generating billing...');
    const billingResponse = await fetch(`${API_BASE}/billing`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_id: appointmentId,
        amount: 250.00,
        discount: 10.00,
        tax: 20.00,
        total: 260.00,
        status: 'pending',
        payment_method: 'cash',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Due in 7 days
        notes: 'Consultation and lab tests'
      })
    });
    
    const billingData = await billingResponse.json();
    console.log('   Billing Generation:', billingResponse.status, billingData.success ? 'Success' : billingData.message);
    
    if (!billingData.success) {
      console.error('Failed to generate billing, stopping workflow');
      return;
    }
    
    const billingId = billingData.data.id;
    console.log(`   Billing ID: ${billingId}`);
    
    // Step 7: Test patient login and view their data
    console.log('7. Testing patient access...');
    
    // First, register the patient as a user
    const patientUserResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Workflow Test Patient',
        email: 'workflow@example.com',
        password: 'password123',
        role: 'patient'
      })
    });
    
    const patientUserData = await patientUserResponse.json();
    console.log('   Patient User Registration:', patientUserResponse.status, patientUserData.success ? 'Success' : patientUserData.message);
    
    if (patientUserData.success) {
      // Login as patient
      const patientLoginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'workflow@example.com',
          password: 'password123'
        })
      });
      
      const patientLoginData = await patientLoginResponse.json();
      console.log('   Patient Login:', patientLoginResponse.status, patientLoginData.success ? 'Success' : patientLoginData.message);
      
      if (patientLoginData.success) {
        const patientToken = patientLoginData.data.token;
        const patientHeaders = { 
          'Authorization': `Bearer ${patientToken}`,
          'Content-Type': 'application/json'
        };
        
        // Test patient can view their own data
        const patientDataResponse = await fetch(`${API_BASE}/patients`, { headers: patientHeaders });
        const patientData = await patientDataResponse.json();
        console.log('   Patient View Data:', patientDataResponse.status, patientData.success ? 'Success' : patientData.message);
        
        // Test patient can view their appointments
        const patientAppointmentsResponse = await fetch(`${API_BASE}/appointments`, { headers: patientHeaders });
        const patientAppointmentsData = await patientAppointmentsResponse.json();
        console.log('   Patient View Appointments:', patientAppointmentsResponse.status, patientAppointmentsData.success ? 'Success' : patientAppointmentsData.message);
        
        // Test patient cannot access admin functions
        const patientBillingResponse = await fetch(`${API_BASE}/billing`, { headers: patientHeaders });
        const patientBillingData = await patientBillingResponse.json();
        console.log('   Patient Access Billing (should fail):', patientBillingResponse.status, patientBillingData.success ? 'Unexpected Success' : 'Properly Restricted');
      }
    }
    
    // Step 8: Test doctor login and workflow
    console.log('8. Testing doctor access...');
    
    // Register doctor as user
    const doctorUserResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Workflow Test',
        email: 'doctor@workflow.com',
        password: 'password123',
        role: 'doctor'
      })
    });
    
    const doctorUserData = await doctorUserResponse.json();
    console.log('   Doctor User Registration:', doctorUserData.status, doctorUserData.success ? 'Success' : doctorUserData.message);
    
    if (doctorUserData.success) {
      // Login as doctor
      const doctorLoginResponse = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'doctor@workflow.com',
          password: 'password123'
        })
      });
      
      const doctorLoginData = await doctorLoginResponse.json();
      console.log('   Doctor Login:', doctorLoginResponse.status, doctorLoginData.success ? 'Success' : doctorLoginData.message);
      
      if (doctorLoginData.success) {
        const doctorToken = doctorLoginData.data.token;
        const doctorHeaders = { 
          'Authorization': `Bearer ${doctorToken}`,
          'Content-Type': 'application/json'
        };
        
        // Test doctor can view appointments
        const doctorAppointmentsResponse = await fetch(`${API_BASE}/appointments`, { headers: doctorHeaders });
        const doctorAppointmentsData = await doctorAppointmentsResponse.json();
        console.log('   Doctor View Appointments:', doctorAppointmentsResponse.status, doctorAppointmentsData.success ? 'Success' : doctorAppointmentsData.message);
        
        // Test doctor can view patients
        const doctorPatientsResponse = await fetch(`${API_BASE}/patients`, { headers: doctorHeaders });
        const doctorPatientsData = await doctorPatientsResponse.json();
        console.log('   Doctor View Patients:', doctorPatientsResponse.status, doctorPatientsData.success ? 'Success' : doctorPatientsData.message);
        
        // Test doctor can access lab tests
        const doctorLabResponse = await fetch(`${API_BASE}/lab`, { headers: doctorHeaders });
        const doctorLabData = await doctorLabResponse.json();
        console.log('   Doctor Access Lab:', doctorLabResponse.status, doctorLabData.success ? 'Success' : doctorLabData.message);
        
        // Test doctor cannot access billing (should fail)
        const doctorBillingResponse = await fetch(`${API_BASE}/billing`, { headers: doctorHeaders });
        const doctorBillingData = await doctorBillingResponse.json();
        console.log('   Doctor Access Billing (should fail):', doctorBillingResponse.status, doctorBillingData.success ? 'Unexpected Success' : 'Properly Restricted');
      }
    }
    
    console.log('\nhospital Complete workflow test completed!');
    
  } catch (error) {
    console.error('hospital Workflow Test Error:', error.message);
  }
}

// Test edge cases and error scenarios
async function testEdgeCases() {
  console.log('\nedge Testing Edge Cases...\n');
  
  try {
    // Test concurrent operations
    console.log('1. Testing concurrent operations...');
    const promises = [];
    
    for (let i = 0; i < 5; i++) {
      promises.push(
        fetch(`${API_BASE}/patients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Concurrent Patient ${i}`,
            age: 30 + i,
            gender: 'Male'
          })
        })
      );
    }
    
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.status === 201).length;
    console.log(`   Concurrent Operations: ${successCount}/5 successful`);
    
    // Test large data
    console.log('2. Testing large data...');
    const largeDataResponse = await fetch(`${API_BASE}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A'.repeat(1000), // Very long name
        age: 30,
        gender: 'Male',
        medical_history: 'B'.repeat(5000) // Very long medical history
      })
    });
    
    const largeDataResult = await largeDataResponse.json();
    console.log('   Large Data Test:', largeDataResponse.status, largeDataResult.success ? 'Success' : largeDataResult.message);
    
    // Test special characters
    console.log('3. Testing special characters...');
    const specialCharsResponse = await fetch(`${API_BASE}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Ñáéíóú & Special <script>alert("xss")</script>',
        age: 30,
        gender: 'Male',
        notes: 'Testing XSS protection & SQL injection: \' OR 1=1 --'
      })
    });
    
    const specialCharsResult = await specialCharsResponse.json();
    console.log('   Special Characters Test:', specialCharsResponse.status, specialCharsResult.success ? 'Success' : specialCharsResult.message);
    
  } catch (error) {
    console.error('edge Edge Cases Test Error:', error.message);
  }
}

// Run workflow tests
async function runWorkflowTests() {
  await testCompleteWorkflow();
  await testEdgeCases();
}

runWorkflowTests().catch(console.error);
