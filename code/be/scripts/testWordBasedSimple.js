const { TextHasher } = require('../utils/TreeAVL');
const vietnameseStopwordService = require('../services/VietnameseStopwordService');

async function testWordBasedSimple() {
  try {
    console.log('=== Testing Word-Based Processing (Simple) ===\n');

    // 1. Khởi tạo stopword service
    console.log('1. Initializing Vietnamese stopword service...');
    await vietnameseStopwordService.initialize();
    console.log(`✓ Vietnamese stopwords loaded: ${vietnameseStopwordService.getStats().totalStopwords} words\n`);

    // 2. Test text samples
    const testTexts = [
      "Trí tuệ nhân tạo là một lĩnh vực khoa học máy tính tập trung vào việc tạo ra các hệ thống thông minh.",
      "Máy học là một phần của trí tuệ nhân tạo cho phép máy tính học hỏi từ dữ liệu.",
      "Blockchain là công nghệ cơ sở dữ liệu phân tán được sử dụng trong tiền điện tử.",
      "Hôm nay tôi đi học ở trường đại học bách khoa hà nội."
    ];

    console.log('2. Testing word extraction and processing...\n');

    testTexts.forEach((text, index) => {
      console.log(`--- Text ${index + 1} ---`);
      console.log(`Original: "${text}"`);
      
      // Tách tất cả từ
      const allWords = text.toLowerCase()
        .replace(/[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/]/g, ' ')
        .split(/\s+/)
        .filter(word => word.trim().length > 0);
      console.log(`All words (${allWords.length}): [${allWords.join(', ')}]`);
      
      // Tách từ có nghĩa (loại bỏ stopwords)
      const meaningfulWords = vietnameseStopwordService.extractMeaningfulWords(text);
      console.log(`Meaningful words (${meaningfulWords.length}): [${meaningfulWords.join(', ')}]`);
      
      // Tạo word hashes
      const wordHashes = TextHasher.createWordHashes(text, true);
      console.log(`Word hashes created: ${wordHashes.length}`);
      
      // Hiển thị một số hash mẫu
      if (wordHashes.length > 0) {
        console.log(`Sample hashes:`);
        wordHashes.slice(0, Math.min(5, wordHashes.length)).forEach(w => {
          console.log(`  - "${w.word}" -> ${w.hash.substring(0, 12)}... (method: ${w.method})`);
        });
      }
      
      // Tính mật độ stopwords
      const stopwordDensity = vietnameseStopwordService.calculateStopwordDensity(text);
      console.log(`Stopword density: ${stopwordDensity.toFixed(1)}%`);
      
      console.log('');
    });

    // 3. Test similarity calculation
    console.log('3. Testing similarity calculation...\n');
    
    const text1 = testTexts[0];
    const text2 = testTexts[1];
    
    console.log(`Text 1: "${text1}"`);
    console.log(`Text 2: "${text2}"`);
    
    const similarity = TextHasher.calculateMeaningfulSimilarity(text1, text2);
    console.log(`Meaningful similarity: ${similarity.toFixed(2)}%`);
    
    const basicSimilarity = TextHasher.calculateBasicSimilarity(text1, text2);
    console.log(`Basic similarity: ${basicSimilarity.toFixed(2)}%`);

    // 4. Test với text giống nhau
    console.log('\n4. Testing with identical text...\n');
    const identicalSimilarity = TextHasher.calculateMeaningfulSimilarity(text1, text1);
    console.log(`Identical text similarity: ${identicalSimilarity.toFixed(2)}%`);

    // 5. Test với text hoàn toàn khác
    console.log('\n5. Testing with completely different text...\n');
    const text3 = testTexts[2];
    const differentSimilarity = TextHasher.calculateMeaningfulSimilarity(text1, text3);
    console.log(`Different text similarity: ${differentSimilarity.toFixed(2)}%`);

    // 6. So sánh chunk-based vs word-based
    console.log('\n6. Comparing old chunk-based vs new word-based...\n');
    
    console.log('Old chunk-based approach:');
    const oldChunks = TextHasher.createChunkHashes(text1, 30, true);
    console.log(`- Chunks created: ${oldChunks.length}`);
    if (oldChunks.length > 0) {
      console.log(`- Sample chunk: "${oldChunks[0].text || oldChunks[0].word}"`);
    }
    
    console.log('\nNew word-based approach:');
    const newWords = TextHasher.createWordHashes(text1, true);
    console.log(`- Words created: ${newWords.length}`);
    if (newWords.length > 0) {
      console.log(`- Sample words: [${newWords.slice(0, 5).map(w => w.word).join(', ')}]`);
    }

    console.log('\n=== Test completed successfully! ===');
    console.log('\nKey improvements with word-based approach:');
    console.log('✓ More granular comparison (word-level vs chunk-level)');
    console.log('✓ Better stopword filtering');
    console.log('✓ More accurate similarity calculation');
    console.log('✓ Reduced false positives from common stopwords');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Chạy test nếu file được gọi trực tiếp
if (require.main === module) {
  testWordBasedSimple();
}

module.exports = testWordBasedSimple;