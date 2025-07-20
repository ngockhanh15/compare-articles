const { TextHasher } = require('./be/utils/TreeAVL');
const vietnameseStopwordService = require('./be/services/VietnameseStopwordService');

async function testImprovedHash() {
  console.log('=== Test Improved Hash Algorithm ===\n');

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

  // Test improved similarity calculation
  console.log('=== Improved Similarity Calculation ===');
  const similarity = TextHasher.calculateSentenceSimilarity(sentence1, sentence2, true);
  console.log(`Improved similarity: ${similarity.toFixed(2)}%`);
  console.log('---\n');

  // Test duplicate detection with different thresholds
  console.log('=== Duplicate Detection ===');
  const thresholds = [50, 60, 70, 80, 90];
  
  thresholds.forEach(threshold => {
    const result = TextHasher.isDuplicate(sentence1, sentence2, threshold, true);
    console.log(`Threshold ${threshold}%: ${result.isDuplicate ? 'DUPLICATE' : 'NOT DUPLICATE'} (similarity: ${result.similarity.toFixed(2)}%)`);
  });
  console.log('---\n');

  // Test semantic hashing
  console.log('=== Semantic Hashing ===');
  const semanticComparison = TextHasher.compareSemanticHashes(sentence1, sentence2, true);
  console.log(`Semantic hash 1: ${semanticComparison.hash1}`);
  console.log(`Semantic hash 2: ${semanticComparison.hash2}`);
  console.log(`Semantic hashes equal: ${semanticComparison.isEqual}`);
  console.log('---\n');

  // Test with more similar sentences
  console.log('=== Test with More Similar Sentences ===');
  const similar1 = "Tôi ưa thích thể thao đặc biệt là đá bóng";
  const similar2 = "Thể thao đặc biệt đá bóng là môn tôi ưa thích";
  
  console.log(`Similar 1: "${similar1}"`);
  console.log(`Similar 2: "${similar2}"`);
  
  const similarityResult = TextHasher.calculateSentenceSimilarity(similar1, similar2, true);
  console.log(`Similarity: ${similarityResult.toFixed(2)}%`);
  
  const duplicateResult = TextHasher.isDuplicate(similar1, similar2, 70, true);
  console.log(`Is duplicate (70% threshold): ${duplicateResult.isDuplicate}`);
  
  const semanticResult = TextHasher.compareSemanticHashes(similar1, similar2, true);
  console.log(`Semantic hashes equal: ${semanticResult.isEqual}`);
  console.log('---\n');

  // Test with identical meaningful content but different order
  console.log('=== Test with Same Content, Different Order ===');
  const order1 = "đá bóng thể thao ưa thích";
  const order2 = "ưa thích thể thao đá bóng";
  
  console.log(`Order 1: "${order1}"`);
  console.log(`Order 2: "${order2}"`);
  
  const orderSimilarity = TextHasher.calculateSentenceSimilarity(order1, order2, true);
  console.log(`Similarity: ${orderSimilarity.toFixed(2)}%`);
  
  const orderSemantic = TextHasher.compareSemanticHashes(order1, order2, true);
  console.log(`Semantic hashes equal: ${orderSemantic.isEqual}`);
}

// Run test
testImprovedHash().catch(console.error);