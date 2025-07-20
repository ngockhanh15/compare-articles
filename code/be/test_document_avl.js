const axios = require('axios');

async function testDocumentAVL() {
  console.log('=== TESTING DOCUMENT AVL SERVICE ===\n');
  
  const doc1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
  const doc2 = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";
  
  console.log('Doc1:', doc1);
  console.log('Doc2:', doc2);
  console.log();
  
  try {
    // Get auth token first (you'll need to login)
    console.log('📤 Testing with user-upload endpoint (DocumentAVL)...');
    
    // Test doc1
    console.log('📤 Testing Doc1 with DocumentAVL...');
    const response1 = await axios.post('http://127.0.0.1:3000/api/user-upload/check-text', {
      text: doc1,
      options: {
        sensitivity: 'medium',
        language: 'vi'
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // You need to get this from login
      },
      timeout: 30000
    });
    
    console.log('📥 Doc1 Result (DocumentAVL):');
    console.log(`Duplicate Rate: ${response1.data.result.duplicatePercentage}%`);
    console.log(`Confidence: ${response1.data.result.confidence}`);
    console.log(`Total Matches: ${response1.data.result.totalMatches}`);
    console.log();
    
    // Test doc2
    console.log('📤 Testing Doc2 with DocumentAVL...');
    const response2 = await axios.post('http://127.0.0.1:3000/api/user-upload/check-text', {
      text: doc2,
      options: {
        sensitivity: 'medium',
        language: 'vi'
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // You need to get this from login
      },
      timeout: 30000
    });
    
    console.log('📥 Doc2 Result (DocumentAVL):');
    console.log(`Duplicate Rate: ${response2.data.result.duplicatePercentage}%`);
    console.log(`Confidence: ${response2.data.result.confidence}`);
    console.log(`Total Matches: ${response2.data.result.totalMatches}`);
    console.log();
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// First, let's check tree stats without auth
async function checkTreeStats() {
  try {
    console.log('📊 Checking DocumentAVL tree stats...');
    const response = await axios.get('http://127.0.0.1:3000/api/user-upload/tree-stats', {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // You need to get this from login
      }
    });
    
    console.log('Tree Stats:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Tree Stats Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

console.log('⚠️  Note: You need to login first and get auth token to test DocumentAVL service');
console.log('The DocumentAVL service requires authentication and checks against uploaded documents');
console.log('PlagiarismDetectionService checks against plagiarism check history\n');

// checkTreeStats();
// testDocumentAVL().catch(console.error);