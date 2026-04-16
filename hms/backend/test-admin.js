import fetch from 'node-fetch';

const API_BASE = 'http://127.0.0.1:5000/api/v1';

// Create admin user first (if needed) then test with admin token
async function testWithAdmin() {
  console.log('👑 Testing with Admin Access...\n');
  
  try {
    // Try to login with existing admin or create one
    let adminToken;
    
    // Try login with known admin credentials
    const adminLoginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@medicare.com',
        password: 'Admin@123'
      })
    });
    
    const adminLoginData = await adminLoginResponse.json();
    console.log('✅ Admin Login Status:', adminLoginResponse.status);
    console.log('✅ Admin Login Response:', adminLoginData);
    
    if (adminLoginData.success) {
      adminToken = adminLoginData.data.token;
    } else {
      // Try to create admin user (this should fail unless already logged in as admin)
      console.log('❌ Admin login failed, trying to understand system...');
    }
    
    if (adminToken) {
      const headers = { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      };
      
      // Test all CRUD operations with admin token
      const tests = [
        { name: 'Patients', url: '/patients', method: 'POST', 
          body: { name: 'Admin Test Patient', age: 35, gender: 'Male' } },
        { name: 'Appointments', url: '/appointments', method: 'POST',
          body: { patient_id: 1, doctor_id: 1, appointment_date: new Date().toISOString() } },
        { name: 'Billing', url: '/billing', method: 'POST',
          body: { patient_id: 1, doctor_id: 1, amount: 500.00 } },
        { name: 'Lab', url: '/lab', method: 'POST',
          body: { patient_id: 1, doctor_id: 1, test_name: 'Blood Test' } },
        { name: 'Pharmacy', url: '/pharmacy', method: 'POST',
          body: { medicine_name: 'Test Medicine', stock: 100, price: 25.00 } }
      ];
      
      for (const test of tests) {
        try {
          const response = await fetch(`${API_BASE}${test.url}`, {
            method: test.method,
            headers,
            body: JSON.stringify(test.body)
          });
          
          const data = await response.json();
          console.log(`✅ Admin ${test.name}:`, response.status, data.success ? 'Success' : data.message);
        } catch (error) {
          console.error(`❌ Admin ${test.name} Error:`, error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Admin Test Error:', error.message);
  }
}

testWithAdmin().catch(console.error);
