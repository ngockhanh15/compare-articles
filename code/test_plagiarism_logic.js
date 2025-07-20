const mongoose = require('mongoose');
const plagiarismDetectionService = require('./be/services/PlagiarismDetectionService');

// Kết nối MongoDB
mongoose.connect('mongodb://localhost:27017/filter_word', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testPlagiarismLogic() {
  console.log('=== TESTING PLAGIARISM LOGIC ===\n');

  try {
    // Test case 1: Kiểm tra văn bản lần đầu tiên (database trống)
    console.log('1. Testing first-time check (empty database)...');
    const text1 = "Tôi thích thể thao nhưng không chuyên nghiệp.";
    
    const result1 = await plagiarismDetectionService.checkPlagiarism(text1);
    console.log(`   Result 1:`);
    console.log(`   - duplicatePercentage: ${result1.duplicatePercentage}%`);
    console.log(`   - matches found: ${result1.matches.length}`);
    console.log(`   - confidence: ${result1.confidence}`);
    console.log(`   - totalDocumentsChecked: ${result1.totalDocumentsChecked}\n`);

    // Test case 2: Kiểm tra cùng văn bản lần thứ 2 (sau khi đã thêm vào cây)
    console.log('2. Testing same text again (should find match now)...');
    
    const result2 = await plagiarismDetectionService.checkPlagiarism(text1);
    console.log(`   Result 2:`);
    console.log(`   - duplicatePercentage: ${result2.duplicatePercentage}%`);
    console.log(`   - matches found: ${result2.matches.length}`);
    console.log(`   - confidence: ${result2.confidence}`);
    console.log(`   - totalDocumentsChecked: ${result2.totalDocumentsChecked}`);
    
    if (result2.matches.length > 0) {
      console.log(`   - First match similarity: ${result2.matches[0].similarity}%`);
      console.log(`   - First match method: ${result2.matches[0].method}`);
    }
    console.log('');

    // Test case 3: Kiểm tra văn bản tương tự
    console.log('3. Testing similar text...');
    const text3 = "Tôi rất thích thể thao nhưng không phải chuyên nghiệp.";
    
    const result3 = await plagiarismDetectionService.checkPlagiarism(text3);
    console.log(`   Result 3:`);
    console.log(`   - duplicatePercentage: ${result3.duplicatePercentage}%`);
    console.log(`   - matches found: ${result3.matches.length}`);
    console.log(`   - confidence: ${result3.confidence}`);
    console.log(`   - totalDocumentsChecked: ${result3.totalDocumentsChecked}`);
    
    if (result3.matches.length > 0) {
      console.log(`   - First match similarity: ${result3.matches[0].similarity}%`);
      console.log(`   - First match method: ${result3.matches[0].method}`);
    }
    console.log('');

    // Test case 4: Kiểm tra văn bản hoàn toàn khác
    console.log('4. Testing different text...');
    const text4 = "Hôm nay trời đẹp và tôi muốn đi dạo công viên.";
    
    const result4 = await plagiarismDetectionService.checkPlagiarism(text4);
    console.log(`   Result 4:`);
    console.log(`   - duplicatePercentage: ${result4.duplicatePercentage}%`);
    console.log(`   - matches found: ${result4.matches.length}`);
    console.log(`   - confidence: ${result4.confidence}`);
    console.log(`   - totalDocumentsChecked: ${result4.totalDocumentsChecked}\n`);

    // Kiểm tra stats cuối cùng
    console.log('5. Final tree stats:');
    const finalStats = plagiarismDetectionService.getStats();
    console.log(`   - Total documents: ${finalStats.totalDocuments}`);
    console.log(`   - Total words: ${finalStats.totalWords}`);
    console.log(`   - Total sentences: ${finalStats.totalSentences}`);
    console.log(`   - Initialized: ${finalStats.initialized}`);

    // Kiểm tra logic
    console.log('\n6. Logic validation:');
    if (result1.duplicatePercentage === 0 && result1.matches.length === 0) {
      console.log('   ✅ First check correctly returns 0% (no existing data)');
    } else {
      console.log('   ❌ First check should return 0%');
    }

    if (result2.duplicatePercentage > 0 && result2.matches.length > 0) {
      console.log('   ✅ Second check correctly finds match with same text');
    } else {
      console.log('   ❌ Second check should find match with same text');
    }

    if (result3.duplicatePercentage > 0 && result3.matches.length > 0) {
      console.log('   ✅ Similar text correctly finds partial match');
    } else {
      console.log('   ❌ Similar text should find some match');
    }

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Chạy test
testPlagiarismLogic().then(() => {
  console.log('\n=== TEST COMPLETED ===');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test failed:', error);
  mongoose.connection.close();
  process.exit(1);
});