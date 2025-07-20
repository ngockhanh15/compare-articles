const { TextHasher } = require('./be/utils/TreeAVL');
const vietnameseStopwordService = require('./be/services/VietnameseStopwordService');

async function testNonOverlappingPhrases() {
  console.log('=== Test Non-Overlapping Phrases ===\n');

  // Khởi tạo stopword service
  try {
    await vietnameseStopwordService.initialize();
    console.log('Stopword service initialized successfully\n');
  } catch (error) {
    console.error('Failed to initialize stopword service:', error);
    return;
  }

  const sentence1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
  const sentence2 = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";

  console.log(`Sentence 1: "${sentence1}"`);
  console.log(`Sentence 2: "${sentence2}"`);
  console.log('---\n');

  // Test meaningful words extraction
  console.log('=== Meaningful Words Extraction ===');
  const words1 = vietnameseStopwordService.extractMeaningfulWords(sentence1);
  const words2 = vietnameseStopwordService.extractMeaningfulWords(sentence2);
  
  console.log(`Meaningful words 1: [${words1.join(', ')}]`);
  console.log(`Meaningful words 2: [${words2.join(', ')}]`);
  console.log('---\n');

  // Test non-overlapping phrase creation
  console.log('=== Non-Overlapping Phrase Creation ===');
  const phrases1 = TextHasher.createMeaningfulPhrases(words1);
  const phrases2 = TextHasher.createMeaningfulPhrases(words2);
  
  console.log(`Non-overlapping phrases from sentence 1 (${phrases1.length} total):`);
  phrases1.forEach(phrase => console.log(`  - "${phrase}"`));
  
  console.log(`\nNon-overlapping phrases from sentence 2 (${phrases2.length} total):`);
  phrases2.forEach(phrase => console.log(`  - "${phrase}"`));
  
  // Find common phrases
  const set1 = new Set(phrases1);
  const set2 = new Set(phrases2);
  const commonPhrases = [...set1].filter(p => set2.has(p));
  
  console.log(`\nCommon phrases (${commonPhrases.length} total):`);
  commonPhrases.forEach(phrase => console.log(`  - "${phrase}"`));
  console.log('---\n');

  // Test plagiarism ratio with non-overlapping phrases
  console.log('=== Plagiarism Ratio with Non-Overlapping Phrases ===');
  const plagiarismResult = TextHasher.calculatePlagiarismRatio(sentence1, sentence2, true);
  
  console.log(`Plagiarism Ratio: ${plagiarismResult.ratio.toFixed(2)}%`);
  console.log(`Details: ${plagiarismResult.details}`);
  console.log(`Total phrases in source: ${plagiarismResult.totalPhrases}`);
  console.log(`Total phrases in check: ${plagiarismResult.sourcePhrases}`);
  console.log(`Matched phrases: [${plagiarismResult.matchedPhrasesList.join(', ')}]`);
  console.log('---\n');

  // Test with more examples
  console.log('=== Test with Different Examples ===');
  
  // Example 1: Consecutive meaningful phrases
  const test1 = "ưa thích thể thao đặc biệt";
  const testWords1 = vietnameseStopwordService.extractMeaningfulWords(test1);
  const testPhrases1 = TextHasher.createMeaningfulPhrases(testWords1);
  console.log(`Test 1: "${test1}"`);
  console.log(`Words: [${testWords1.join(', ')}]`);
  console.log(`Non-overlapping phrases: [${testPhrases1.join(', ')}]`);
  console.log();
  
  // Example 2: Mixed phrases
  const test2 = "khánh ưa thích thể thao đá bóng";
  const testWords2 = vietnameseStopwordService.extractMeaningfulWords(test2);
  const testPhrases2 = TextHasher.createMeaningfulPhrases(testWords2);
  console.log(`Test 2: "${test2}"`);
  console.log(`Words: [${testWords2.join(', ')}]`);
  console.log(`Non-overlapping phrases: [${testPhrases2.join(', ')}]`);
  console.log();

  // Compare the two test sentences
  const testResult = TextHasher.calculatePlagiarismRatio(test1, test2, true);
  console.log(`Plagiarism ratio between test sentences: ${testResult.ratio.toFixed(2)}%`);
  console.log(`Matched phrases: [${testResult.matchedPhrasesList.join(', ')}]`);
}

// Run test
testNonOverlappingPhrases().catch(console.error);