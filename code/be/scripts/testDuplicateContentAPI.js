const axios = require('axios');

async function testDuplicateContentAPI() {
  console.log('🔍 Testing Duplicate Content API...\n');

  const baseURL = 'http://127.0.0.1:3000/api';
  
  // Test text with known duplicates
  const testText = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng";
  
  try {
    console.log('📝 Testing text:', testText);
    console.log('Making API request to check duplicate content...\n');
    
    const response = await axios.post(`${baseURL}/test-document-similarity`, {
      text: testText,
      options: {
        minSimilarity: 30,
        chunkSize: 50,
        maxResults: 20
      }
    });

    const result = response.data;
    console.log('✅ API Response received:');
    console.log('- Success:', result.success);
    console.log('- Duplicate Percentage:', result.duplicatePercentage);
    console.log('- Total Matches:', result.matches?.length || 0);
    console.log('- Total Input Sentences:', result.totalInputSentences);
    console.log('- Total Duplicated Sentences:', result.totalDuplicatedSentences);

    if (result.matches && result.matches.length > 0) {
      console.log('\n📋 Detailed Matches:');
      result.matches.forEach((match, index) => {
        console.log(`\nMatch ${index + 1}:`);
        console.log(`- Document: ${match.title || match.source}`);
        console.log(`- Similarity: ${match.similarity}%`);
        console.log(`- Duplicate Sentences: ${match.duplicateSentences || 0}`);
        
        if (match.duplicateSentencesDetails && match.duplicateSentencesDetails.length > 0) {
          console.log('- Duplicate Content Details:');
          match.duplicateSentencesDetails.slice(0, 2).forEach((detail, idx) => {
            console.log(`  ${idx + 1}. Input: "${detail.inputSentence || 'N/A'}"`);
            console.log(`     Source: "${detail.sourceSentence || 'N/A'}"`);
            console.log(`     Similarity: ${detail.similarity || 0}%`);
          });
        } else {
          console.log('- No duplicate sentence details available');
        }
      });
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
