const mongoose = require('mongoose');
const documentAVLService = require('./services/DocumentAVLService');
const vietnameseStopwordService = require('./services/VietnameseStopwordService');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/filter_word');

async function testAVLFix() {
  try {
    console.log('🚀 Testing AVL Tree Fix...\n');

    // Initialize services
    await vietnameseStopwordService.initialize();
    console.log('✅ Vietnamese Stopword Service initialized\n');

    await documentAVLService.initialize();
    console.log('✅ Document AVL Service initialized\n');

    // Test text with some common Vietnamese words
    const testText = `
      Trí tuệ nhân tạo là một lĩnh vực của khoa học máy tính.
      Nó tập trung vào việc tạo ra các hệ thống thông minh.
      Các hệ thống này có thể học hỏi và đưa ra quyết định.
      Machine learning là một phần quan trọng của AI.
      Deep learning sử dụng mạng neural nhân tạo.
    `;

    console.log('📝 Test text:');
    console.log(testText);
    console.log('\n' + '='.repeat(50) + '\n');

    // Check for duplicates
    const result = await documentAVLService.checkDuplicateContent(testText, {
      minSimilarity: 10, // Lower threshold for testing
      maxResults: 5
    });

    console.log('📊 Plagiarism Check Results:');
    console.log(`- Duplicate Percentage: ${result.duplicatePercentage}%`);
    console.log(`- Total Matches: ${result.totalMatches}`);
    console.log(`- Checked Documents: ${result.checkedDocuments}`);
    console.log(`- Total Input Hashes: ${result.totalInputHashes}`);
    console.log(`- Search Method: ${result.searchMethod}`);
    console.log(`- Confidence: ${result.confidence}`);

    if (result.matches && result.matches.length > 0) {
      console.log('\n🔍 Found Matches:');
      result.matches.forEach((match, index) => {
        console.log(`\n${index + 1}. Document: "${match.title}"`);
        console.log(`   - Similarity: ${match.similarity}%`);
        console.log(`   - Matched Hashes: ${match.matchedHashes}/${match.totalHashes}`);
        console.log(`   - File Type: ${match.fileType}`);
        if (match.matchedWords && match.matchedWords.length > 0) {
          console.log(`   - Matched Words: ${match.matchedWords.slice(0, 10).join(', ')}${match.matchedWords.length > 10 ? '...' : ''}`);
        }
      });
    } else {
      console.log('\n❌ No matches found');
      console.log('This could mean:');
      console.log('1. No documents in the system contain similar content');
      console.log('2. The similarity threshold is too high');
      console.log('3. The word hashing is working but no meaningful matches exist');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testAVLFix();