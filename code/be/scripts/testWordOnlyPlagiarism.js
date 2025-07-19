const plagiarismDetectionService = require('../services/PlagiarismDetectionService');

async function testWordOnlyPlagiarism() {
  try {
    console.log('Testing word-only plagiarism detection...');
    
    // Khởi tạo service
    await plagiarismDetectionService.initialize();
    
    // Thêm một document mẫu
    const sampleText = "Trí tuệ nhân tạo là một lĩnh vực khoa học máy tính. Nó tập trung vào việc tạo ra các hệ thống thông minh.";
    const documentId = plagiarismDetectionService.addDocumentToTree(sampleText, {
      id: 'test-doc-1',
      source: 'test'
    });
    
    console.log('Added sample document with ID:', documentId);
    
    // Test 1: Kiểm tra văn bản có một số từ trùng
    const testText1 = "Trí tuệ nhân tạo đang phát triển mạnh mẽ. Các hệ thống thông minh ngày càng được ứng dụng rộng rãi.";
    console.log('\n--- Test 1: Partial word matches ---');
    console.log('Input text:', testText1);
    
    const result1 = await plagiarismDetectionService.checkPlagiarism(testText1);
    console.log('Result:', {
      duplicatePercentage: result1.duplicatePercentage,
      confidence: result1.confidence,
      matchesCount: result1.matches.length,
      processingTime: result1.processingTime
    });
    
    if (result1.matches.length > 0) {
      console.log('First match:', {
        similarity: result1.matches[0].similarity,
        matchedWords: result1.matches[0].matchedWords,
        method: result1.matches[0].method
      });
    }
    
    // Test 2: Kiểm tra văn bản hoàn toàn khác
    const testText2 = "Hôm nay trời đẹp. Tôi đi chơi công viên với bạn bè.";
    console.log('\n--- Test 2: No matches expected ---');
    console.log('Input text:', testText2);
    
    const result2 = await plagiarismDetectionService.checkPlagiarism(testText2);
    console.log('Result:', {
      duplicatePercentage: result2.duplicatePercentage,
      confidence: result2.confidence,
      matchesCount: result2.matches.length,
      processingTime: result2.processingTime
    });
    
    // Test 3: Kiểm tra văn bản có nhiều từ trùng
    const testText3 = "Trí tuệ nhân tạo và khoa học máy tính là những lĩnh vực quan trọng. Hệ thống thông minh được phát triển liên tục.";
    console.log('\n--- Test 3: High word matches ---');
    console.log('Input text:', testText3);
    
    const result3 = await plagiarismDetectionService.checkPlagiarism(testText3);
    console.log('Result:', {
      duplicatePercentage: result3.duplicatePercentage,
      confidence: result3.confidence,
      matchesCount: result3.matches.length,
      processingTime: result3.processingTime
    });
    
    if (result3.matches.length > 0) {
      console.log('First match:', {
        similarity: result3.matches[0].similarity,
        matchedWords: result3.matches[0].matchedWords,
        method: result3.matches[0].method
      });
    }
    
    // Hiển thị thống kê
    console.log('\n--- Service Stats ---');
    console.log(plagiarismDetectionService.getStats());
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Chạy test
testWordOnlyPlagiarism();