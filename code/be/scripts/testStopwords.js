const vietnameseStopwordService = require('../services/VietnameseStopwordService');
const { TextHasher } = require('../utils/TreeAVL');

async function testStopwordService() {
  try {
    console.log('=== TESTING VIETNAMESE STOPWORD SERVICE ===\n');
    
    // Khởi tạo service
    console.log('1. Initializing Vietnamese Stopword Service...');
    await vietnameseStopwordService.initialize();
    console.log('✓ Service initialized successfully\n');
    
    // Lấy thống kê
    console.log('2. Getting service statistics...');
    const stats = vietnameseStopwordService.getStats();
    console.log(`✓ Total stopwords loaded: ${stats.totalStopwords}`);
    console.log(`✓ Sample stopwords: ${stats.sampleStopwords.join(', ')}\n`);
    
    // Test text mẫu
    const testText = `
      Tôi là một sinh viên đại học. Tôi đang học về công nghệ thông tin. 
      Hôm nay tôi sẽ làm bài tập về thuật toán và cấu trúc dữ liệu. 
      Đây là một môn học rất quan trọng trong ngành công nghệ thông tin.
      Tôi cần phải học chăm chỉ để có thể hiểu được các khái niệm phức tạp.
    `;
    
    console.log('3. Testing with sample text:');
    console.log(`Original text: ${testText.trim()}\n`);
    
    // Test kiểm tra stopword
    console.log('4. Testing stopword checking...');
    const testWords = ['tôi', 'là', 'sinh viên', 'công nghệ', 'thuật toán'];
    testWords.forEach(word => {
      const isStopword = vietnameseStopwordService.isStopword(word);
      console.log(`✓ "${word}" is stopword: ${isStopword}`);
    });
    console.log();
    
    // Test loại bỏ stopwords
    console.log('5. Testing stopword removal...');
    const filteredText = vietnameseStopwordService.removeStopwords(testText);
    console.log(`Filtered text: ${filteredText}\n`);
    
    // Test trích xuất từ có nghĩa
    console.log('6. Testing meaningful words extraction...');
    const meaningfulWords = vietnameseStopwordService.extractMeaningfulWords(testText);
    console.log(`Meaningful words: ${meaningfulWords.join(', ')}\n`);
    
    // Test tính mật độ stopwords
    console.log('7. Testing stopword density calculation...');
    const density = vietnameseStopwordService.calculateStopwordDensity(testText);
    console.log(`Stopword density: ${density.toFixed(2)}%\n`);
    
    // Test tách theo stopwords
    console.log('8. Testing text splitting by stopwords...');
    const chunks = vietnameseStopwordService.splitByStopwords(testText, {
      minChunkLength: 3,
      maxChunkLength: 10,
      preserveStopwords: false
    });
    
    console.log(`Total chunks: ${chunks.length}`);
    chunks.forEach((chunk, index) => {
      console.log(`Chunk ${index + 1}:`);
      console.log(`  Text: ${chunk.text}`);
      console.log(`  Meaningful words: ${chunk.meaningfulWordCount}`);
      console.log(`  Total words: ${chunk.totalWordCount}`);
      console.log(`  Position: ${chunk.startIndex} - ${chunk.endIndex}`);
      console.log();
    });
    
    // Test TextHasher với stopwords
    console.log('9. Testing TextHasher with stopwords...');
    const hashChunks = TextHasher.createChunkHashes(testText, 10, true);
    console.log(`Hash chunks created: ${hashChunks.length}`);
    hashChunks.forEach((chunk, index) => {
      console.log(`Hash Chunk ${index + 1}:`);
      console.log(`  Method: ${chunk.chunkMethod}`);
      console.log(`  Text: ${chunk.text.substring(0, 100)}...`);
      console.log(`  Hash: ${chunk.hash.substring(0, 16)}...`);
      console.log(`  Meaningful words: ${chunk.meaningfulWordCount || 'N/A'}`);
      console.log();
    });
    
    // Test similarity calculation
    console.log('10. Testing meaningful similarity calculation...');
    const text1 = "Tôi là sinh viên đại học công nghệ thông tin";
    const text2 = "Sinh viên đại học học về công nghệ thông tin";
    
    const basicSimilarity = TextHasher.calculateBasicSimilarity(text1, text2);
    const meaningfulSimilarity = TextHasher.calculateMeaningfulSimilarity(text1, text2);
    
    console.log(`Text 1: ${text1}`);
    console.log(`Text 2: ${text2}`);
    console.log(`Basic similarity: ${basicSimilarity.toFixed(2)}%`);
    console.log(`Meaningful similarity: ${meaningfulSimilarity.toFixed(2)}%\n`);
    
    console.log('=== ALL TESTS COMPLETED SUCCESSFULLY ===');
    
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Chạy test nếu file được gọi trực tiếp
if (require.main === module) {
  testStopwordService();
}

module.exports = testStopwordService;