const { TreeAVL, TextHasher } = require('./utils/TreeAVL');
const vietnameseStopwordService = require('./services/VietnameseStopwordService');

async function testSpecificCase() {
  try {
    console.log('🚀 Testing specific case...\n');

    // Initialize Vietnamese stopword service
    await vietnameseStopwordService.initialize();
    console.log('✅ Vietnamese Stopword Service initialized\n');

    // Create a new AVL tree
    const tree = new TreeAVL();

    // Document text from database
    const documentText = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
    
    // Test text to compare
    const testText = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";

    console.log('📄 Document text:', documentText);
    console.log('📝 Test text:', testText);
    console.log('\n' + '='.repeat(60) + '\n');

    // Create word hashes for document
    const documentHashes = TextHasher.createWordHashes(documentText, true);
    console.log(`📊 Document generated ${documentHashes.length} word hashes:`);
    documentHashes.forEach((hash, i) => {
      console.log(`   ${i + 1}. "${hash.word}" -> ${hash.hash.substring(0, 8)}...`);
    });

    // Add document hashes to tree
    const documentData = {
      documentId: 'test-doc-khanh',
      title: 'Khánh Document',
      fileType: 'txt',
      fullText: documentText
    };

    for (const wordHash of documentHashes) {
      tree.insert(wordHash.hash, documentData);
    }

    console.log(`\n🌳 Tree size after inserting document: ${tree.getSize()}`);

    // Create word hashes for test text
    const testHashes = TextHasher.createWordHashes(testText, true);
    console.log(`\n📊 Test text generated ${testHashes.length} word hashes:`);
    testHashes.forEach((hash, i) => {
      console.log(`   ${i + 1}. "${hash.word}" -> ${hash.hash.substring(0, 8)}...`);
    });

    // Search for matches
    let matchedHashes = 0;
    const matchedWords = [];
    const unmatchedWords = [];

    console.log('\n🔍 Searching for matches:');
    for (const wordHash of testHashes) {
      const foundNode = tree.search(wordHash.hash);
      if (foundNode) {
        matchedHashes++;
        matchedWords.push(wordHash.word);
        console.log(`   ✅ Found match for word: "${wordHash.word}"`);
      } else {
        unmatchedWords.push(wordHash.word);
        console.log(`   ❌ No match for word: "${wordHash.word}"`);
      }
    }

    // Calculate similarity
    const similarity = Math.round((matchedHashes / testHashes.length) * 100);

    console.log('\n' + '='.repeat(60));
    console.log('📊 Final Results:');
    console.log(`- Matched hashes: ${matchedHashes}/${testHashes.length}`);
    console.log(`- Similarity: ${similarity}%`);
    console.log(`- Matched words: [${matchedWords.join(', ')}]`);
    console.log(`- Unmatched words: [${unmatchedWords.join(', ')}]`);

    if (similarity > 0) {
      console.log('\n✅ SUCCESS: Found similarity between the texts!');
    } else {
      console.log('\n❌ ISSUE: No similarity detected');
      console.log('This suggests the words are being processed differently');
    }

    // Debug: Compare specific words
    console.log('\n🔍 Debug - Word comparison:');
    const commonWords = ['thể', 'thao', 'ưa', 'thích', 'tôi', 'đặc', 'biệt'];
    
    for (const word of commonWords) {
      const docHash = TextHasher.createWordHashes(word, true);
      const testHash = TextHasher.createWordHashes(word, true);
      
      if (docHash.length > 0 && testHash.length > 0) {
        const match = docHash[0].hash === testHash[0].hash;
        console.log(`   "${word}": ${match ? '✅' : '❌'} (${docHash[0].hash.substring(0, 8)}... vs ${testHash[0].hash.substring(0, 8)}...)`);
      } else {
        console.log(`   "${word}": ⚠️ Filtered out by stopwords`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSpecificCase().catch(console.error);