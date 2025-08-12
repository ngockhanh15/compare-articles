const axios = require('axios');

async function testDuplicateContentDisplay() {
  console.log('🔍 Testing Duplicate Content Display...\n');

  const baseURL = 'http://127.0.0.1:3000/api';
  
  // Test text với known duplicates
  const testText = "Tôi là Khánh, tôi ưa thích thể thao, hôm nay tôi buồn";
  
  try {
    console.log('📝 Testing text:', testText);
    console.log('Making API request...\n');
    
    const response = await axios.post(`${baseURL}/test-document-similarity`, {
      text: testText,
      options: {
        minSimilarity: 30,
        chunkSize: 50,
        maxResults: 20
      }
    }, {
      timeout: 15000
    });

    const result = response.data;
    console.log('✅ API Response received:');
    console.log('- Success:', result.success);
    console.log('- Duplicate Percentage:', result.duplicatePercentage);
    console.log('- Total Matches:', result.matches?.length || 0);
    console.log('- Total Input Sentences:', result.totalInputSentences);
    console.log('- Total Duplicated Sentences:', result.totalDuplicatedSentences);

    if (result.matches && result.matches.length > 0) {
      console.log('\n📋 Analyzing First Match:');
      const firstMatch = result.matches[0];
      console.log(`- Document: ${firstMatch.title || firstMatch.source}`);
      console.log(`- Similarity: ${firstMatch.similarity}%`);
      console.log(`- Duplicate Sentences Count: ${firstMatch.duplicateSentences || 0}`);
      
      if (firstMatch.duplicateSentencesDetails) {
        console.log(`- Duplicate Details Array Length: ${firstMatch.duplicateSentencesDetails.length}`);
        
        if (firstMatch.duplicateSentencesDetails.length > 0) {
          console.log('\n🔍 First Duplicate Detail:');
          const detail = firstMatch.duplicateSentencesDetails[0];
          console.log('  Full detail object:', JSON.stringify(detail, null, 2));
          console.log('  - Input Sentence:', detail.inputSentence || 'MISSING');
          console.log('  - Source Sentence:', detail.sourceSentence || 'MISSING');
          console.log('  - Matched Sentence:', detail.matchedSentence || 'MISSING');
          console.log('  - Similarity:', detail.similarity || 'MISSING');
          console.log('  - Matched Similarity:', detail.matchedSentenceSimilarity || 'MISSING');
        } else {
          console.log('  ❌ Details array is empty');
        }
      } else {
        console.log('  ❌ No duplicateSentencesDetails found');
      }
    }

    console.log('\n🎯 Test completed!');

  } catch (error) {
    console.error('❌ Error testing API:', error.response?.data || error.message);
    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
      console.log('💡 Tip: Make sure the server is running on port 3000');
    }
  }
}

testDuplicateContentDisplay();
