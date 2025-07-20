const { TextHasher } = require('./be/utils/TreeAVL');
const vietnameseStopwordService = require('./be/services/VietnameseStopwordService');

async function testNewThreshold() {
  console.log('=== TESTING NEW SIMPLIFIED THRESHOLD LOGIC ===\n');
  
  // Khởi tạo stopword service
  await vietnameseStopwordService.initialize();
  
  const doc1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
  const doc2 = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";
  
  console.log('DOC1:', doc1);
  console.log('DOC2:', doc2);
  console.log();
  
  // Test plagiarism ratio
  console.log('=== PLAGIARISM RATIO CALCULATION ===');
  const plagiarismResult = TextHasher.calculatePlagiarismRatio(doc1, doc2, true);
  console.log('Plagiarism Result:', plagiarismResult);
  console.log(`Ratio: ${plagiarismResult.ratio.toFixed(2)}%`);
  console.log();
  
  // Test với threshold mới (> 50%)
  console.log('=== NEW THRESHOLD LOGIC (> 50%) ===');
  const threshold = 50;
  const isDetected = plagiarismResult.ratio > threshold;
  
  console.log(`Threshold: > ${threshold}%`);
  console.log(`Actual ratio: ${plagiarismResult.ratio.toFixed(2)}%`);
  console.log(`Is detected: ${isDetected}`);
  
  if (isDetected) {
    console.log('✅ DETECTED as plagiarism (confidence: high)');
  } else {
    console.log('❌ NOT DETECTED as plagiarism (confidence: low)');
  }
  console.log();
  
  // Test với các trường hợp khác
  console.log('=== TESTING EDGE CASES ===');
  
  const testCases = [
    { ratio: 49, expected: false, description: "49% - should NOT be detected" },
    { ratio: 50, expected: false, description: "50% - should NOT be detected (exactly at threshold)" },
    { ratio: 50.1, expected: true, description: "50.1% - should be detected" },
    { ratio: 51, expected: true, description: "51% - should be detected" },
    { ratio: 75, expected: true, description: "75% - should be detected" },
    { ratio: 100, expected: true, description: "100% - should be detected" }
  ];
  
  testCases.forEach(testCase => {
    const isDetected = testCase.ratio > 50;
    const status = isDetected ? 'DETECTED (high)' : 'NOT DETECTED (low)';
    const result = isDetected === testCase.expected ? '✅' : '❌';
    
    console.log(`${result} ${testCase.ratio}%: ${status} - ${testCase.description}`);
  });
  
  console.log();
  console.log('=== SUMMARY ===');
  console.log('Với doc1 và doc2 của bạn:');
  console.log(`- Tỷ lệ trùng lặp: ${plagiarismResult.ratio.toFixed(2)}%`);
  console.log(`- Threshold: > 50%`);
  console.log(`- Kết luận: ${plagiarismResult.ratio > 50 ? 'TRÙNG LẶP (high confidence)' : 'KHÔNG TRÙNG LẶP (low confidence)'}`);
  console.log();
  console.log('Logic mới:');
  console.log('- <= 50%: Không trùng lặp (confidence: low)');
  console.log('- > 50%: Trùng lặp (confidence: high)');
  console.log('- Giá trị % luôn được trả về chính xác');
}

testNewThreshold().catch(console.error);