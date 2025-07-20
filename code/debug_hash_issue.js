const { TextHasher } = require('./be/utils/TreeAVL');
const vietnameseStopwordService = require('./be/services/VietnameseStopwordService');

async function debugHashIssue() {
  console.log('=== Debug Hash Issue ===\n');

  // Khởi tạo stopword service trước
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
  const meaningfulWords1 = vietnameseStopwordService.extractMeaningfulWords(sentence1);
  const meaningfulWords2 = vietnameseStopwordService.extractMeaningfulWords(sentence2);
  
  console.log('Meaningful words from sentence 1:');
  console.log(`  [${meaningfulWords1.join(', ')}]`);
  
  console.log('\nMeaningful words from sentence 2:');
  console.log(`  [${meaningfulWords2.join(', ')}]`);
  
  // Find common meaningful words
  const set1 = new Set(meaningfulWords1);
  const set2 = new Set(meaningfulWords2);
  const commonMeaningfulWords = [...set1].filter(w => set2.has(w));
  
  console.log(`\nCommon meaningful words: [${commonMeaningfulWords.join(', ')}]`);
  console.log(`Common meaningful words count: ${commonMeaningfulWords.length}`);
  console.log(`Total meaningful words in sentence 1: ${set1.size}`);
  console.log(`Total meaningful words in sentence 2: ${set2.size}`);
  console.log('---\n');

  // Test sentence hashing with stopwords
  console.log('=== Sentence Hashes (with stopwords filtering) ===');
  const hash1 = TextHasher.createSentenceHashes(sentence1, true)[0];
  const hash2 = TextHasher.createSentenceHashes(sentence2, true)[0];
  
  console.log(`Hash 1: ${hash1.hash}`);
  console.log(`Hash 2: ${hash2.hash}`);
  console.log(`Hashes equal: ${hash1.hash === hash2.hash}`);
  console.log('---\n');

  // Test similarity calculation with stopwords
  console.log('=== Similarity Calculation (with stopwords filtering) ===');
  const similarity = TextHasher.calculateSentenceSimilarity(sentence1, sentence2, true);
  console.log(`Similarity: ${similarity.toFixed(2)}%`);
  
  // Manual calculation for verification
  const manualSimilarity = (commonMeaningfulWords.length / set1.size) * 100;
  console.log(`Manual calculation: ${manualSimilarity.toFixed(2)}%`);
  console.log('---\n');

  // Test word hashes with stopwords
  console.log('=== Word Hashes (with stopwords filtering) ===');
  const words1 = TextHasher.createWordHashes(sentence1, true);
  const words2 = TextHasher.createWordHashes(sentence2, true);
  
  console.log('Words from sentence 1:');
  words1.forEach(w => console.log(`  - "${w.word}" (${w.method})`));
  
  console.log('\nWords from sentence 2:');
  words2.forEach(w => console.log(`  - "${w.word}" (${w.method})`));

  // Test meaningful text hashing
  console.log('\n=== Meaningful Text Hashing ===');
  const meaningfulText1 = meaningfulWords1.join(' ');
  const meaningfulText2 = meaningfulWords2.join(' ');
  
  console.log(`Meaningful text 1: "${meaningfulText1}"`);
  console.log(`Meaningful text 2: "${meaningfulText2}"`);
  
  const meaningfulHash1 = TextHasher.createMD5Hash(meaningfulText1);
  const meaningfulHash2 = TextHasher.createMD5Hash(meaningfulText2);
  
  console.log(`Meaningful hash 1: ${meaningfulHash1}`);
  console.log(`Meaningful hash 2: ${meaningfulHash2}`);
  console.log(`Meaningful hashes equal: ${meaningfulHash1 === meaningfulHash2}`);
}

// Run debug
debugHashIssue().catch(console.error);