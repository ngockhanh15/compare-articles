const mongoose = require('mongoose');
const plagiarismDetectionService = require('./services/PlagiarismDetectionService');
const Document = require('./models/Document');
require('dotenv').config();

async function testCleanDatabase() {
  console.log('=== TESTING WITH CLEAN DATABASE ===\n');
  
  try {
    // 1. Kết nối database
    console.log('1. Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected successfully');
    console.log();
    
    // 2. Xóa tất cả documents trong database (để test sạch)
    console.log('2. Cleaning database...');
    const deleteResult = await Document.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} documents`);
    console.log();
    
    // 3. Khởi tạo service với database sạch
    console.log('3. Initializing service with clean database...');
    await plagiarismDetectionService.initialize();
    console.log('✅ Service initialized');
    
    const stats = plagiarismDetectionService.getStats();
    console.log('Clean database stats:', stats);
    console.log();
    
    // 4. Test documents
    const doc1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
    const doc2 = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";
    
    console.log('4. Test documents:');
    console.log('DOC1:', doc1);
    console.log('DOC2:', doc2);
    console.log();
    
    // 5. Test doc2 với database trống (should be 0%)
    console.log('5. Testing doc2 with empty database (should be 0%)...');
    const emptyResult = await plagiarismDetectionService.checkPlagiarism(doc2, { sensitivity: 'medium' });
    console.log('Empty database result:', {
      duplicatePercentage: emptyResult.duplicatePercentage,
      confidence: emptyResult.confidence,
      totalMatches: emptyResult.matches.length
    });
    console.log();
    
    // 6. Thêm doc1 vào database
    console.log('6. Adding doc1 to database...');
    const doc1Id = plagiarismDetectionService.addDocumentToTree(doc1, {
      id: 'test-doc-1',
      name: 'Test Document 1 - Doc1',
      addedAt: Date.now()
    });
    console.log('✅ Doc1 added with ID:', doc1Id);
    
    const newStats = plagiarismDetectionService.getStats();
    console.log('Stats after adding doc1:', newStats);
    console.log();
    
    // 7. Test doc2 với database có chỉ doc1 (should be 66.67%)
    console.log('7. Testing doc2 with database containing only doc1 (should be 66.67%)...');
    const result = await plagiarismDetectionService.checkPlagiarism(doc2, { sensitivity: 'medium' });
    
    console.log('Result with only doc1 in database:', {
      duplicatePercentage: result.duplicatePercentage,
      confidence: result.confidence,
      totalMatches: result.matches.length,
      sentenceDuplicatePercentage: result.sentenceDuplicatePercentage,
      processingTime: result.processingTime
    });
    
    if (result.matches.length > 0) {
      console.log('\nMatches found:');
      result.matches.forEach((match, index) => {
        console.log(`  ${index + 1}. Method: ${match.method}`);
        console.log(`     Similarity: ${match.similarity}%`);
        console.log(`     Text: ${match.text.substring(0, 100)}...`);
        console.log();
      });
    }
    
    // 8. Kiểm tra confidence logic
    console.log('8. Checking confidence logic:');
    console.log(`duplicatePercentage: ${result.duplicatePercentage}%`);
    console.log(`Expected confidence: ${result.duplicatePercentage > 50 ? 'high' : 'low'}`);
    console.log(`Actual confidence: ${result.confidence}`);
    console.log(`Correct: ${(result.duplicatePercentage > 50 ? 'high' : 'low') === result.confidence ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database disconnected');
  }
}

testCleanDatabase().catch(console.error);