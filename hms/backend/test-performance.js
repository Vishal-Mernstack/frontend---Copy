import fetch from 'node-fetch';

const API_BASE = 'http://127.0.0.1:5000/api/v1';

// Test API performance
async function testPerformance() {
  console.log('performance Testing API Performance...\n');
  
  // Get admin token for testing
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
    console.error('Cannot get admin token for performance testing');
    return;
  }
  
  const headers = { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // Test 1: Response time for different endpoints
    console.log('1. Testing Response Times...');
    const endpoints = [
      { name: 'GET /patients', url: '/patients', method: 'GET' },
      { name: 'GET /doctors', url: '/doctors', method: 'GET' },
      { name: 'GET /appointments', url: '/appointments', method: 'GET' },
      { name: 'GET /billing', url: '/billing', method: 'GET' },
      { name: 'GET /lab', url: '/lab', method: 'GET' },
      { name: 'GET /pharmacy', url: '/pharmacy', method: 'GET' }
    ];
    
    for (const endpoint of endpoints) {
      const times = [];
      
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        
        const response = await fetch(`${API_BASE}${endpoint.url}`, {
          method: endpoint.method,
          headers
        });
        
        const end = Date.now();
        times.push(end - start);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      console.log(`   ${endpoint.name}: Avg ${avgTime.toFixed(2)}ms, Min ${minTime}ms, Max ${maxTime}ms`);
    }
    
    // Test 2: Load testing
    console.log('\n2. Testing Load Handling...');
    
    const concurrentRequests = 10;
    const startTime = Date.now();
    
    const promises = [];
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        fetch(`${API_BASE}/patients`, {
          method: 'GET',
          headers
        })
      );
    }
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    const successCount = results.filter(r => r.status === 200).length;
    const totalTime = endTime - startTime;
    const avgTimePerRequest = totalTime / concurrentRequests;
    
    console.log(`   Concurrent Requests: ${successCount}/${concurrentRequests} successful`);
    console.log(`   Total Time: ${totalTime}ms`);
    console.log(`   Average Time per Request: ${avgTimePerRequest.toFixed(2)}ms`);
    
    // Test 3: Memory usage (simulate)
    console.log('\n3. Testing Memory Efficiency...');
    
    const largeDataSet = [];
    for (let i = 0; i < 100; i++) {
      largeDataSet.push({
        name: `Performance Test Patient ${i}`,
        age: 30 + (i % 50),
        gender: i % 2 === 0 ? 'Male' : 'Female',
        blood_type: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'][i % 8],
        phone: `555-${i.toString().padStart(4, '0')}`,
        email: `perf${i}@test.com`,
        address: `${i} Performance Street, Test City`,
        medical_history: `Test medical history for patient ${i}. `.repeat(10)
      });
    }
    
    const createPromises = largeDataSet.slice(0, 10).map(patient => 
      fetch(`${API_BASE}/patients`, {
        method: 'POST',
        headers,
        body: JSON.stringify(patient)
      })
    );
    
    const createResults = await Promise.all(createPromises);
    const createSuccessCount = createResults.filter(r => r.status === 201).length;
    
    console.log(`   Bulk Create: ${createSuccessCount}/10 successful`);
    
    // Test 4: Database query optimization
    console.log('\n4. Testing Query Optimization...');
    
    const searchTests = [
      { query: '', description: 'Empty search' },
      { query: 'test', description: 'Simple search' },
      { query: 'very long search term with many words', description: 'Complex search' }
    ];
    
    for (const test of searchTests) {
      const start = Date.now();
      
      const response = await fetch(`${API_BASE}/patients?search=${encodeURIComponent(test.query)}`, {
        method: 'GET',
        headers
      });
      
      const end = Date.now();
      const data = await response.json();
      
      console.log(`   ${test.description}: ${end - start}ms, ${data.data?.length || 0} results`);
    }
    
    // Test 5: Pagination performance
    console.log('\n5. Testing Pagination Performance...');
    
    const pageSizes = [10, 25, 50, 100];
    
    for (const size of pageSizes) {
      const start = Date.now();
      
      const response = await fetch(`${API_BASE}/patients?limit=${size}&offset=0`, {
        method: 'GET',
        headers
      });
      
      const end = Date.now();
      const data = await response.json();
      
      console.log(`   Page size ${size}: ${end - start}ms, ${data.data?.length || 0} results`);
    }
    
    console.log('\nperformance Performance testing completed!');
    
  } catch (error) {
    console.error('performance Performance Test Error:', error.message);
  }
}

// Test frontend performance
async function testFrontendPerformance() {
  console.log('\nfrontend Testing Frontend Performance...\n');
  
  try {
    // Test 1: Bundle size (simulate)
    console.log('1. Testing Bundle Size...');
    
    // This would normally be done with webpack-bundle-analyzer
    // For now, we'll just check if the frontend loads
    const frontendResponse = await fetch('http://localhost:8080');
    console.log(`   Frontend Load: ${frontendResponse.status === 200 ? 'Success' : 'Failed'}`);
    
    // Test 2: API response caching
    console.log('\n2. Testing API Response Caching...');
    
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
    
    if (token) {
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Make same request multiple times
      const times = [];
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        
        await fetch(`${API_BASE}/patients`, {
          method: 'GET',
          headers
        });
        
        const end = Date.now();
        times.push(end - start);
      }
      
      console.log(`   Request Times: ${times.map(t => `${t}ms`).join(', ')}`);
      console.log(`   Average: ${(times.reduce((a, b) => a + b, 0) / times.length).toFixed(2)}ms`);
    }
    
    // Test 3: Error handling performance
    console.log('\n3. Testing Error Handling Performance...');
    
    const errorTests = [
      { url: '/nonexistent', expected: 404 },
      { url: '/patients/999999', expected: 404 },
      { url: '/patients', method: 'POST', body: {}, expected: 401 }
    ];
    
    for (const test of errorTests) {
      const start = Date.now();
      
      const response = await fetch(`${API_BASE}${test.url}`, {
        method: test.method || 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: test.body ? JSON.stringify(test.body) : undefined
      });
      
      const end = Date.now();
      
      console.log(`   ${test.url}: ${end - start}ms (status: ${response.status}, expected: ${test.expected})`);
    }
    
  } catch (error) {
    console.error('frontend Frontend Performance Test Error:', error.message);
  }
}

// Run performance tests
async function runPerformanceTests() {
  await testPerformance();
  await testFrontendPerformance();
}

runPerformanceTests().catch(console.error);
