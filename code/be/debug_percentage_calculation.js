const { TextHasher } = require('./utils/TreeAVL');
const vietnameseStopwordService = require('./services/VietnameseStopwordService');

async function debugPercentageCalculation() {
  console.log('=== DEBUGGING PERCENTAGE CALCULATION ===\n');
  
  // Khởi tạo stopword service
  await vietnameseStopwordService.initialize();
  
  const doc1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
  const doc2 = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";
  
  console.log('DOC1:', doc1);
  console.log('DOC2:', doc2);
  console.log();
  
  // Test direct comparison (không qua database)
  console.log('=== DIRECT COMPARISON (TextHasher) ===');
  const directResult = TextHasher.calculatePlagiarismRatio(doc1, doc2, true);
  console.log('Direct result:', directResult);
  console.log(`Direct ratio: ${directResult.ratio}%`);
  console.log();
  
  // Test ngược lại
  console.log('=== REVERSE COMPARISON (TextHasher) ===');
  const reverseResult = TextHasher.calculatePlagiarismRatio(doc2, doc1, true);
  console.log('Reverse result:', reverseResult);
  console.log(`Reverse ratio: ${reverseResult.ratio}%`);
  console.log();
  
  // Phân tích chi tiết
  console.log('=== DETAILED ANALYSIS ===');
  
  // Meaningful words
  const meaningfulWords1 = vietnameseStopwordService.extractMeaningfulWords(doc1);
  const meaningfulWords2 = vietnameseStopwordService.extractMeaningfulWords(doc2);
  
  console.log('Meaningful words 1:', meaningfulWords1);
  console.log('Meaningful words 2:', meaningfulWords2);
  console.log();
  
  // Phrases
  const phrases1 = TextHasher.createMeaningfulPhrases(meaningfulWords1);
  const phrases2 = TextHasher.createMeaningfulPhrases(meaningfulWords2);
  
  console.log('Phrases 1:', phrases1);
  console.log('Phrases 2:', phrases2);
  console.log();
  
  // Intersection
  const set1 = new Set(phrases1);
  const set2 = new Set(phrases2);
  const intersection = [...set1].filter((x) => set2.has(x));
  
  console.log('Intersection:', intersection);
  console.log('Set1 size:', set1.size);
  console.log('Set2 size:', set2.size);
  console.log('Intersection size:', intersection.length);
  console.log();
  
  // Manual calculation
  const ratio1 = (intersection.length / set1.size) * 100; // doc1 vs doc2
  const ratio2 = (intersection.length / set2.size) * 100; // doc2 vs doc1
  
  console.log(`Manual calculation:`);
  console.log(`  Doc1 vs Doc2: ${intersection.length}/${set1.size} = ${ratio1.toFixed(2)}%`);
  console.log(`  Doc2 vs Doc1: ${intersection.length}/${set2.size} = ${ratio2.toFixed(2)}%`);
  console.log();
  
  // Kiểm tra xem database có ảnh hưởng gì không
  console.log('=== EXPECTED RESULTS ===');
  console.log('Khi test doc2 với database có doc1:');
  console.log(`- Nếu dùng doc2 vs doc1: ${ratio2.toFixed(2)}%`);
  console.log(`- Nếu dùng doc1 vs doc2: ${ratio1.toFixed(2)}%`);
  console.log();
  console.log('Vấn đề có thể là:');
  console.log('1. Database có thêm documents khác làm ảnh hưởng kết quả');
  console.log('2. Logic tính toán trong service khác với TextHasher');
  console.log('3. Có normalization hoặc aggregation khác');
}

debugPercentageCalculation().catch(console.error);