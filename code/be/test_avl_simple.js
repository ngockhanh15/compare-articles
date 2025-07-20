const { TreeAVL, TextHasher } = require('./utils/TreeAVL');
const vietnameseStopwordService = require('./services/VietnameseStopwordService');

async function testAVLLogic() {
  try {
    console.log('🚀 Testing AVL Tree Logic (without MongoDB)...\n');

    // Initialize Vietnamese stopword service
    await vietnameseStopwordService.initialize();
    console.log('✅ Vietnamese Stopword Service initialized\n');

    // Create a new AVL tree
    const tree = new TreeAVL();

    // Sample document text
    const documentText = `
      Trí tuệ nhân tạo là một lĩnh vực của khoa học máy tính.
      Nó tập trung vào việc tạo ra các hệ thống thông minh.
      Các hệ thống này có thể học hỏi và đưa ra quyết định.
      Machine learning là một phần quan trọng của AI.
      Deep learning sử dụng mạng neural nhân tạo.
    `;

    // Test text (similar to document)
    const testText = `
      Trí tuệ nhân tạo là lĩnh vực khoa học máy tính.
      Nó tạo ra hệ thống thông minh có thể học hỏi.
      Machine learning quan trọng trong AI.
    `;

    console.log('📄 Document text:');
    console.log(documentText);
    console.log('\n📝 Test text:');
    console.log(testText);
    console.log('\n' + '='.repeat(50) + '\n');

    // Create word hashes for document
    const documentHashes = TextHasher.createWordHashes(documentText, true);
    console.log(`📊 Document generated ${documentHashes.length} word hashes`);

    // Add document hashes to tree
    const documentData = {
      documentId: 'test-doc-1',
      title: 'Test Document',
      fileType: 'txt',
      fullText: documentText
    };

    for (const wordHash of documentHashes) {
      tree.insert(wordHash.hash, documentData);
    }

    console.log(`🌳 Tree size after inserting document: ${tree.getSize()}`);

    // Create word hashes for test text
    const testHashes = TextHasher.createWordHashes(testText, true);
    console.log(`📊 Test text generated ${testHashes.length} word hashes`);

    // Search for matches
    let matchedHashes = 0;
    const matchedWords = [];

    for (const wordHash of testHashes) {
      const foundNode = tree.search(wordHash.hash);
      if (foundNode) {
        matchedHashes++;
        matchedWords.push(wordHash.word);
        console.log(`✅ Found match for word: "${wordHash.word}"`);
      }
    }

    // Calculate similarity
    const similarity = Math.round((matchedHashes / testHashes.length) * 100);

    console.log('\n' + '='.repeat(50));
    console.log('📊 Results:');
    console.log(`- Matched hashes: ${matchedHashes}/${testHashes.length}`);
    console.log(`- Similarity: ${similarity}%`);
    console.log(`- Matched words: ${matchedWords.join(', ')}`);

    if (similarity > 0) {
      console.log('\n✅ SUCCESS: The AVL tree logic is working correctly!');
      console.log('The system can now detect similar content.');
    } else {
      console.log('\n❌ ISSUE: No matches found. This could indicate:');
      console.log('1. Word hashing is not working properly');
      console.log('2. Stopword filtering is too aggressive');
      console.log('3. Hash comparison logic has issues');
    }

    // Debug: Show some hashes
    console.log('\n🔍 Debug - First 5 document word hashes:');
    documentHashes.slice(0, 5).forEach((hash, i) => {
      console.log(`${i + 1}. "${hash.word}" -> ${hash.hash.substring(0, 8)}...`);
    });

    console.log('\n🔍 Debug - First 5 test word hashes:');
    testHashes.slice(0, 5).forEach((hash, i) => {
      console.log(`${i + 1}. "${hash.word}" -> ${hash.hash.substring(0, 8)}...`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAVLLogic();