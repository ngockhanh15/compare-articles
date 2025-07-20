const mongoose = require('mongoose');
const DocumentAVLService = require('./be/services/DocumentAVLService');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/plagiarism_checker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function debugPercentageIssue() {
  try {
    console.log('🔍 Starting percentage calculation debug...');
    
    const documentAVLService = new DocumentAVLService();
    
    // Test với một văn bản mẫu
    const testText = `Đây là một văn bản test để kiểm tra tỷ lệ trùng lặp. 
    Chúng ta sẽ xem liệu có sự không nhất quán giữa tỷ lệ tổng thể và tỷ lệ từng document không.
    Văn bản này có thể trùng lặp với một số documents trong database.`;
    
    console.log('📝 Test text:', testText);
    console.log('📏 Text length:', testText.length);
    
    // Thực hiện kiểm tra
    const result = await documentAVLService.checkDuplicateContent(testText, {
      minSimilarity: 10, // Giảm threshold để dễ test
      chunkSize: 50,
      maxResults: 20
    });
    
    console.log('\n🎯 RESULTS ANALYSIS:');
    console.log('='.repeat(50));
    console.log(`Overall duplicate percentage: ${result.duplicatePercentage}%`);
    console.log(`Total matches found: ${result.matches.length}`);
    console.log(`Checked documents: ${result.checkedDocuments}`);
    
    if (result.matches.length > 0) {
      console.log('\n📊 INDIVIDUAL DOCUMENT SIMILARITIES:');
      result.matches.forEach((match, index) => {
        console.log(`${index + 1}. Document: "${match.title}"`);
        console.log(`   - Similarity: ${match.similarity}%`);
        console.log(`   - Matched hashes: ${match.matchedHashes}/${match.totalHashes}`);
        console.log(`   - Method: ${match.method}`);
        console.log('');
      });
      
      // Kiểm tra logic tính toán
      const highestSimilarity = Math.max(...result.matches.map(m => m.similarity));
      console.log(`🔍 CONSISTENCY CHECK:`);
      console.log(`Highest individual similarity: ${highestSimilarity}%`);
      console.log(`Overall duplicate percentage: ${result.duplicatePercentage}%`);
      console.log(`Are they consistent? ${highestSimilarity === result.duplicatePercentage ? '✅ YES' : '❌ NO'}`);
      
      if (highestSimilarity !== result.duplicatePercentage) {
        console.log('🚨 INCONSISTENCY DETECTED!');
        console.log('This explains why frontend shows different percentages.');
      }
    } else {
      console.log('No matches found with current threshold.');
    }
    
    console.log('\n📈 ADDITIONAL INFO:');
    console.log(`Dtotal: ${result.dtotal}`);
    console.log(`DA/B: ${result.dab}`);
    console.log(`Most similar document: ${result.mostSimilarDocument?.name || 'None'}`);
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugPercentageIssue();