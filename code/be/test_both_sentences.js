const axios = require('axios');

async function testBothSentences() {
  console.log('=== TESTING BOTH SENTENCES ===\n');
  
  const doc1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
  const doc2 = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";
  
  console.log('Doc1:', doc1);
  console.log('Doc2:', doc2);
  console.log();
  
  try {
    // Test doc1
    console.log('📤 Testing Doc1...');
    const response1 = await axios.post('http://127.0.0.1:3000/api/test-plagiarism', {
      text: doc1
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('📥 Doc1 Result:');
    console.log(`Duplicate Rate: ${response1.data.duplicateRate}%`);
    console.log(`Confidence: ${response1.data.confidence}`);
    console.log(`Total Matches: ${response1.data.totalMatches}`);
    console.log();
    
    // Test doc2
    console.log('📤 Testing Doc2...');
    const response2 = await axios.post('http://127.0.0.1:3000/api/test-plagiarism', {
      text: doc2
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('📥 Doc2 Result:');
    console.log(`Duplicate Rate: ${response2.data.duplicateRate}%`);
    console.log(`Confidence: ${response2.data.confidence}`);
    console.log(`Total Matches: ${response2.data.totalMatches}`);
    console.log();
    
    // Analysis
    console.log('📊 ANALYSIS:');
    console.log('Doc1 vs Doc2 comparison:');
    console.log(`- Doc1: ${response1.data.duplicateRate}% duplicate`);
    console.log(`- Doc2: ${response2.data.duplicateRate}% duplicate`);
    
    if (response1.data.duplicateRate === 0 && response2.data.duplicateRate > 0) {
      console.log('\n🔍 ISSUE IDENTIFIED:');
      console.log('- Doc1 returns 0% but Doc2 returns high percentage');
      console.log('- This suggests Doc1 is not in database but Doc2 is');
      console.log('- Need to check why similar sentences have different results');
    } else if (response1.data.duplicateRate > 0 && response2.data.duplicateRate > 0) {
      console.log('\n✅ BOTH DETECTED:');
      console.log('- Both documents found in database');
      console.log('- System working as expected');
    } else {
      console.log('\n❓ UNEXPECTED RESULT:');
      console.log('- Need further investigation');
    }
    
    // Show matches details
    if (response1.data.matches && response1.data.matches.length > 0) {
      console.log('\n📋 Doc1 Matches:');
      response1.data.matches.forEach((match, index) => {
        console.log(`  ${index + 1}. Similarity: ${match.similarity}%, Method: ${match.method}`);
        if (match.matchedPhrases) {
          console.log(`     Matched phrases: ${match.matchedPhrases.join(', ')}`);
        }
      });
    }
    
    if (response2.data.matches && response2.data.matches.length > 0) {
      console.log('\n📋 Doc2 Matches:');
      response2.data.matches.forEach((match, index) => {
        console.log(`  ${index + 1}. Similarity: ${match.similarity}%, Method: ${match.method}`);
        if (match.matchedPhrases) {
          console.log(`     Matched phrases: ${match.matchedPhrases.join(', ')}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testBothSentences().catch(console.error);