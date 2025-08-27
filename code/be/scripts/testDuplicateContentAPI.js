const axios = require('axios');

async function testDuplicateContentAPI() {
  console.log('🧪 Testing Duplicate Content API with specific text...');
  
  // Test với text có 2 câu trùng lặp ở 2 documents khác nhau
  const testText = "Tôi là khánh. 10 giờ sáng nay, tâm bão số 3 (Wipha) ở vào khoảng 21,2 độ vĩ bắc và 109,6 độ kinh đông, cách Quảng Ninh khoảng 190 km, cách Hải Phòng 310 km.";
  
  try {
    const response = await axios.post('http://localhost:3000/api/test-document-similarity', {
      text: testText
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = response.data;
    
    console.log('\n📊 API Response Summary:');
    console.log('- Success:', result.success);
    console.log('- Check ID:', result.checkId);
    console.log('- Overall Similarity:', result.overallSimilarity + '%');
    console.log('- Dtotal:', result.dtotal + '%');
    console.log('- Total Matches:', result.totalMatches);
    console.log('- Checked Documents:', result.checkedDocuments);
    console.log('- Total Duplicated Sentences:', result.totalDuplicatedSentences);

    if (result.matches && result.matches.length > 0) {
      console.log('\n📋 Detailed Matches:');
      result.matches.forEach((match, index) => {
        console.log(`\nMatch ${index + 1}:`);
        console.log(`- Document: ${match.title || match.source}`);
        console.log(`- Document ID: ${match.documentId}`);
        console.log(`- Similarity: ${match.similarity}%`);
        console.log(`- Duplicate Sentences: ${match.duplicateSentences || 0}`);
        
        if (match.duplicateSentencesDetails && match.duplicateSentencesDetails.length > 0) {
          console.log('- Duplicate Content Details:');
          match.duplicateSentencesDetails.forEach((detail, idx) => {
            console.log(`  ${idx + 1}. Input: "${detail.inputSentence || 'N/A'}"`);
            console.log(`     Source: "${detail.sourceSentence || detail.docSentence || 'N/A'}"`);
            console.log(`     Similarity: ${detail.similarity || 0}%`);
            console.log(`     Input Index: ${detail.inputSentenceIndex || 'N/A'}`);
          });
        } else {
          console.log('- No duplicate sentence details available');
        }
      });
    } else {
      console.log('\n❌ No matches found');
    }

    console.log('\n🎯 Test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing API:', error.response?.data || error.message);
  }
}

// Run test if called directly
if (require.main === module) {
  testDuplicateContentAPI();
}

module.exports = testDuplicateContentAPI;
