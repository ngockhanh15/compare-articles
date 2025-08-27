const mongoose = require('mongoose');
const documentAVLService = require('../services/DocumentAVLService');
const Document = require('../models/Document');
const TokenizedWord = require('../models/TokenizedWord');
const path = require('path');

// Load .env from be directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testFullRemoval() {
  try {
    console.log('🧪 Testing Full Document Removal Process...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Initialize DocumentAVLService
    console.log('\n🔧 Initializing DocumentAVLService...');
    await documentAVLService.initialize();
    
    const initialStats = documentAVLService.getTreeStats();
    console.log('Initial tree stats:', {
      totalDocuments: initialStats.totalDocuments,
      totalNodes: initialStats.totalNodes,
      treeHeight: initialStats.treeHeight
    });

    // Get a document from tree memory
    const docInfoKeys = Array.from(documentAVLService.docInfo.keys());
    if (docInfoKeys.length === 0) {
      console.log('❌ No documents found in tree memory');
      return;
    }

    const docId = docInfoKeys[0];
    const docInfo = documentAVLService.docInfo.get(docId);
    console.log(`\n📄 Testing with document: "${docInfo.title}" (ID: ${docId})`);

    // Check initial state
    console.log('\n📊 Initial state:');
    console.log(`- Document in memory: ${documentAVLService.docInfo.has(docId)}`);
    
    const tokensBefore = await TokenizedWord.countDocuments({ documentId: docId });
    console.log(`- Tokenized words in database: ${tokensBefore}`);
    
    const nodesBefore = documentAVLService.documentTree.getAllNodes().filter(
      node => node.documents.has(docId)
    ).length;
    console.log(`- Nodes containing document: ${nodesBefore}`);

    // Remove document using DocumentAVLService
    console.log('\n🗑️ Removing document using DocumentAVLService.removeDocumentFromTree()...');
    await documentAVLService.removeDocumentFromTree(docId);

    // Check final state
    console.log('\n📊 Final state:');
    const finalStats = documentAVLService.getTreeStats();
    console.log('Tree stats after removal:', {
      totalDocuments: finalStats.totalDocuments,
      totalNodes: finalStats.totalNodes,
      treeHeight: finalStats.treeHeight,
      emptyNodes: documentAVLService.documentTree.getEmptyNodesCount()
    });

    console.log(`- Document in memory: ${documentAVLService.docInfo.has(docId)}`);
    
    const tokensAfter = await TokenizedWord.countDocuments({ documentId: docId });
    console.log(`- Tokenized words in database: ${tokensAfter}`);
    
    const nodesAfter = documentAVLService.documentTree.getAllNodes().filter(
      node => node.documents.has(docId)
    ).length;
    console.log(`- Nodes containing document: ${nodesAfter}`);

    // Verification
    console.log('\n✅ Verification Results:');
    const memoryCleared = !documentAVLService.docInfo.has(docId);
    const tokensCleared = tokensAfter === 0;
    const nodesCleared = nodesAfter === 0;
    const documentsReduced = finalStats.totalDocuments === (initialStats.totalDocuments - 1);

    console.log(`✅ Memory cleared: ${memoryCleared}`);
    console.log(`✅ Tokens cleared: ${tokensCleared} (${tokensBefore} → ${tokensAfter})`);
    console.log(`✅ Nodes cleared: ${nodesCleared} (${nodesBefore} → ${nodesAfter})`);
    console.log(`✅ Document count reduced: ${documentsReduced} (${initialStats.totalDocuments} → ${finalStats.totalDocuments})`);

    if (memoryCleared && tokensCleared && nodesCleared && documentsReduced) {
      console.log('\n🎉 FULL REMOVAL SUCCESS! All data cleaned up properly.');
    } else {
      console.log('\n⚠️ PARTIAL REMOVAL - Some data may still remain.');
    }

    // Test tree functionality
    console.log('\n🧪 Testing tree functionality after removal...');
    const testText = "This is a test sentence for checking tree functionality.";
    const duplicateResult = await documentAVLService.checkDuplicateContent(testText, {
      minSimilarity: 10,
      maxResults: 5
    });
    
    console.log(`Tree still functional: ${duplicateResult.matches.length} matches found`);
    console.log(`Duplicate percentage: ${duplicateResult.duplicatePercentage}%`);

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run test if called directly
if (require.main === module) {
  testFullRemoval()
    .then(() => {
      console.log('\n🎉 Full removal test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Full removal test failed:', error);
      process.exit(1);
    });
}

module.exports = testFullRemoval;