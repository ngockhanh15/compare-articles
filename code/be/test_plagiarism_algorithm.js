const { TextHasher } = require('./utils/TreeAVL');
const vietnameseStopwordService = require('./services/VietnameseStopwordService');

async function testPlagiarismAlgorithm() {
  console.log('=== TESTING PLAGIARISM ALGORITHM ===\n');
  
  // Initialize stopword service
  await vietnameseStopwordService.initialize();
  
  const doc1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
  const doc2 = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";
  const doc3 = "Hôm nay trời đẹp, tôi đi chơi với bạn bè."; // Completely different
  const doc4 = "Tôi thích thể thao"; // Partially similar
  
  console.log('Testing documents:');
  console.log('Doc1:', doc1);
  console.log('Doc2:', doc2);
  console.log('Doc3:', doc3);
  console.log('Doc4:', doc4);
  console.log();
  
  // Test 1: Doc1 vs Doc2 (should be moderate similarity)
  console.log('🔍 Test 1: Doc1 vs Doc2');
  const result1 = TextHasher.calculatePlagiarismRatio(doc1, doc2, true);
  console.log(`Ratio: ${result1.ratio.toFixed(2)}%`);
  console.log(`Matched phrases: ${result1.matchedPhrasesList.join(', ')}`);
  console.log(`Total phrases in source: ${result1.totalPhrases}`);
  console.log(`Details: ${result1.details}`);
  console.log();
  
  // Test 2: Doc1 vs Doc3 (should be low similarity)
  console.log('🔍 Test 2: Doc1 vs Doc3');
  const result2 = TextHasher.calculatePlagiarismRatio(doc1, doc3, true);
  console.log(`Ratio: ${result2.ratio.toFixed(2)}%`);
  console.log(`Matched phrases: ${result2.matchedPhrasesList.join(', ')}`);
  console.log(`Total phrases in source: ${result2.totalPhrases}`);
  console.log(`Details: ${result2.details}`);
  console.log();
  
  // Test 3: Doc1 vs Doc4 (should be moderate similarity)
  console.log('🔍 Test 3: Doc1 vs Doc4');
  const result3 = TextHasher.calculatePlagiarismRatio(doc1, doc4, true);
  console.log(`Ratio: ${result3.ratio.toFixed(2)}%`);
  console.log(`Matched phrases: ${result3.matchedPhrasesList.join(', ')}`);
  console.log(`Total phrases in source: ${result3.totalPhrases}`);
  console.log(`Details: ${result3.details}`);
  console.log();
  
  // Test 4: Doc1 vs Doc1 (should be 100%)
  console.log('🔍 Test 4: Doc1 vs Doc1 (exact match)');
  const result4 = TextHasher.calculatePlagiarismRatio(doc1, doc1, true);
  console.log(`Ratio: ${result4.ratio.toFixed(2)}%`);
  console.log(`Matched phrases: ${result4.matchedPhrasesList.join(', ')}`);
  console.log(`Total phrases in source: ${result4.totalPhrases}`);
  console.log(`Details: ${result4.details}`);
  console.log();
  
  // Test meaningful words extraction
  console.log('🔍 Meaningful words extraction:');
  const words1 = vietnameseStopwordService.extractMeaningfulWords(doc1);
  const words2 = vietnameseStopwordService.extractMeaningfulWords(doc2);
  const words3 = vietnameseStopwordService.extractMeaningfulWords(doc3);
  
  console.log(`Doc1 meaningful words: ${words1.join(', ')}`);
  console.log(`Doc2 meaningful words: ${words2.join(', ')}`);
  console.log(`Doc3 meaningful words: ${words3.join(', ')}`);
  console.log();
  
  // Test phrase creation
  console.log('🔍 Phrase creation:');
  const phrases1 = TextHasher.createMeaningfulPhrases(words1);
  const phrases2 = TextHasher.createMeaningfulPhrases(words2);
  const phrases3 = TextHasher.createMeaningfulPhrases(words3);
  
  console.log(`Doc1 phrases: ${phrases1.join(', ')}`);
  console.log(`Doc2 phrases: ${phrases2.join(', ')}`);
  console.log(`Doc3 phrases: ${phrases3.join(', ')}`);
  console.log();
  
  // Analysis
  console.log('📊 ANALYSIS:');
  console.log('Expected behavior:');
  console.log('- Doc1 vs Doc2: Should be 30-70% (moderate similarity)');
  console.log('- Doc1 vs Doc3: Should be 0-20% (low similarity)');
  console.log('- Doc1 vs Doc4: Should be 20-50% (some similarity)');
  console.log('- Doc1 vs Doc1: Should be 100% (exact match)');
  console.log();
  
  if (result2.ratio > 50) {
    console.log('❌ PROBLEM: Doc1 vs Doc3 shows high similarity when they should be different');
  }
  
  if (result1.ratio > 90) {
    console.log('❌ PROBLEM: Doc1 vs Doc2 shows too high similarity');
  }
  
  if (result4.ratio < 95) {
    console.log('❌ PROBLEM: Doc1 vs Doc1 should be nearly 100%');
  }
}

testPlagiarismAlgorithm().catch(console.error);