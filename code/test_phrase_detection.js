const { TextHasher } = require('./be/utils/TreeAVL');
const vietnameseStopwordService = require('./be/services/VietnameseStopwordService');

async function testPhraseDetection() {
  console.log('=== Test Phrase Detection (N-grams) ===\n');

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

  // Test phrase creation
  console.log('=== Phrase Creation (N-grams) ===');
  const phrases1 = TextHasher.createMeaningfulPhrases(words1);
  const phrases2 = TextHasher.createMeaningfulPhrases(words2);
  
  console.log(`Phrases from sentence 1 (${phrases1.length} total):`);
  phrases1.forEach(phrase => console.log(`  - "${phrase}"`));
  
  console.log(`\nPhrases from sentence 2 (${phrases2.length} total):`);
  phrases2.forEach(phrase => console.log(`  - "${phrase}"`));
  
  // Find common phrases
  const set1 = new Set(phrases1);
  const set2 = new Set(phrases2);
  const commonPhrases = [...set1].filter(p => set2.has(p));
  
  console.log(`\nCommon phrases (${commonPhrases.length} total):`);
  commonPhrases.forEach(phrase => console.log(`  - "${phrase}"`));
  console.log('---\n');

  // Test plagiarism ratio with phrases
  console.log('=== Plagiarism Ratio with Phrases ===');
  const plagiarismResult = TextHasher.calculatePlagiarismRatio(sentence1, sentence2, true);
  
  console.log(`Plagiarism Ratio: ${plagiarismResult.ratio.toFixed(2)}%`);
  console.log(`Details: ${plagiarismResult.details}`);
  console.log(`Total phrases in source: ${plagiarismResult.totalPhrases}`);
  console.log(`Total phrases in check: ${plagiarismResult.sourcePhrases}`);
  console.log(`Matched phrases: [${plagiarismResult.matchedPhrasesList.join(', ')}]`);
  console.log('---\n');

  // Test similarity calculation with phrases
  console.log('=== Similarity Calculation with Phrases ===');
  const similarity = TextHasher.calculateSentenceSimilarity(sentence1, sentence2, true);
  console.log(`Similarity: ${similarity.toFixed(2)}%`);
  console.log('---\n');

  // Test duplicate detection with phrases
  console.log('=== Duplicate Detection with Phrases ===');
  const duplicateResult = TextHasher.isDuplicate(sentence1, sentence2, 70, true);
  console.log(`Is duplicate (70% threshold): ${duplicateResult.isDuplicate ? 'YES' : 'NO'}`);
  console.log(`Similarity: ${duplicateResult.similarity.toFixed(2)}%`);
  console.log('---\n');

  // Test with more similar sentences
  console.log('=== Test with More Similar Sentences ===');
  const similar1 = "Tôi ưa thích thể thao đặc biệt là đá bóng";
  const similar2 = "Thể thao đặc biệt đá bóng là môn tôi ưa thích";
  
  console.log(`Similar 1: "${similar1}"`);
  console.log(`Similar 2: "${similar2}"`);
  
  const similarWords1 = vietnameseStopwordService.extractMeaningfulWords(similar1);
  const similarWords2 = vietnameseStopwordService.extractMeaningfulWords(similar2);
  const similarPhrases1 = TextHasher.createMeaningfulPhrases(similarWords1);
  const similarPhrases2 = TextHasher.createMeaningfulPhrases(similarWords2);
  
  console.log(`\nPhrases 1: [${similarPhrases1.join(', ')}]`);
  console.log(`Phrases 2: [${similarPhrases2.join(', ')}]`);
  
  const similarResult = TextHasher.calculatePlagiarismRatio(similar1, similar2, true);
  console.log(`\nPlagiarism Ratio: ${similarResult.ratio.toFixed(2)}%`);
  console.log(`Matched phrases: [${similarResult.matchedPhrasesList.join(', ')}]`);
}

// Run test
testPhraseDetection().catch(console.error);