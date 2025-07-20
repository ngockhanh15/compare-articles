const { TextHasher } = require('./be/utils/TreeAVL');

async function testSentenceFeatures() {
  console.log('=== Test Sentence Processing Features ===\n');

  // Test 1: Sentence extraction
  console.log('Test 1: Sentence Extraction');
  const sampleText = "Trí tuệ nhân tạo là một lĩnh vực khoa học máy tính. Nó tập trung vào việc tạo ra các hệ thống thông minh! Các hệ thống này có thể thực hiện các nhiệm vụ thường đòi hỏi trí tuệ con người?";
  
  const sentences = TextHasher.extractSentences(sampleText);
  console.log(`Input text: "${sampleText}"`);
  console.log(`Extracted ${sentences.length} sentences:`);
  sentences.forEach((sentence, idx) => {
    console.log(`  ${idx + 1}. "${sentence}"`);
  });
  console.log('---\n');

  // Test 2: Sentence hashing
  console.log('Test 2: Sentence Hashing');
  const sentenceHashes = TextHasher.createSentenceHashes(sampleText, true);
  console.log(`Created ${sentenceHashes.length} sentence hashes:`);
  sentenceHashes.forEach((hashData, idx) => {
    console.log(`  ${idx + 1}. Sentence: "${hashData.sentence}"`);
    console.log(`      Hash: ${hashData.hash.substring(0, 16)}...`);
    console.log(`      Word count: ${hashData.wordCount}`);
    console.log(`      Method: ${hashData.method}`);
  });
  console.log('---\n');

  // Test 3: Sentence similarity
  console.log('Test 3: Sentence Similarity');
  const sentence1 = "Trí tuệ nhân tạo là một lĩnh vực khoa học máy tính";
  const sentence2 = "Trí tuệ nhân tạo là lĩnh vực của khoa học máy tính";
  const sentence3 = "Machine learning là một phần của AI";
  
  const similarity1_2 = TextHasher.calculateSentenceSimilarity(sentence1, sentence2, true);
  const similarity1_3 = TextHasher.calculateSentenceSimilarity(sentence1, sentence3, true);
  
  console.log(`Sentence 1: "${sentence1}"`);
  console.log(`Sentence 2: "${sentence2}"`);
  console.log(`Similarity 1-2: ${similarity1_2.toFixed(2)}%`);
  console.log();
  console.log(`Sentence 1: "${sentence1}"`);
  console.log(`Sentence 3: "${sentence3}"`);
  console.log(`Similarity 1-3: ${similarity1_3.toFixed(2)}%`);
  console.log('---\n');

  // Test 4: Hash comparison
  console.log('Test 4: Hash Comparison');
  const hash1 = TextHasher.createSentenceHashes(sentence1, true)[0];
  const hash2 = TextHasher.createSentenceHashes(sentence2, true)[0];
  const hash3 = TextHasher.createSentenceHashes(sentence3, true)[0];
  
  console.log(`Hash 1: ${hash1.hash.substring(0, 16)}...`);
  console.log(`Hash 2: ${hash2.hash.substring(0, 16)}...`);
  console.log(`Hash 3: ${hash3.hash.substring(0, 16)}...`);
  console.log(`Hash 1 == Hash 2: ${hash1.hash === hash2.hash}`);
  console.log(`Hash 1 == Hash 3: ${hash1.hash === hash3.hash}`);
  console.log('---\n');

  console.log('=== Test completed successfully! ===');
}

// Chạy test
testSentenceFeatures().catch(console.error);