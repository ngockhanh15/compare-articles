const { TreeAVL, TextHasher } = require('./utils/TreeAVL');

// Mock DocumentAVLService class for testing
class MockDocumentAVLService {
  constructor() {
    this.documentTree = new TreeAVL();
    this.initialized = false;
  }

  async addDocumentToTree(document) {
    const wordHashes = TextHasher.createWordHashes(document.extractedText, false);
    console.log(`Adding document "${document.title}" with ${wordHashes.length} word hashes`);

    const documentData = {
      documentId: document._id,
      title: document.title,
      fileType: document.fileType,
      createdAt: document.createdAt,
      uploadedBy: document.uploadedBy,
      textLength: document.extractedText.length,
      wordCount: document.extractedText.split(/\s+/).length,
      wordHashes: wordHashes,
      fullText: document.extractedText,
      sortKey: `${document.title}-${document._id}`
    };

    // Insert each word hash into tree (this creates the duplication issue)
    for (const wordHash of wordHashes) {
      this.documentTree.insert(wordHash.hash, documentData);
    }

    console.log(`AVL tree size after adding: ${this.documentTree.getSize()}`);
  }

  async checkDuplicateContent(text, options = {}) {
    const { minSimilarity = 50, maxResults = 10 } = options;
    
    console.log(`\n🔍 Checking duplicate content with minSimilarity: ${minSimilarity}%`);
    console.log(`📝 Input text: "${text.substring(0, 100)}..."`);

    // Generate word hashes from input text
    const inputHashes = TextHasher.createWordHashes(text, false);
    console.log(`🔢 Generated ${inputHashes.length} word hashes from input text`);

    // FIXED VERSION: Use Map to prevent duplicates
    const documentMatches = new Map();
    let totalSearches = 0;

    for (const wordHash of inputHashes) {
      totalSearches++;
      const foundNode = this.documentTree.search(wordHash.hash);
      
      if (foundNode) {
        const docData = foundNode.data;
        const documentId = docData.documentId.toString();
        
        console.log(`✅ Word hash match found: "${wordHash.word}" in document: ${docData.title}`);
        
        if (!documentMatches.has(documentId)) {
          documentMatches.set(documentId, {
            documentData: docData,
            matchedHashes: 0,
            totalInputHashes: inputHashes.length,
            matchedWords: [],
            matchedWordSet: new Set()
          });
        }
        
        const matchData = documentMatches.get(documentId);
        
        // Only count unique words to avoid inflating the match count
        if (!matchData.matchedWordSet.has(wordHash.word)) {
          matchData.matchedHashes++;
          matchData.matchedWords.push(wordHash.word);
          matchData.matchedWordSet.add(wordHash.word);
        }
      }
    }

    console.log(`🔍 Searched ${totalSearches} hashes, found matches in ${documentMatches.size} documents`);

    // Process results
    const matches = [];
    const processedDocuments = new Set();
    
    for (const [documentId, matchData] of documentMatches) {
      const { documentData, matchedHashes, totalInputHashes, matchedWords } = matchData;
      
      // Skip if document already processed (additional safety check)
      if (processedDocuments.has(documentId)) {
        console.log(`⚠️ Skipping duplicate document: ${documentData.title} (ID: ${documentId})`);
        continue;
      }
      
      // Calculate plagiarism ratio
      const plagiarismRatio = Math.round((matchedHashes / totalInputHashes) * 100);
      
      console.log(`📊 Document "${documentData.title}": ${matchedHashes}/${totalInputHashes} unique word hashes matched = ${plagiarismRatio}%`);
      
      if (plagiarismRatio >= minSimilarity) {
        console.log(`✅ Document "${documentData.title}" exceeds threshold (${plagiarismRatio}% >= ${minSimilarity}%)`);
        
        matches.push({
          documentId: documentData.documentId,
          title: documentData.title,
          fileType: documentData.fileType,
          createdAt: documentData.createdAt,
          similarity: plagiarismRatio,
          matchedHashes: matchedHashes,
          totalHashes: totalInputHashes,
          matchedWords: matchedWords,
          method: 'avl-word-hash-based',
          source: 'document-avl-tree'
        });
        
        processedDocuments.add(documentId);
      }
    }

    // Sort by similarity
    matches.sort((a, b) => b.similarity - a.similarity);
    
    console.log(`📋 Final results: ${matches.length} unique documents with similarity >= ${minSimilarity}%`);
    
    if (matches.length > 0) {
      console.log('📄 Final matches summary:');
      matches.forEach((match, index) => {
        console.log(`   ${index + 1}. ${match.title} - ${match.similarity}% (${match.matchedHashes} words)`);
      });
    }

    // Calculate overall duplicate percentage
    const duplicatePercentage = matches.length > 0 ? matches[0].similarity : 0;

    return {
      duplicatePercentage,
      matches,
      sources: matches.map(m => m.source),
      totalMatches: matches.length,
      checkedDocuments: documentMatches.size,
      totalDocumentsInSystem: documentMatches.size
    };
  }
}

async function testCompleteFix() {
  try {
    console.log('🧪 Testing complete duplicate fix...\n');

    const service = new MockDocumentAVLService();

    // Add multiple test documents
    const documents = [
      {
        _id: 'doc1',
        title: 'AI Research Paper',
        fileType: 'pdf',
        createdAt: new Date(),
        uploadedBy: 'user1',
        extractedText: 'Artificial intelligence and machine learning are transforming modern technology. Neural networks and deep learning algorithms are being used in various applications including natural language processing and computer vision.'
      },
      {
        _id: 'doc2', 
        title: 'Machine Learning Guide',
        fileType: 'docx',
        createdAt: new Date(),
        uploadedBy: 'user2',
        extractedText: 'Machine learning algorithms include supervised learning, unsupervised learning, and reinforcement learning. These techniques are applied in data science and predictive analytics.'
      }
    ];

    console.log('1. Adding test documents to AVL tree...');
    for (const doc of documents) {
      await service.addDocumentToTree(doc);
    }

    console.log(`\nTotal AVL tree size: ${service.documentTree.getSize()} entries`);
    console.log(`Expected: Sum of word hashes from all documents\n`);

    // Test with text that should match both documents
    const testText = 'This paper discusses artificial intelligence and machine learning algorithms used in neural networks and supervised learning applications.';
    
    console.log('2. Testing with text that matches both documents...');
    const result = await service.checkDuplicateContent(testText, {
      minSimilarity: 10, // Low threshold to see all matches
      maxResults: 20
    });

    console.log('\n3. Final Results Analysis:');
    console.log(`   Duplicate percentage: ${result.duplicatePercentage}%`);
    console.log(`   Total matches: ${result.totalMatches}`);
    console.log(`   Checked documents: ${result.checkedDocuments}`);

    // Verify no duplicates
    if (result.matches && result.matches.length > 0) {
      const documentIds = result.matches.map(m => m.documentId.toString());
      const uniqueDocumentIds = [...new Set(documentIds)];
      
      console.log(`\n4. Duplicate Verification:`);
      console.log(`   Total matches returned: ${result.matches.length}`);
      console.log(`   Unique document IDs: ${uniqueDocumentIds.length}`);
      
      if (documentIds.length === uniqueDocumentIds.length) {
        console.log(`   ✅ SUCCESS: No duplicate documents in results!`);
      } else {
        console.log(`   ❌ FAILED: Found ${documentIds.length - uniqueDocumentIds.length} duplicate entries`);
      }

      // Show all matches
      result.matches.forEach((match, index) => {
        console.log(`   ${index + 1}. ${match.title} (${match.documentId}) - ${match.similarity}%`);
      });
    }

    console.log('\n🎉 Complete fix test finished!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCompleteFix();