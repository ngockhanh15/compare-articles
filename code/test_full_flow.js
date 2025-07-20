const plagiarismDetectionService = require('./be/services/PlagiarismDetectionService');

async function testFullFlow() {
  console.log('=== TESTING FULL PLAGIARISM DETECTION FLOW ===\n');
  
  const doc1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
  const doc2 = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";
  
  try {
    // 1. Khởi tạo service
    console.log('1. Initializing plagiarism detection service...');
    await plagiarismDetectionService.initialize();
    console.log('Service initialized successfully\n');
    
    // 2. Thêm doc1 vào database (giả lập việc import)
    console.log('2. Adding doc1 to database...');
    const doc1Id = plagiarismDetectionService.addDocumentToTree(doc1, {
      id: 'test-doc-1',
      name: 'Test Document 1',
      addedAt: Date.now()
    });
    console.log('Doc1 added with ID:', doc1Id);
    console.log('Current stats:', plagiarismDetectionService.getStats());
    console.log();
    
    // 3. Kiểm tra doc2 với các sensitivity khác nhau
    const sensitivities = ['low', 'medium', 'high'];
    
    for (const sensitivity of sensitivities) {
      console.log(`3. Testing doc2 with sensitivity: ${sensitivity}`);
      const result = await plagiarismDetectionService.checkPlagiarism(doc2, { sensitivity });
      
      console.log(`Results for ${sensitivity} sensitivity:`);
      console.log(`  - Duplicate Percentage: ${result.duplicatePercentage}%`);
      console.log(`  - Confidence: ${result.confidence}`);
      console.log(`  - Total Matches: ${result.matches.length}`);
      console.log(`  - Sentence Duplicate Percentage: ${result.sentenceDuplicatePercentage}%`);
      console.log(`  - Processing Time: ${result.processingTime}ms`);
      
      if (result.matches.length > 0) {
        console.log(`  - First Match Details:`);
        console.log(`    * Text: ${result.matches[0].text}`);
        console.log(`    * Similarity: ${result.matches[0].similarity}%`);
        console.log(`    * Method: ${result.matches[0].method}`);
      }
      console.log();
    }
    
    // 4. Test với doc1 chính nó (should be 100%)
    console.log('4. Testing doc1 against itself (should be high similarity)...');
    const selfResult = await plagiarismDetectionService.checkPlagiarism(doc1, { sensitivity: 'medium' });
    console.log(`Self-check results:`);
    console.log(`  - Duplicate Percentage: ${selfResult.duplicatePercentage}%`);
    console.log(`  - Confidence: ${selfResult.confidence}`);
    console.log(`  - Total Matches: ${selfResult.matches.length}`);
    console.log();
    
    // 5. Test với text hoàn toàn khác
    console.log('5. Testing with completely different text...');
    const differentText = "Hôm nay trời đẹp, tôi đi chơi công viên với bạn bè.";
    const differentResult = await plagiarismDetectionService.checkPlagiarism(differentText, { sensitivity: 'medium' });
    console.log(`Different text results:`);
    console.log(`  - Duplicate Percentage: ${differentResult.duplicatePercentage}%`);
    console.log(`  - Confidence: ${differentResult.confidence}`);
    console.log(`  - Total Matches: ${differentResult.matches.length}`);
    console.log();
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testFullFlow().catch(console.error);