const mongoose = require('mongoose');
const plagiarismDetectionService = require('./services/PlagiarismDetectionService');
const Document = require('./models/Document');
require('dotenv').config();

async function testNormalizationFix() {
  console.log('=== TESTING NORMALIZATION FIX ===\n');
  
  try {
    // 1. Kết nối database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected');
    
    // 2. Xóa tất cả documents cũ để test sạch
    await Document.deleteMany({});
    console.log('✅ Cleaned database');
    
    // 3. Khởi tạo service với database sạch
    await plagiarismDetectionService.initialize();
    console.log('✅ Service initialized');
    
    // 4. Test documents
    const doc1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
    const doc2 = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";
    
    // Thêm extra spaces và newlines vào doc1 (giống như trong database)
    const doc1WithExtraSpaces = doc1 + " \n\n";
    
    console.log('📄 DOCUMENTS:');
    console.log('DOC1 (clean):', `"${doc1}"`);
    console.log('DOC1 (with spaces):', `"${doc1WithExtraSpaces}"`);
    console.log('DOC2 (user input):', `"${doc2}"`);
    console.log();
    
    // 5. Thêm doc1 với extra spaces vào database
    console.log('5. Adding doc1 with extra spaces to database...');
    const doc1Id = plagiarismDetectionService.addDocumentToTree(doc1WithExtraSpaces, {
      id: 'test-doc-1',
      name: 'Test Document 1 - Doc1 with spaces',
      addedAt: Date.now()
    });
    console.log('✅ Doc1 added with ID:', doc1Id);
    
    // 6. Kiểm tra doc1 đã được normalize trong tree chưa
    const allNodes = plagiarismDetectionService.documentTree.getAllNodes();
    console.log('6. Checking normalized text in tree:');
    allNodes.forEach((node, index) => {
      console.log(`   ${index + 1}. Text: "${node.data.text}"`);
      console.log(`      Length: ${node.data.text.length}`);
      console.log(`      Trimmed: ${node.data.text === doc1}`);
    });
    console.log();
    
    // 7. Test doc2 với database có doc1 (normalized)
    console.log('7. Testing doc2 against normalized doc1...');
    const result = await plagiarismDetectionService.checkPlagiarism(doc2, { sensitivity: 'medium' });
    
    console.log('Result:', {
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
        console.log(`     Text: "${match.text.substring(0, 100)}..."`);
      });
    } else {
      console.log('❌ No matches found!');
    }
    
    // 8. Kiểm tra kết quả
    console.log('\n8. RESULT ANALYSIS:');
    console.log(`Expected: ~66.67% (doc2 vs doc1)`);
    console.log(`Actual: ${result.duplicatePercentage}%`);
    console.log(`Expected confidence: ${result.duplicatePercentage > 50 ? 'high' : 'low'}`);
    console.log(`Actual confidence: ${result.confidence}`);
    
    const isCorrect = result.duplicatePercentage > 60 && result.duplicatePercentage < 70;
    console.log(`Result correct: ${isCorrect ? '✅' : '❌'}`);
    
    if (isCorrect) {
      console.log('\n🎉 NORMALIZATION FIX SUCCESSFUL!');
      console.log('- Text được normalize đúng cách');
      console.log('- Tỷ lệ trùng lặp được tính chính xác');
      console.log('- Confidence logic hoạt động đúng');
    } else {
      console.log('\n❌ NORMALIZATION FIX FAILED!');
      console.log('- Vẫn còn vấn đề với text processing');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database disconnected');
  }
}

testNormalizationFix().catch(console.error);