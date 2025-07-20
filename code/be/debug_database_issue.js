const mongoose = require('mongoose');
const plagiarismDetectionService = require('./services/PlagiarismDetectionService');
require('dotenv').config();

async function debugDatabaseIssue() {
  console.log('=== DEBUGGING DATABASE ISSUE ===\n');
  
  try {
    // 1. Kết nối database
    console.log('1. Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected successfully');
    console.log();
    
    // 2. Khởi tạo plagiarism detection service
    console.log('2. Initializing plagiarism detection service...');
    await plagiarismDetectionService.initialize();
    console.log('✅ Service initialized successfully');
    console.log();
    
    // 3. Kiểm tra stats hiện tại
    console.log('3. Current database stats:');
    const stats = plagiarismDetectionService.getStats();
    console.log('Stats:', stats);
    console.log();
    
    // 4. Kiểm tra xem có documents nào trong tree không
    console.log('4. Checking documents in tree...');
    const allNodes = plagiarismDetectionService.documentTree?.getAllNodes() || [];
    console.log(`Total documents in tree: ${allNodes.length}`);
    
    if (allNodes.length > 0) {
      console.log('First few documents:');
      allNodes.slice(0, 3).forEach((node, index) => {
        console.log(`  ${index + 1}. ID: ${node.data.id}`);
        console.log(`     Name: ${node.data.name}`);
        console.log(`     Text preview: ${node.data.text.substring(0, 100)}...`);
        console.log();
      });
    } else {
      console.log('❌ No documents found in tree!');
    }
    console.log();
    
    // 5. Test documents
    const doc1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
    const doc2 = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";
    
    console.log('5. Test documents:');
    console.log('DOC1:', doc1);
    console.log('DOC2:', doc2);
    console.log();
    
    // 6. Thêm doc1 vào database nếu chưa có
    console.log('6. Adding doc1 to database...');
    const doc1Id = plagiarismDetectionService.addDocumentToTree(doc1, {
      id: 'test-doc-1',
      name: 'Test Document 1 - Doc1',
      addedAt: Date.now()
    });
    console.log('✅ Doc1 added with ID:', doc1Id);
    
    // Kiểm tra stats sau khi thêm
    const newStats = plagiarismDetectionService.getStats();
    console.log('New stats after adding doc1:', newStats);
    console.log();
    
    // 7. Test doc2 với database có doc1
    console.log('7. Testing doc2 against database (should find doc1)...');
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
        console.log(`     Text: ${match.text.substring(0, 100)}...`);
        console.log();
      });
    } else {
      console.log('❌ No matches found!');
    }
    
    // 8. Test ngược lại (doc1 với database có doc1)
    console.log('8. Testing doc1 against itself (should be 100%)...');
    const selfResult = await plagiarismDetectionService.checkPlagiarism(doc1, { sensitivity: 'medium' });
    console.log('Self-test result:', {
      duplicatePercentage: selfResult.duplicatePercentage,
      confidence: selfResult.confidence,
      totalMatches: selfResult.matches.length
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database disconnected');
  }
}

debugDatabaseIssue().catch(console.error);