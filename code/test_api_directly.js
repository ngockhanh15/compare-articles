const axios = require('axios');

async function testApiDirectly() {
  console.log('=== TESTING API DIRECTLY ===\n');
  
  const doc2 = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";
  
  try {
    console.log('📤 Sending request to API...');
    console.log('Text:', doc2);
    console.log();
    
    const response = await axios.post('http://127.0.0.1:3000/api/plagiarism/check', {
      text: doc2
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('📥 API Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    const result = response.data;
    
    console.log('\n📊 ANALYSIS:');
    console.log(`Duplicate Rate: ${result.duplicateRate}%`);
    console.log(`Confidence: ${result.confidence}`);
    console.log(`Total Matches: ${result.matches ? result.matches.length : 0}`);
    console.log(`Processing Time: ${result.processingTime}ms`);
    
    if (result.duplicateRate === 0) {
      console.log('\n❌ PROBLEM DETECTED:');
      console.log('- API returns 0% despite having doc1 in database');
      console.log('- Need to check API endpoint logic');
    } else {
      console.log('\n✅ SUCCESS:');
      console.log(`- API returns ${result.duplicateRate}% as expected`);
      console.log(`- Logic working correctly`);
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testApiDirectly().catch(console.error);