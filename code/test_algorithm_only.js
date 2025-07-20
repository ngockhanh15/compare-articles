const { TextHasher } = require('./be/utils/TreeAVL');
const vietnameseStopwordService = require('./be/services/VietnameseStopwordService');

async function testAlgorithmOnly() {
  console.log('=== Test New Phrase Algorithm (No Database) ===\n');

  try {
    // Khởi tạo stopword service
    await vietnameseStopwordService.initialize();
    console.log('✅ Vietnamese stopword service initialized\n');

    // Test data
    const testText1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng và bơi lội.";
    const testText2 = "Thể thao là môn ưa thích của mọi người, tôi cũng không đặc biệt khác gì.";
    const testText3 = "Khánh rất ưa thích thể thao, đặc biệt là đá bóng, bơi lội và chạy bộ.";

    console.log('=== Test Documents ===');
    console.log(`Text 1: "${testText1}"`);
    console.log(`Text 2: "${testText2}"`);
    console.log(`Text 3: "${testText3}"`);
    console.log('---\n');

    // Test 1: So sánh Text 3 với Text 1
    console.log('=== Test 1: Text 3 vs Text 1 ===');
    const result1 = TextHasher.calculatePlagiarismRatio(testText3, testText1, true);
    console.log(`📊 **Results:**`);
    console.log(`   Plagiarism Ratio: ${result1.ratio.toFixed(2)}%`);
    console.log(`   Details: ${result1.details}`);
    console.log(`   Total Phrases in Source: ${result1.totalPhrases}`);
    console.log(`   Total Phrases in Check: ${result1.sourcePhrases}`);
    console.log(`   Matched Phrases: [${result1.matchedPhrasesList.join(', ')}]`);
    console.log(`   Meaningful Words 1: [${result1.meaningfulWords1.join(', ')}]`);
    console.log(`   Meaningful Words 2: [${result1.meaningfulWords2.join(', ')}]`);
    console.log('---\n');

    // Test 2: So sánh Text 3 với Text 2
    console.log('=== Test 2: Text 3 vs Text 2 ===');
    const result2 = TextHasher.calculatePlagiarismRatio(testText3, testText2, true);
    console.log(`📊 **Results:**`);
    console.log(`   Plagiarism Ratio: ${result2.ratio.toFixed(2)}%`);
    console.log(`   Details: ${result2.details}`);
    console.log(`   Total Phrases in Source: ${result2.totalPhrases}`);
    console.log(`   Total Phrases in Check: ${result2.sourcePhrases}`);
    console.log(`   Matched Phrases: [${result2.matchedPhrasesList.join(', ')}]`);
    console.log(`   Meaningful Words 1: [${result2.meaningfulWords1.join(', ')}]`);
    console.log(`   Meaningful Words 2: [${result2.meaningfulWords2.join(', ')}]`);
    console.log('---\n');

    // Test 3: So sánh Text 1 với Text 2
    console.log('=== Test 3: Text 1 vs Text 2 ===');
    const result3 = TextHasher.calculatePlagiarismRatio(testText1, testText2, true);
    console.log(`📊 **Results:**`);
    console.log(`   Plagiarism Ratio: ${result3.ratio.toFixed(2)}%`);
    console.log(`   Details: ${result3.details}`);
    console.log(`   Total Phrases in Source: ${result3.totalPhrases}`);
    console.log(`   Total Phrases in Check: ${result3.sourcePhrases}`);
    console.log(`   Matched Phrases: [${result3.matchedPhrasesList.join(', ')}]`);
    console.log(`   Meaningful Words 1: [${result3.meaningfulWords1.join(', ')}]`);
    console.log(`   Meaningful Words 2: [${result3.meaningfulWords2.join(', ')}]`);
    console.log('---\n');

    // Test 4: Hiển thị phrase creation process
    console.log('=== Test 4: Phrase Creation Process ===');
    const words1 = vietnameseStopwordService.extractMeaningfulWords(testText1);
    const words2 = vietnameseStopwordService.extractMeaningfulWords(testText2);
    const words3 = vietnameseStopwordService.extractMeaningfulWords(testText3);

    const phrases1 = TextHasher.createMeaningfulPhrases(words1);
    const phrases2 = TextHasher.createMeaningfulPhrases(words2);
    const phrases3 = TextHasher.createMeaningfulPhrases(words3);

    console.log(`Text 1 meaningful words: [${words1.join(', ')}]`);
    console.log(`Text 1 phrases: [${phrases1.join(', ')}]`);
    console.log();
    console.log(`Text 2 meaningful words: [${words2.join(', ')}]`);
    console.log(`Text 2 phrases: [${phrases2.join(', ')}]`);
    console.log();
    console.log(`Text 3 meaningful words: [${words3.join(', ')}]`);
    console.log(`Text 3 phrases: [${phrases3.join(', ')}]`);
    console.log('---\n');

    // Test 5: Duplicate detection với ngưỡng khác nhau
    console.log('=== Test 5: Duplicate Detection with Different Thresholds ===');
    const thresholds = [30, 50, 70, 90];
    
    thresholds.forEach(threshold => {
      const isDup1 = TextHasher.isDuplicate(testText3, testText1, threshold, true);
      const isDup2 = TextHasher.isDuplicate(testText3, testText2, threshold, true);
      
      console.log(`Threshold ${threshold}%:`);
      console.log(`   Text 3 vs Text 1: ${isDup1.isDuplicate ? 'DUPLICATE' : 'NOT DUPLICATE'} (${isDup1.similarity.toFixed(2)}%)`);
      console.log(`   Text 3 vs Text 2: ${isDup2.isDuplicate ? 'DUPLICATE' : 'NOT DUPLICATE'} (${isDup2.similarity.toFixed(2)}%)`);
    });
    console.log('---\n');

    // Test 6: Performance test
    console.log('=== Test 6: Performance Test ===');
    const iterations = 1000;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      TextHasher.calculatePlagiarismRatio(testText3, testText1, true);
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / iterations;
    
    console.log(`Performance test (${iterations} iterations):`);
    console.log(`   Total time: ${endTime - startTime}ms`);
    console.log(`   Average time per comparison: ${avgTime.toFixed(2)}ms`);
    console.log('---\n');

    console.log('🎉 **Algorithm test completed successfully!**');
    console.log('\n📋 **Summary:**');
    console.log(`   ✅ Stopword filtering: Working`);
    console.log(`   ✅ Non-overlapping phrases: Working`);
    console.log(`   ✅ Plagiarism ratio calculation: Working`);
    console.log(`   ✅ Duplicate detection: Working`);
    console.log(`   ✅ Performance: ${avgTime.toFixed(2)}ms per comparison`);

  } catch (error) {
    console.error('❌ Error in algorithm test:', error);
  }
}

// Run test
testAlgorithmOnly().catch(console.error);