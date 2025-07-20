const { TextHasher } = require('./be/utils/TreeAVL');
const vietnameseStopwordService = require('./be/services/VietnameseStopwordService');
const plagiarismDetectionService = require('./be/services/PlagiarismDetectionService');

async function testFullSystem() {
  console.log('=== Test Full System with New Phrase Algorithm ===\n');

  try {
    // Khởi tạo services
    await vietnameseStopwordService.initialize();
    console.log('✅ Vietnamese stopword service initialized\n');

    await plagiarismDetectionService.initialize();
    console.log('✅ Plagiarism detection service initialized\n');

    // Test data
    const testText1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng và bơi lội.";
    const testText2 = "Thể thao là môn ưa thích của mọi người, tôi cũng không đặc biệt khác gì.";
    const testText3 = "Khánh rất ưa thích thể thao, đặc biệt là đá bóng, bơi lội và chạy bộ.";

    console.log('=== Test Documents ===');
    console.log(`Text 1: "${testText1}"`);
    console.log(`Text 2: "${testText2}"`);
    console.log(`Text 3: "${testText3}"`);
    console.log('---\n');

    // Thêm documents vào hệ thống
    console.log('=== Adding Documents to System ===');
    plagiarismDetectionService.addDocumentToTree(testText1, { id: 'doc1', name: 'Document 1' });
    plagiarismDetectionService.addDocumentToTree(testText2, { id: 'doc2', name: 'Document 2' });
    console.log('✅ Added 2 documents to system\n');

    // Test plagiarism check với document thứ 3
    console.log('=== Plagiarism Check with New Algorithm ===');
    const checkResult = await plagiarismDetectionService.checkPlagiarism(testText3, { sensitivity: 'medium' });
    
    console.log('📊 **Plagiarism Check Results:**');
    console.log(`   Duplicate Percentage: ${checkResult.duplicatePercentage}%`);
    console.log(`   Confidence: ${checkResult.confidence}`);
    console.log(`   Processing Time: ${checkResult.processingTime}ms`);
    console.log(`   Total Matches: ${checkResult.matches.length}`);
    console.log(`   Sources: [${checkResult.sources.join(', ')}]`);
    console.log('---\n');

    // Hiển thị chi tiết matches
    if (checkResult.matches.length > 0) {
      console.log('🔍 **Detailed Matches:**');
      checkResult.matches.forEach((match, index) => {
        console.log(`\n   Match ${index + 1}:`);
        console.log(`   ├─ Method: ${match.method}`);
        console.log(`   ├─ Similarity: ${match.similarity}%`);
        console.log(`   ├─ Source: ${match.source}`);
        
        if (match.matchedPhrases) {
          console.log(`   ├─ Matched Phrases (${match.matchedPhrases.length}): [${match.matchedPhrases.join(', ')}]`);
          console.log(`   ├─ Total Phrases: ${match.totalPhrases}`);
          console.log(`   └─ Details: ${match.details}`);
        } else if (match.matchedWords) {
          console.log(`   └─ Matched Words: ${match.matchedWords}`);
        }
      });
      console.log('---\n');
    }

    // Test direct phrase comparison
    console.log('=== Direct Phrase Comparison ===');
    const directComparison = TextHasher.calculatePlagiarismRatio(testText3, testText1, true);
    console.log(`Direct comparison between Text 3 and Text 1:`);
    console.log(`   Plagiarism Ratio: ${directComparison.ratio.toFixed(2)}%`);
    console.log(`   Details: ${directComparison.details}`);
    console.log(`   Matched Phrases: [${directComparison.matchedPhrasesList.join(', ')}]`);
    console.log(`   Meaningful Words 1: [${directComparison.meaningfulWords1.join(', ')}]`);
    console.log(`   Meaningful Words 2: [${directComparison.meaningfulWords2.join(', ')}]`);
    console.log('---\n');

    // Test system stats
    console.log('=== System Statistics ===');
    const stats = plagiarismDetectionService.getStats();
    console.log(`📈 **System Stats:**`);
    console.log(`   Total Documents: ${stats.totalDocuments}`);
    console.log(`   Total Words: ${stats.totalWords}`);
    console.log(`   Total Sentences: ${stats.totalSentences}`);
    console.log(`   Stopwords Loaded: ${stats.stopwordService.totalStopwords}`);
    console.log(`   System Initialized: ${stats.initialized}`);
    console.log('---\n');

    // Test với sensitivity khác nhau
    console.log('=== Testing Different Sensitivity Levels ===');
    const sensitivities = ['low', 'medium', 'high'];
    
    for (const sensitivity of sensitivities) {
      const result = await plagiarismDetectionService.checkPlagiarism(testText3, { sensitivity });
      console.log(`${sensitivity.toUpperCase()} sensitivity:`);
      console.log(`   ├─ Duplicate %: ${result.duplicatePercentage}%`);
      console.log(`   ├─ Matches: ${result.matches.length}`);
      console.log(`   └─ Confidence: ${result.confidence}`);
    }

    console.log('\n🎉 **Full system test completed successfully!**');

  } catch (error) {
    console.error('❌ Error in full system test:', error);
  }
}

// Run test
testFullSystem().catch(console.error);