const { TextHasher } = require('./be/utils/TreeAVL');
const vietnameseStopwordService = require('./be/services/VietnameseStopwordService');

async function testWithoutDB() {
  console.log('=== TESTING PLAGIARISM LOGIC WITHOUT DATABASE ===\n');
  
  // Khởi tạo stopword service
  await vietnameseStopwordService.initialize();
  
  const doc1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
  const doc2 = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";
  
  console.log('DOC1:', doc1);
  console.log('DOC2:', doc2);
  console.log();
  
  // Test với các sensitivity khác nhau
  const sensitivities = ['low', 'medium', 'high'];
  const thresholds = {
    'low': 40,    // 40% phrases trùng
    'medium': 50, // 50% phrases trùng  
    'high': 70    // 70% phrases trùng
  };
  
  for (const sensitivity of sensitivities) {
    console.log(`=== TESTING WITH SENSITIVITY: ${sensitivity.toUpperCase()} ===`);
    const threshold = thresholds[sensitivity];
    console.log(`Threshold: ${threshold}%`);
    
    // Tính plagiarism ratio
    const plagiarismResult = TextHasher.calculatePlagiarismRatio(doc1, doc2, true);
    console.log('Plagiarism Result:', plagiarismResult);
    
    // Kiểm tra xem có vượt qua threshold không
    const passesThreshold = plagiarismResult.ratio >= threshold;
    console.log(`Passes threshold (${threshold}%): ${passesThreshold}`);
    console.log(`Actual ratio: ${plagiarismResult.ratio.toFixed(2)}%`);
    
    if (passesThreshold) {
      console.log('✅ WOULD BE DETECTED as plagiarism');
    } else {
      console.log('❌ WOULD NOT BE DETECTED as plagiarism');
    }
    console.log();
  }
  
  // Test ngược lại (doc2 so với doc1)
  console.log('=== TESTING REVERSE (DOC2 vs DOC1) ===');
  const reversePlagiarismResult = TextHasher.calculatePlagiarismRatio(doc2, doc1, true);
  console.log('Reverse Plagiarism Result:', reversePlagiarismResult);
  
  for (const sensitivity of sensitivities) {
    const threshold = thresholds[sensitivity];
    const passesThreshold = reversePlagiarismResult.ratio >= threshold;
    console.log(`${sensitivity}: ${reversePlagiarismResult.ratio.toFixed(2)}% ${passesThreshold ? '✅' : '❌'} (threshold: ${threshold}%)`);
  }
  console.log();
  
  // Kiểm tra word-based similarity
  console.log('=== WORD-BASED SIMILARITY ===');
  const wordSimilarity = TextHasher.calculateMeaningfulSimilarity(doc1, doc2);
  console.log(`Word-based similarity: ${wordSimilarity.toFixed(2)}%`);
  
  // Kiểm tra sentence-based similarity
  console.log('=== SENTENCE-BASED SIMILARITY ===');
  const sentenceSimilarity = TextHasher.calculateSentenceSimilarity(doc1, doc2, true);
  console.log(`Sentence-based similarity: ${sentenceSimilarity.toFixed(2)}%`);
  
  console.log('\n=== SUMMARY ===');
  console.log('Theo kết quả trên:');
  console.log(`- Phrase-based ratio: ${plagiarismResult.ratio.toFixed(2)}%`);
  console.log(`- Word-based similarity: ${wordSimilarity.toFixed(2)}%`);
  console.log(`- Sentence-based similarity: ${sentenceSimilarity.toFixed(2)}%`);
  console.log();
  console.log('Với sensitivity "medium" (threshold 50%):');
  if (plagiarismResult.ratio >= 50) {
    console.log('✅ Hệ thống SẼ phát hiện được sự trùng lặp');
  } else {
    console.log('❌ Hệ thống SẼ KHÔNG phát hiện được sự trùng lặp');
  }
  
  console.log('\nVấn đề có thể là:');
  console.log('1. Doc1 chưa được thêm vào database');
  console.log('2. Sensitivity setting khác với "medium"');
  console.log('3. Có lỗi trong quá trình xử lý database');
}

testWithoutDB().catch(console.error);