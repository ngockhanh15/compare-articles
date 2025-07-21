const documentAVLService = require('./services/DocumentAVLService');
const { TextHasher } = require('./utils/TreeAVL');

async function testDuplicateFix() {
  try {
    console.log('🧪 Testing duplicate document fix...\n');

    // Use the singleton DocumentAVLService instance
    // Clear any existing data first
    documentAVLService.documentTree.clear();
    
    // Mock document data
    const mockDocument = {
      _id: 'doc123',
      title: 'Test Document',
      fileType: 'txt',
      createdAt: new Date(),
      uploadedBy: 'user123',
      extractedText: 'This is a test document with some sample text for plagiarism checking. It contains various words and phrases that can be used to test the system.'
    };

    console.log('1. Adding mock document to AVL tree...');
    
    // Add document to tree manually (simulate the process)
    const wordHashes = TextHasher.createWordHashes(mockDocument.extractedText, false); // Use legacy method for testing
    console.log(`   Generated ${wordHashes.length} word hashes`);

    const documentData = {
      documentId: mockDocument._id,
      title: mockDocument.title,
      fileType: mockDocument.fileType,
      createdAt: mockDocument.createdAt,
      uploadedBy: mockDocument.uploadedBy,
      textLength: mockDocument.extractedText.length,
      wordCount: mockDocument.extractedText.split(/\s+/).length,
      wordHashes: wordHashes,
      fullText: mockDocument.extractedText,
      sortKey: 'test-key'
    };

    // Insert each word hash into tree (this is where the duplication happens)
    for (const wordHash of wordHashes) {
      documentAVLService.documentTree.insert(wordHash.hash, documentData);
    }
    
    console.log(`   AVL tree size: ${documentAVLService.documentTree.getSize()} entries`);
    console.log(`   Expected: ${wordHashes.length} entries for 1 document\n`);

    // Test with sample text that should match
    console.log('2. Testing with matching text...');
    const testText = 'This is a test document with sample text for checking';
    console.log(`   Test text: "${testText}"`);

    // Manually simulate the checkDuplicateContent process
    const inputHashes = TextHasher.createWordHashes(testText, false);
    console.log(`   Generated ${inputHashes.length} input hashes`);

    // OLD WAY (problematic): Count all matches
    console.log('\n3. OLD WAY (problematic) - Count all matches:');
    let oldWayMatches = [];
    for (const wordHash of inputHashes) {
      const foundNode = documentAVLService.documentTree.search(wordHash.hash);
      if (foundNode) {
        oldWayMatches.push({
          documentId: foundNode.data.documentId,
          title: foundNode.data.title,
          word: wordHash.word
        });
      }
    }
    console.log(`   Total matches found: ${oldWayMatches.length}`);
    console.log(`   Unique documents: ${new Set(oldWayMatches.map(m => m.documentId)).size}`);

    // NEW WAY (fixed): Use Map to deduplicate
    console.log('\n4. NEW WAY (fixed) - Use Map to deduplicate:');
    const documentMatches = new Map();
    
    for (const wordHash of inputHashes) {
      const foundNode = documentAVLService.documentTree.search(wordHash.hash);
      if (foundNode) {
        const docData = foundNode.data;
        const documentId = docData.documentId.toString();
        
        if (!documentMatches.has(documentId)) {
          documentMatches.set(documentId, {
            documentData: docData,
            matchedHashes: 0,
            matchedWords: [],
            matchedWordSet: new Set()
          });
        }
        
        const matchData = documentMatches.get(documentId);
        if (!matchData.matchedWordSet.has(wordHash.word)) {
          matchData.matchedHashes++;
          matchData.matchedWords.push(wordHash.word);
          matchData.matchedWordSet.add(wordHash.word);
        }
      }
    }

    console.log(`   Unique documents found: ${documentMatches.size}`);
    
    for (const [documentId, matchData] of documentMatches) {
      const similarity = Math.round((matchData.matchedHashes / inputHashes.length) * 100);
      console.log(`   Document: ${matchData.documentData.title}`);
      console.log(`   Matched words: ${matchData.matchedHashes}/${inputHashes.length} (${similarity}%)`);
      console.log(`   Words: ${matchData.matchedWords.join(', ')}`);
    }

    console.log('\n✅ Test completed! The fix should prevent duplicate documents in results.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDuplicateFix();