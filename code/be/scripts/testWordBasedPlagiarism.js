const { TextHasher } = require('../utils/TreeAVL');
const vietnameseStopwordService = require('../services/VietnameseStopwordService');
const plagiarismDetectionService = require('../services/PlagiarismDetectionService');
const plagiarismCacheService = require('../services/PlagiarismCacheService');

async function testWordBasedPlagiarism() {
  try {
    console.log('=== Testing Word-Based Plagiarism Detection ===\n');

    // 1. Khởi tạo services
    console.log('1. Initializing services...');
    await vietnameseStopwordService.initialize();
    await plagiarismDetectionService.initialize();
    
    console.log(`✓ Vietnamese stopwords loaded: ${vietnameseStopwordService.getStats().totalStopwords} words`);
    console.log(`✓ Plagiarism detection service initialized\n`);

    // 2. Test text samples
    const testTexts = [
      "Trí tuệ nhân tạo là một lĩnh vực khoa học máy tính tập trung vào việc tạo ra các hệ thống thông minh.",
      "Máy học là một phần của trí tuệ nhân tạo cho phép máy tính học hỏi từ dữ liệu.",
      "Blockchain là công nghệ cơ sở dữ liệu phân tán được sử dụng trong tiền điện tử."
    ];

    // 3. Test word extraction với stopwords
    console.log('2. Testing word extraction with stopwords...');
    testTexts.forEach((text, index) => {
      console.log(`\nText ${index + 1}: "${text}"`);
      
      // Tách từ có nghĩa
      const meaningfulWords = vietnameseStopwordService.extractMeaningfulWords(text);
      console.log(`Meaningful words: [${meaningfulWords.join(', ')}]`);
      
      // Tạo word hashes
      const wordHashes = TextHasher.createWordHashes(text, true);
      console.log(`Word hashes count: ${wordHashes.length}`);
      console.log(`Sample hashes: ${wordHashes.slice(0, 3).map(w => `${w.word}:${w.hash.substring(0, 8)}`).join(', ')}`);
    });

    // 4. Test plagiarism detection
    console.log('\n3. Testing plagiarism detection...');
    
    // Thêm document đầu tiên vào hệ thống
    const firstText = testTexts[0];
    console.log(`\nAdding first document: "${firstText}"`);
    plagiarismDetectionService.addDocumentToTree(firstText, { id: 'test-doc-1' });
    
    // Kiểm tra document thứ hai (có một số từ giống)
    const secondText = testTexts[1];
    console.log(`\nChecking second document: "${secondText}"`);
    const result1 = await plagiarismDetectionService.checkPlagiarism(secondText);
    
    console.log(`Result 1:`);
    console.log(`- Duplicate percentage: ${result1.duplicatePercentage}%`);
    console.log(`- Matches found: ${result1.matches.length}`);
    console.log(`- Total words checked: ${result1.totalWordsChecked}`);
    console.log(`- Processing time: ${result1.processingTime}ms`);
    
    if (result1.matches.length > 0) {
      console.log(`- Sample match: ${result1.matches[0].similarity}% similarity`);
      if (result1.matches[0].wordMatches) {
        console.log(`- Matched words: ${result1.matches[0].wordMatches.slice(0, 5).join(', ')}`);
      }
    }

    // 5. Test cache service
    console.log('\n4. Testing cache service...');
    
    // Cache kết quả
    const cacheResult = plagiarismCacheService.cacheResult(secondText, result1);
    console.log(`Cache result: ${cacheResult.success ? 'Success' : 'Failed'}`);
    console.log(`Words cached: ${cacheResult.wordsCount}`);
    
    // Tìm similar words
    const similarWords = plagiarismCacheService.findSimilarWords(firstText, 0.3);
    console.log(`Similar words found: ${similarWords.length}`);
    
    if (similarWords.length > 0) {
      console.log(`Sample similar: ${similarWords[0].similarity}% similarity`);
      console.log(`Matched words: ${similarWords[0].matchedWords.map(w => w.original).join(', ')}`);
    }

    // 6. Test với text hoàn toàn khác
    console.log('\n5. Testing with completely different text...');
    const differentText = testTexts[2];
    console.log(`Checking different document: "${differentText}"`);
    const result2 = await plagiarismDetectionService.checkPlagiarism(differentText);
    
    console.log(`Result 2:`);
    console.log(`- Duplicate percentage: ${result2.duplicatePercentage}%`);
    console.log(`- Matches found: ${result2.matches.length}`);
    console.log(`- Processing time: ${result2.processingTime}ms`);

    // 7. Statistics
    console.log('\n6. Final statistics...');
    const detectionStats = plagiarismDetectionService.getStats();
    const cacheStats = plagiarismCacheService.getCacheStats();
    
    console.log(`Detection service:`);
    console.log(`- Total documents: ${detectionStats.totalDocuments}`);
    console.log(`- Total words: ${detectionStats.totalWords}`);
    
    console.log(`Cache service:`);
    console.log(`- Text cache size: ${cacheStats.textCacheSize}`);
    console.log(`- Word cache size: ${cacheStats.wordCacheSize}`);
    console.log(`- Hit rate: ${cacheStats.hitRate}`);

    console.log('\n=== Test completed successfully! ===');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Chạy test nếu file được gọi trực tiếp
if (require.main === module) {
  testWordBasedPlagiarism();
}

module.exports = testWordBasedPlagiarism;