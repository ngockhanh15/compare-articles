const { TextHasher } = require('./be/utils/TreeAVL');
const vietnameseStopwordService = require('./be/services/VietnameseStopwordService');

async function debugHashIssue() {
  console.log('=== Debug Hash Issue (Plagiarism Ratio) ===\n');

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

  // Test sentence hashing
  console.log('=== Sentence Hashes ===');
  const hash1 = TextHasher.createSentenceHashes(sentence1, true)[0];
  const hash2 = TextHasher.createSentenceHashes(sentence2, true)[0];
  
  console.log(`Hash 1: ${hash1.hash}`);
  console.log(`Hash 2: ${hash2.hash}`);
  console.log(`Hashes equal: ${hash1.hash === hash2.hash}`);
  console.log('---\n');

  // Test plagiarism ratio calculation
  console.log('=== Plagiarism Ratio Calculation ===');
  const plagiarismResult = TextHasher.calculatePlagiarismRatio(sentence1, sentence2, true);
  console.log(`Plagiarism Ratio: ${plagiarismResult.ratio.toFixed(2)}%`);
  console.log(`Details: ${plagiarismResult.details}`);
  console.log(`Matched phrases: [${plagiarismResult.matchedPhrasesList.join(', ')}]`);
  console.log('---\n');

  // Test similarity calculation (now using plagiarism ratio)
  console.log('=== Similarity Calculation (Plagiarism Ratio) ===');
  const similarity = TextHasher.calculateSentenceSimilarity(sentence1, sentence2, true);
  console.log(`Similarity: ${similarity.toFixed(2)}%`);
  console.log('---\n');

  // Test duplicate detection
  console.log('=== Duplicate Detection ===');
  const duplicateResult = TextHasher.isDuplicate(sentence1, sentence2, 70, true);
  console.log(`Is duplicate (70% threshold): ${duplicateResult.isDuplicate ? 'YES' : 'NO'}`);
  console.log(`Similarity: ${duplicateResult.similarity.toFixed(2)}%`);
  console.log('---\n');

  // Test word extraction (debug)
  console.log('=== Word Extraction Debug ===');
  const words1 = TextHasher.createWordHashes(sentence1, true);
  const words2 = TextHasher.createWordHashes(sentence2, true);
  
  console.log('Words from sentence 1:');
  words1.forEach(w => console.log(`  - "${w.word}" (${w.method})`));
  
  console.log('\nWords from sentence 2:');
  words2.forEach(w => console.log(`  - "${w.word}" (${w.method})`));
  
  // Find common words
  const words1Set = new Set(words1.map(w => w.word));
  const words2Set = new Set(words2.map(w => w.word));
  const commonWords = [...words1Set].filter(w => words2Set.has(w));
  
  console.log(`\nCommon words: [${commonWords.join(', ')}]`);
  console.log(`Common words count: ${commonWords.length}`);
  console.log(`Total words in sentence 1: ${words1Set.size}`);
  console.log(`Total words in sentence 2: ${words2Set.size}`);
}

// Run debug
debugHashIssue().catch(console.error);