const axios = require('axios');

async function testUserUploadEndpoint() {
  console.log('=== TESTING USER UPLOAD ENDPOINT ===\n');
  
  // Bạn cần thay thế token này bằng token thực từ việc đăng nhập
  const authToken = 'YOUR_AUTH_TOKEN_HERE';
  
  const testText = "Tôi thích thể thao nhưng không chuyên nghiệp."; // Chỉ trùng ít
  
  console.log('Test text:', testText);
  console.log();
  
  try {
    console.log('📤 Testing /api/user-upload/check-text endpoint...');
    const response = await axios.post('http://127.0.0.1:3000/api/user-upload/check-text', {
      text: testText,
      options: {
        sensitivity: 'medium',
        language: 'vi'
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      timeout: 30000
    });
    
    console.log('📥 API Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    const result = response.data.result;
    
    console.log('\n📊 DETAILED ANALYSIS:');
    console.log(`Duplicate Percentage: ${result.duplicatePercentage}%`);
    console.log(`Confidence: ${result.confidence}`);
    console.log(`Status: ${result.status}`);
    console.log(`Total Matches: ${result.totalMatches}`);
    console.log(`Processing Time: ${result.processingTime}ms`);
    
    if (result.matches && result.matches.length > 0) {
      console.log('\n📋 Matches Details:');
      result.matches.forEach((match, index) => {
        console.log(`  ${index + 1}. Source: ${match.source}`);
        console.log(`     Similarity: ${match.similarity}%`);
        console.log(`     Method: ${match.method}`);
        console.log(`     Text: ${match.text}`);
      });
    }
    
    // Kiểm tra xem có vấn đề gì không
    if (result.duplicatePercentage === 100 && result.matches && result.matches.length > 0) {
      const hasNon100Match = result.matches.some(match => match.similarity < 100);
      if (hasNon100Match) {
        console.log('\n❌ PROBLEM DETECTED:');
        console.log('- API returns 100% duplicatePercentage but has matches with < 100% similarity');
        console.log('- This suggests an issue in the logic');
      }
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    if (error.response && error.response.status === 401) {
      console.log('\n💡 Note: You need to login first and get a valid auth token');
      console.log('Steps to get auth token:');
      console.log('1. Login to the application');
      console.log('2. Open browser developer tools');
      console.log('3. Go to Application/Storage > Local Storage');
      console.log('4. Copy the "token" value');
      console.log('5. Replace YOUR_AUTH_TOKEN_HERE in this script');
    }
  }
}

console.log('⚠️  Note: You need to replace YOUR_AUTH_TOKEN_HERE with a valid auth token');
console.log('This endpoint requires authentication\n');

testUserUploadEndpoint().catch(console.error);