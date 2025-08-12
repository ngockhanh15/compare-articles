const mongoose = require('mongoose');
const documentAVLService = require('../services/DocumentAVLService');
const TokenizedWord = require('../models/TokenizedWord');
const Document = require('../models/Document');
require('dotenv').config();

async function testTokenizedWordsStorage() {
  try {
    console.log('🧪 Testing Tokenized Words Storage...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plagiarism_checker', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Clear existing tokenized words for clean test
    console.log('🗑️  Step 1: Clear existing tokenized words');
    const deletedCount = await TokenizedWord.deleteMany({});
    console.log(`Deleted ${deletedCount.deletedCount} existing tokenized word records\n`);

    // Step 2: Initialize DocumentAVLService (sẽ lưu tokenized words)
    console.log('🚀 Step 2: Initialize DocumentAVLService');
    await documentAVLService.initialize();
    
    const stats = documentAVLService.getTreeStats();
    console.log('Tree stats:', {
      totalDocuments: stats.totalDocuments,
      totalNodes: stats.totalNodes,
      totalSentences: stats.totalSentences
    });

    // Step 3: Check tokenized words in database
    console.log('\n📊 Step 3: Check tokenized words in database');
    const tokenStats = await TokenizedWord.getTokenStats();
    console.log('Token stats:', tokenStats[0] || 'No data');

    const allTokenRecords = await TokenizedWord.find().sort({ createdAt: 1 });
    console.log(`\nFound ${allTokenRecords.length} tokenized word records:`);

    // Display detailed information for each record
    for (let i = 0; i < Math.min(allTokenRecords.length, 3); i++) {
      const record = allTokenRecords[i];
      console.log(`\n📝 Record ${i + 1}:`);
      console.log(`  Document ID: ${record.documentId}`);
      console.log(`  Sentence Index: ${record.sentenceIndex}`);
      console.log(`  Original Text: "${record.originalText}"`);
      console.log(`  Tokenized Words (${record.tokenizedWords.length}):`);
      
      record.tokenizedWords.forEach((token, idx) => {
        console.log(`    ${idx + 1}. "${token.word}" (hash: ${token.hash}${token.isPreservedPhrase ? ', preserved phrase' : ''}${token.isStopword ? ', stopword' : ''})`);
      });
      
      console.log(`  Metadata:`);
      console.log(`    Total words: ${record.metadata.totalWords}`);
      console.log(`    Unique words: ${record.metadata.uniqueWords}`);
      console.log(`    Preserved phrases: ${record.metadata.preservedPhrases}`);
      console.log(`    Filtered stopwords: ${record.metadata.filteredStopwords}`);
    }

    // Step 4: Test search functions
    console.log('\n🔍 Step 4: Test search functions');
    
    if (allTokenRecords.length > 0) {
      // Find documents containing a specific word
      const firstToken = allTokenRecords[0].tokenizedWords[0];
      if (firstToken) {
        console.log(`\nSearching for documents containing word: "${firstToken.word}"`);
        const docsWithWord = await TokenizedWord.findDocumentsWithWord(firstToken.word);
        console.log(`Found in ${docsWithWord.length} documents:`, docsWithWord);
      }

      // Get tokens by document
      const firstDocId = allTokenRecords[0].documentId;
      console.log(`\nGetting all tokens for document: ${firstDocId}`);
      const docTokens = await TokenizedWord.getTokensByDocument(firstDocId);
      console.log(`Found ${docTokens.length} token records for this document`);
      
      if (docTokens.length > 0) {
        const totalTokens = docTokens.reduce((sum, record) => sum + record.tokenizedWords.length, 0);
        console.log(`Total individual tokens: ${totalTokens}`);
      }
    }

    // Step 5: Test adding a new document and verify tokens are saved
    console.log('\n➕ Step 5: Test adding new document');
    
    // Get a sample document to re-process
    const sampleDoc = await Document.findOne({ status: 'processed' });
    if (sampleDoc) {
      console.log(`\nRe-processing document: "${sampleDoc.title}"`);
      
      // Count tokens before
      const tokensBefore = await TokenizedWord.countDocuments({ documentId: String(sampleDoc._id) });
      console.log(`Tokens before re-processing: ${tokensBefore}`);
      
      // Re-index document (should save new tokens)
      const result = await documentAVLService.indexDocument(sampleDoc);
      console.log(`Re-indexed: ${result.sentenceCount} sentences, ${result.uniqueTokenCount} unique tokens`);
      
      // Count tokens after
      const tokensAfter = await TokenizedWord.countDocuments({ documentId: String(sampleDoc._id) });
      console.log(`Tokens after re-processing: ${tokensAfter}`);
    }

    // Step 6: Final statistics
    console.log('\n📈 Step 6: Final statistics');
    const finalStats = await TokenizedWord.getTokenStats();
    console.log('Final token stats:', finalStats[0] || 'No data');

    const wordDistribution = await TokenizedWord.aggregate([
      { $unwind: '$tokenizedWords' },
      { $group: { _id: '$tokenizedWords.word', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    console.log('\nTop 10 most frequent words:');
    wordDistribution.forEach((item, idx) => {
      console.log(`  ${idx + 1}. "${item._id}" (${item.count} times)`);
    });

    console.log('\n✅ Tokenized words storage test completed successfully!');

  } catch (error) {
    console.error('❌ Error in tokenized words storage test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📤 Disconnected from MongoDB');
  }
}

// Run test if called directly
if (require.main === module) {
  testTokenizedWordsStorage()
    .then(() => {
      console.log('\n🎉 Test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = testTokenizedWordsStorage;
