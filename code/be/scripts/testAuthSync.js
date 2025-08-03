const axios = require('axios');

const testAuthSync = async () => {
  const baseUrl = 'http://127.0.0.1:3000';
  
  console.log('🧪 Testing Authentication Synchronization...\n');
  
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
      
      if (statusResponse.data.success) {
        console.log('   ✅ Found existing Google session!');
        console.log('   User:', statusResponse.data.user.email);
        console.log('   Token available:', !!statusResponse.data.token);
        
        // Test if token works with regular API
        if (statusResponse.data.token) {
          console.log('\n3. Testing token with regular API...');
          try {
            const meResponse = await axios.get(`${baseUrl}/api/auth/me`, {
              headers: {
                'Authorization': `Bearer ${statusResponse.data.token}`
              }
            });
            console.log('   ✅ Token works with /api/auth/me:', meResponse.data.success);
          } catch (tokenError) {
            console.log('   ❌ Token failed with /api/auth/me:', tokenError.response?.data || tokenError.message);
          }
        }
      }
    } catch (error) {
      console.log('   Status: Not authenticated (expected)');
    }
    
    // 4. Instructions for manual testing
    console.log('\n4. Manual Testing Instructions:');
    console.log('   🔗 Open this URL in browser to test Google login:');
    console.log(`   ${baseUrl}/auth/google`);
    console.log('\n   After login, the frontend should:');
    console.log('   - Automatically detect the Google session');
    console.log('   - Save user info and token to localStorage');
    console.log('   - Show user as logged in');
    console.log('\n   To test session persistence:');
    console.log('   - Refresh the page');
    console.log('   - User should remain logged in');
    console.log('\n   To test logout:');
    console.log(`   - Visit: ${baseUrl}/auth/google/logout`);
    console.log('   - Then refresh frontend - user should be logged out');
    
    console.log('\n✅ Authentication sync test setup completed!');
    
  } catch (error) {
    console.error('\n❌ Error testing auth sync:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
};

// Run the test
testAuthSync();