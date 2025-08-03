const axios = require('axios');

const testGoogleSession = async () => {
  const baseUrl = 'http://127.0.0.1:3000';
  
  console.log('🧪 Testing Google Session Management...\n');
  
  try {
    // 1. Check Google OAuth config
    console.log('1. Checking Google OAuth configuration...');
    const configResponse = await axios.get(`${baseUrl}/auth/google/config`);
    console.log('   Config:', configResponse.data);
    
    if (!configResponse.data.configured) {
      console.log('\n❌ Google OAuth not configured. Please set CLIENT_ID and CLIENT_SECRET in .env file.');
      return;
    }
    
    // 2. Check initial session status
    console.log('\n2. Checking initial session status...');
    try {
      const statusResponse = await axios.get(`${baseUrl}/auth/google/status`, {
        withCredentials: true
      });
      console.log('   Status:', statusResponse.data);
    } catch (error) {
      console.log('   Status: Not authenticated (expected)');
    }
    
    // 3. Test logout endpoint
    console.log('\n3. Testing logout endpoint...');
    try {
      const logoutResponse = await axios.get(`${baseUrl}/auth/google/logout`, {
        withCredentials: true
      });
      console.log('   Logout response:', logoutResponse.data);
    } catch (error) {
      console.log('   Logout error:', error.response?.data || error.message);
    }
    
    // 4. Instructions for manual testing
    console.log('\n4. Manual Testing Instructions:');
    console.log('   🔗 Open this URL in browser to test Google login:');
    console.log(`   ${baseUrl}/auth/google`);
    console.log('\n   After login, check session status:');
    console.log(`   ${baseUrl}/auth/google/status`);
    console.log('\n   Then logout:');
    console.log(`   ${baseUrl}/auth/google/logout`);
    console.log('\n   And try login again to see if it works.');
    
    console.log('\n✅ Google session test setup completed!');
    
  } catch (error) {
    console.error('\n❌ Error testing Google session:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
};

// Run the test
testGoogleSession();