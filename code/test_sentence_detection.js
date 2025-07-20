const plagiarismDetectionService = require('./be/services/PlagiarismDetectionService');
const { TextHasher } = require('./be/utils/TreeAVL');

async function testSentenceDetection() {
  console.log('=== Test Sentence-based Plagiarism Detection ===\n');

  try {
    // Khởi tạo service
    await plagiarismDetectionService.initialize();
    
    // Thêm một số document mẫu
    const sampleDocuments = [
      "Trí tuệ nhân tạo là một lĩnh vực khoa học máy tính. Nó tập trung vào việc tạo ra các hệ thống thông minh. Các hệ thống này có thể thực hiện các nhiệm vụ thường đòi hỏi trí tuệ con người.",
      "Machine learning là một phần của trí tuệ nhân tạo. Nó cho phép máy tính học hỏi từ dữ liệu. Điều này giúp cải thiện hiệu suất mà không cần lập trình cụ thể.",
      "Deep learning sử dụng mạng neural nhân tạo. Các mạng này có nhiều lớp ẩn. Chúng có thể xử lý dữ liệu phức tạp như hình ảnh và âm thanh."
    ];

    console.log('Thêm documents mẫu vào hệ thống...');
    for (let i = 0; i < sampleDocuments.length; i++) {
      const docId = plagiarismDetectionService.addDocumentToTree(sampleDocuments[i], {
        id: `sample_${i + 1}`,
        title: `Sample Document ${i + 1}`
      });
      console.log(`- Added document ${i + 1}: ${docId}`);
    }

    console.log('\n=== Test Cases ===\n');

    // Test Case 1: Exact sentence match
    console.log('Test 1: Exact sentence match');
    const testText1 = "Trí tuệ nhân tạo là một lĩnh vực khoa học máy tính. Đây là một công nghệ mới.";
    const result1 = await plagiarismDetectionService.checkPlagiarism(testText1);
    
    console.log(`Input: "${testText1}"`);
    console.log(`Word-based duplicate: ${result1.duplicatePercentage}%`);
    console.log(`Sentence-based duplicate: ${result1.sentenceDuplicatePercentage}%`);
    console.log(`Total input sentences: ${result1.totalInputSentences}`);
    console.log(`Sentence matches found: ${result1.sentenceMatches.length}`);
    if (result1.sentenceMatches.length > 0) {
      console.log('Matched sentences:');
      result1.sentenceMatches.forEach((match, idx) => {
        console.log(`  ${idx + 1}. "${match.sentence}" (${match.similarity}% similarity)`);
      });
    }
    console.log('---\n');

    // Test Case 2: Similar sentence
    console.log('Test 2: Similar sentence');
    const testText2 = "Trí tuệ nhân tạo là lĩnh vực của khoa học máy tính. Nó giúp tạo ra hệ thống thông minh.";
    const result2 = await plagiarismDetectionService.checkPlagiarism(testText2);
    
    console.log(`Input: "${testText2}"`);
    console.log(`Word-based duplicate: ${result2.duplicatePercentage}%`);
    console.log(`Sentence-based duplicate: ${result2.sentenceDuplicatePercentage}%`);
    console.log(`Total input sentences: ${result2.totalInputSentences}`);
    console.log(`Sentence matches found: ${result2.sentenceMatches.length}`);
    if (result2.sentenceMatches.length > 0) {
      console.log('Matched sentences:');
      result2.sentenceMatches.forEach((match, idx) => {
        console.log(`  ${idx + 1}. "${match.sentence}" (${match.similarity}% similarity)`);
        if (match.matchedSentence) {
          console.log(`      Matched with: "${match.matchedSentence}"`);
        }
      });
    }
    console.log('---\n');

    // Test Case 3: No sentence match
    console.log('Test 3: No sentence match');
    const testText3 = "Blockchain là công nghệ chuỗi khối. Nó được sử dụng trong tiền điện tử. Bitcoin là ứng dụng đầu tiên của blockchain.";
    const result3 = await plagiarismDetectionService.checkPlagiarism(testText3);
    
    console.log(`Input: "${testText3}"`);
    console.log(`Word-based duplicate: ${result3.duplicatePercentage}%`);
    console.log(`Sentence-based duplicate: ${result3.sentenceDuplicatePercentage}%`);
    console.log(`Total input sentences: ${result3.totalInputSentences}`);
    console.log(`Sentence matches found: ${result3.sentenceMatches.length}`);
    console.log('---\n');

    // Test Case 4: Mixed content
    console.log('Test 4: Mixed content (some sentences match, some don\'t)');
    const testText4 = "Trí tuệ nhân tạo là một lĩnh vực khoa học máy tính. Blockchain là công nghệ mới. Machine learning là một phần của trí tuệ nhân tạo.";
    const result4 = await plagiarismDetectionService.checkPlagiarism(testText4);
    
    console.log(`Input: "${testText4}"`);
    console.log(`Word-based duplicate: ${result4.duplicatePercentage}%`);
    console.log(`Sentence-based duplicate: ${result4.sentenceDuplicatePercentage}%`);
    console.log(`Total input sentences: ${result4.totalInputSentences}`);
    console.log(`Sentence matches found: ${result4.sentenceMatches.length}`);
    if (result4.sentenceMatches.length > 0) {
      console.log('Matched sentences:');
      result4.sentenceMatches.forEach((match, idx) => {
        console.log(`  ${idx + 1}. "${match.sentence}" (${match.similarity}% similarity)`);
      });
    }
    console.log('---\n');

    // Hiển thị thống kê cuối
    const stats = plagiarismDetectionService.getStats();
    console.log('=== Final Statistics ===');
    console.log(`Total documents: ${stats.totalDocuments}`);
    console.log(`Total words indexed: ${stats.totalWords}`);
    console.log(`Total sentences indexed: ${stats.totalSentences}`);
    console.log(`Vietnamese stopwords loaded: ${stats.stopwordService.totalStopwords}`);

  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Chạy test
testSentenceDetection();