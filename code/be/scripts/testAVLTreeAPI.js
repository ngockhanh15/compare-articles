const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test configuration
const testConfig = {
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

async function testAVLTreeAPI() {
  try {
    console.log('🧪 Testing AVL Tree Database API Endpoints...\n');

    // First, we need to login to get admin token
    console.log('🔐 Step 1: Admin Login');
    
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    }, testConfig);

    if (!loginResponse.data.success) {
      throw new Error('Failed to login as admin');
    }

    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');

    // Update config with auth token
    testConfig.headers.Authorization = `Bearer ${token}`;

    // Test 1: Get AVL Tree Status
    console.log('\n📊 Step 2: Get AVL Tree Status');
    const statusResponse = await axios.get(`${BASE_URL}/avltree/status`, testConfig);
    
    console.log('Status response:', {
      success: statusResponse.data.success,
      memory: statusResponse.data.memory,
      persistence: statusResponse.data.persistence,
      database: statusResponse.data.database
    });

    // Test 2: Force Save
    console.log('\n💾 Step 3: Force Save AVL Tree');
    const saveResponse = await axios.post(`${BASE_URL}/avltree/save`, {}, testConfig);
    
    console.log('Save response:', {
      success: saveResponse.data.success,
      message: saveResponse.data.message,
      stats: saveResponse.data.stats
    });

    // Test 3: Get Debug Info
    console.log('\n🔍 Step 4: Get Debug Info');
    const debugResponse = await axios.get(`${BASE_URL}/avltree/debug`, testConfig);
    
    console.log('Debug response:', {
      success: debugResponse.data.success,
      metadata: debugResponse.data.data?.metadata,
      totalNodes: debugResponse.data.data?.totalNodes,
      totalDocuments: debugResponse.data.data?.totalDocuments,
      sampleNodes: debugResponse.data.data?.sampleNodes?.length
    });

    // Test 4: Reload from Database
    console.log('\n🔄 Step 5: Reload from Database');
    const reloadResponse = await axios.post(`${BASE_URL}/avltree/reload`, {}, testConfig);
    
    console.log('Reload response:', {
      success: reloadResponse.data.success,
      message: reloadResponse.data.message,
      stats: reloadResponse.data.stats
    });

    // Test 5: Check Status Again
    console.log('\n📈 Step 6: Check Status After Reload');
    const finalStatusResponse = await axios.get(`${BASE_URL}/avltree/status`, testConfig);
    
    console.log('Final status:', {
      success: finalStatusResponse.data.success,
      totalBackups: finalStatusResponse.data.database.totalBackups,
      latestSave: finalStatusResponse.data.database.latestSave,
      memoryNodes: finalStatusResponse.data.memory.totalNodes,
      databaseNodes: finalStatusResponse.data.database.savedNodes
    });

    console.log('\n✅ All API tests completed successfully!');

  } catch (error) {
    console.error('❌ API Test Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

// Run test if called directly
if (require.main === module) {
  testAVLTreeAPI()
    .then(() => {
      console.log('\n🎉 API test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('API test failed:', error);
      process.exit(1);
    });
}

module.exports = testAVLTreeAPI;
