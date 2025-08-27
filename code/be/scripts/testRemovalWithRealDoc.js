const mongoose = require('mongoose');
const documentAVLService = require('../services/DocumentAVLService');
const Document = require('../models/Document');
const TokenizedWord = require('../models/TokenizedWord');
const path = require('path');

// Load .env from be directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testRemovalWithRealDoc() {
  try {
    console.log('🧪 Testing Document Removal with Real Document...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get a real document from database
    const realDoc = await Document.findOne({ status: 'processed' });
    if (!realDoc) {
      console.log('❌ No processed documents found in database');
      return;
    }

    console.log(`📄 Found document: "${realDoc.title}" (ID: ${realDoc._id})`);

    // Initialize DocumentAVLService (this will rebuild from documents)
    console.log('\n🔧 Initializing DocumentAVLService...');
    await documentAVLService.initialize();
    
    const initialStats = documentAVLService.getTreeStats();
    console.log('Initial tree stats:', {
      totalDocuments: initialStats.totalDocuments,
      totalNodes: initialStats.totalNodes,
      treeHeight: initialStats.treeHeight
    });

    // Check if document is in tree
    const docInMemory = documentAVLService.docInfo.has(String(realDoc._id));
    console.log(`Document in tree memory: ${docInMemory}`);

    if (!docInMemory) {
      console.log('Document not in tree, adding it...');
      await documentAVLService.addDocumentToTree(realDoc);
      
      const afterAddStats = documentAVLService.getTreeStats();
      console.log('Stats after adding:', {
        totalDocuments: afterAddStats.totalDocuments,
        totalNodes: afterAddStats.totalNodes,
        treeHeight: afterAddStats.treeHeight
      });
    }

    // Check initial state
    console.log('\n📊 Initial state:');
    console.log(`- Document in memory: ${documentAVLService.docInfo.has(String(realDoc._id))}`);
    
    const tokensBefore = await TokenizedWord.countDocuments({ documentId: String(realDoc._id) });
    console.log(`- Tokenized words in database: ${tokensBefore}`);
    
    const nodesBefore = documentAVLService.documentTree.getAllNodes().filter(
      node => node.documents.has(String(realDoc._id))
    ).length;
    console.log(`- Nodes containing document: ${nodesBefore}`);

    // Remove document using DocumentAVLService
    console.log('\n🗑️ Removing document using DocumentAVLService.removeDocumentFromTree()...');
    await documentAVLService.removeDocumentFromTree(realDoc._id);

    // Check final state
    console.log('\n📊 Final state:');
    const finalStats = documentAVLService.getTreeStats();
    console.log('Tree stats after removal:', {
      totalDocuments: finalStats.totalDocuments,
      totalNodes: finalStats.totalNodes,
      treeHeight: finalStats.treeHeight,
      emptyNodes: documentAVLService.documentTree.getEmptyNodesCount()
    });

    console.log(`- Document in memory: ${documentAVLService.docInfo.has(String(realDoc._id))}`);
    
    const tokensAfter = await TokenizedWord.countDocuments({ documentId: String(realDoc._id) });
    console.log(`- Tokenized words in database: ${tokensAfter}`);
    
    const nodesAfter = documentAVLService.documentTree.getAllNodes().filter(
      node => node.documents.has(String(realDoc._id))
    ).length;
    console.log(`- Nodes containing document: ${nodesAfter}`);

    // Verification
    console.log('\n✅ Verification Results:');
    const memoryCleared = !documentAVLService.docInfo.has(String(realDoc._id));
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

    // Test with document's own content
    if (realDoc.extractedText) {
      console.log('\n🧪 Testing with document\'s own content...');
      const ownContentResult = await documentAVLService.checkDuplicateContent(
        realDoc.extractedText.substring(0, 100), // First 100 chars
        { minSimilarity: 10, maxResults: 5 }
      );
      
      console.log(`Matches with own content: ${ownContentResult.matches.length}`);
      console.log(`Should be 0 since document was removed: ${ownContentResult.matches.length === 0 ? '✅ PASS' : '❌ FAIL'}`);
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run test if called directly
if (require.main === module) {
  testRemovalWithRealDoc()
    .then(() => {
      console.log('\n🎉 Real document removal test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Real document removal test failed:', error);
      process.exit(1);
    });
}

module.exports = testRemovalWithRealDoc;