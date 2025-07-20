const vietnameseStopwordService = require('./be/services/VietnameseStopwordService');
const { TextHasher } = require('./be/utils/TreeAVL');

async function debugSimilarityIssue() {
  console.log('=== DEBUG SIMILARITY ISSUE ===\n');
  
  // Khởi tạo stopword service
  await vietnameseStopwordService.initialize();
  
  const doc1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
  const doc2 = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";
  
  console.log('DOC1:', doc1);
  console.log('DOC2:', doc2);
  console.log();
  
  // Kiểm tra từ có nghĩa được trích xuất
  console.log('=== MEANINGFUL WORDS EXTRACTION ===');
  const meaningfulWords1 = vietnameseStopwordService.extractMeaningfulWords(doc1);
  const meaningfulWords2 = vietnameseStopwordService.extractMeaningfulWords(doc2);
  
  console.log('Doc1 meaningful words:', meaningfulWords1);
  console.log('Doc2 meaningful words:', meaningfulWords2);
  console.log();
  
  // Kiểm tra cụm từ được tạo
  console.log('=== PHRASE CREATION ===');
  const phrases1 = TextHasher.createMeaningfulPhrases(meaningfulWords1);
  const phrases2 = TextHasher.createMeaningfulPhrases(meaningfulWords2);
  
  console.log('Doc1 phrases:', phrases1);
  console.log('Doc2 phrases:', phrases2);
  console.log();
  
  // Tìm từ trùng lặp
  console.log('=== INTERSECTION ANALYSIS ===');
  const set1 = new Set(phrases1);
  const set2 = new Set(phrases2);
  const intersection = [...set1].filter((x) => set2.has(x));
  
  console.log('Intersection (matching phrases):', intersection);
  console.log('Set1 size:', set1.size);
  console.log('Set2 size:', set2.size);
  console.log('Intersection size:', intersection.length);
  console.log();
  
  // Tính plagiarism ratio
  console.log('=== PLAGIARISM RATIO CALCULATION ===');
  const ratio = (intersection.length / set1.size) * 100;
  console.log('Plagiarism Ratio (intersection/set1):', ratio.toFixed(2) + '%');
  
  // Tính ratio theo cách khác (intersection/set2)
  const ratio2 = (intersection.length / set2.size) * 100;
  console.log('Alternative Ratio (intersection/set2):', ratio2.toFixed(2) + '%');
  console.log();
  
  // Sử dụng hàm calculatePlagiarismRatio
  console.log('=== USING calculatePlagiarismRatio FUNCTION ===');
  const plagiarismResult = TextHasher.calculatePlagiarismRatio(doc1, doc2, true);
  console.log('Function result:', plagiarismResult);
  console.log();
  
  // Kiểm tra meaningful similarity
  console.log('=== MEANINGFUL SIMILARITY ===');
  const similarity = TextHasher.calculateMeaningfulSimilarity(doc1, doc2);
  console.log('Meaningful similarity:', similarity.toFixed(2) + '%');
  console.log();
  
  // Kiểm tra từng từ có phải stopword không
  console.log('=== STOPWORD CHECK ===');
  const allWords1 = doc1.toLowerCase().replace(/[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/]/g, ' ').split(/\s+/);
  const allWords2 = doc2.toLowerCase().replace(/[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/]/g, ' ').split(/\s+/);
  
  console.log('All words in doc1:', allWords1);
  console.log('All words in doc2:', allWords2);
  
  console.log('\nStopword check for doc1:');
  allWords1.forEach(word => {
    const isStopword = vietnameseStopwordService.isStopword(word);
    console.log(`  "${word}" -> ${isStopword ? 'STOPWORD' : 'MEANINGFUL'}`);
  });
  
  console.log('\nStopword check for doc2:');
  allWords2.forEach(word => {
    const isStopword = vietnameseStopwordService.isStopword(word);
    console.log(`  "${word}" -> ${isStopword ? 'STOPWORD' : 'MEANINGFUL'}`);
  });
}

debugSimilarityIssue().catch(console.error);