const mongoose = require('mongoose');
const Document = require('./models/Document');
const documentAVLService = require('./services/DocumentAVLService');
const vietnameseStopwordService = require('./services/VietnameseStopwordService');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/filter_word');

async function reindexDocuments() {
  try {
    console.log('🚀 Starting document re-indexing...\n');

    // Initialize services
    await vietnameseStopwordService.initialize();
    console.log('✅ Vietnamese Stopword Service initialized');

    // Clear existing AVL tree
    documentAVLService.documentTree.clear();
    documentAVLService.initialized = false;
    console.log('🗑️ Cleared existing AVL tree');

    // Get all processed documents
    const documents = await Document.find({ 
      status: 'processed',
      extractedText: { $exists: true, $ne: '' }
    }).select('_id title fileType extractedText createdAt uploadedBy');

    console.log(`📚 Found ${documents.length} documents to re-index\n`);

    if (documents.length === 0) {
      console.log('❌ No documents found in database');
      return;
    }

    // Re-index each document
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      console.log(`📄 Processing document ${i + 1}/${documents.length}: "${doc.title}"`);
      
      try {
        // Add to AVL tree with new logic
        await documentAVLService.addDocumentToTreeOnly(doc);
        console.log(`✅ Added "${doc.title}" to AVL tree`);
      } catch (error) {
        console.error(`❌ Error processing "${doc.title}":`, error.message);
      }
    }

    documentAVLService.initialized = true;
    console.log(`\n🎉 Re-indexing completed! AVL tree now contains ${documentAVLService.documentTree.getSize()} word hashes`);

    // Test with your specific example
    console.log('\n' + '='.repeat(60));
    console.log('🧪 Testing with your specific example...\n');

    const testText = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt.";
    console.log('📝 Test text:', testText);

    const result = await documentAVLService.checkDuplicateContent(testText, {
      minSimilarity: 1, // Very low threshold to catch any matches
      maxResults: 10
    });

    console.log('\n📊 Results:');
    console.log(`- Duplicate Percentage: ${result.duplicatePercentage}%`);
    console.log(`- Total Matches: ${result.totalMatches}`);
    console.log(`- Total Input Hashes: ${result.totalInputHashes}`);

    if (result.matches && result.matches.length > 0) {
      console.log('\n🔍 Found Matches:');
      result.matches.forEach((match, index) => {
        console.log(`\n${index + 1}. Document: "${match.title}"`);
        console.log(`   - Similarity: ${match.similarity}%`);
        console.log(`   - Matched Hashes: ${match.matchedHashes}/${match.totalHashes}`);
        if (match.matchedWords && match.matchedWords.length > 0) {
          console.log(`   - Matched Words: ${match.matchedWords.join(', ')}`);
        }
      });
    } else {
      console.log('\n❌ No matches found');
    }

  } catch (error) {
    console.error('❌ Re-indexing failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the re-indexing
reindexDocuments();