const mongoose = require('mongoose');
const documentAVLService = require('../services/DocumentAVLService');
const Document = require('../models/Document');
const path = require('path');

// Load .env from be directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testPartialCleanup() {
  try {
    console.log('🧪 Testing Partial Node Cleanup (Multiple Documents)...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Create test documents
    console.log('\n📝 Creating test documents...');
    
    const doc1 = new Document({
      title: 'Test Document 1',
      extractedText: 'This is the first test document with some unique content.',
      status: 'processed'
    });
    
    const doc2 = new Document({
      title: 'Test Document 2', 
      extractedText: 'This is the second test document with different content and some shared words.',
      status: 'processed'
    });

    await doc1.save();
    await doc2.save();
    
    console.log(`📄 Created doc1: "${doc1.title}" (ID: ${doc1._id})`);
    console.log(`📄 Created doc2: "${doc2.title}" (ID: ${doc2._id})`);

    // Initialize DocumentAVLService
    console.log('\n🔧 Initializing DocumentAVLService...');
    await documentAVLService.initialize();
    
    // Add both documents to tree
    console.log('\n➕ Adding documents to tree...');
    await documentAVLService.addDocumentToTree(doc1);
    await documentAVLService.addDocumentToTree(doc2);
    
    const initialStats = documentAVLService.getTreeStats();
    console.log('\n📊 BEFORE removal (with 2 documents):', {
      totalDocuments: initialStats.totalDocuments,
      totalNodes: initialStats.totalNodes,
      treeHeight: initialStats.treeHeight,
      emptyNodes: documentAVLService.documentTree.getEmptyNodesCount()
    });

    // Check nodes containing each document
    const allNodes = documentAVLService.documentTree.getAllNodes();
    const nodesWithDoc1 = allNodes.filter(node => node.documents.has(String(doc1._id))).length;
    const nodesWithDoc2 = allNodes.filter(node => node.documents.has(String(doc2._id))).length;
    const nodesWithBoth = allNodes.filter(node => 
      node.documents.has(String(doc1._id)) && node.documents.has(String(doc2._id))
    ).length;
    
    console.log(`📊 Nodes with doc1: ${nodesWithDoc1}`);
    console.log(`📊 Nodes with doc2: ${nodesWithDoc2}`);
    console.log(`📊 Nodes with both: ${nodesWithBoth}`);

    // Remove only doc1
    console.log('\n🗑️ Removing doc1 (keeping doc2)...');
    await documentAVLService.removeDocumentFromTree(doc1._id);

    // Check final state
    const finalStats = documentAVLService.getTreeStats();
    console.log('\n📊 AFTER removing doc1:', {
      totalDocuments: finalStats.totalDocuments,
      totalNodes: finalStats.totalNodes,
      treeHeight: finalStats.treeHeight,
      emptyNodes: documentAVLService.documentTree.getEmptyNodesCount()
    });

    // Check remaining nodes
    const finalNodes = documentAVLService.documentTree.getAllNodes();
    const finalNodesWithDoc1 = finalNodes.filter(node => node.documents.has(String(doc1._id))).length;
    const finalNodesWithDoc2 = finalNodes.filter(node => node.documents.has(String(doc2._id))).length;
    const nodesWithDocs = finalNodes.filter(node => node.documents.size > 0).length;
    const emptyNodes = finalNodes.filter(node => node.documents.size === 0).length;
    
    console.log(`📊 Nodes with doc1 after removal: ${finalNodesWithDoc1}`);
    console.log(`📊 Nodes with doc2 after removal: ${finalNodesWithDoc2}`);
    console.log(`📊 Nodes with documents: ${nodesWithDocs}`);
    console.log(`📊 Empty nodes: ${emptyNodes}`);

    // Calculate efficiency
    const nodeReduction = initialStats.totalNodes - finalStats.totalNodes;
    const efficiency = finalStats.totalNodes > 0 ? (nodesWithDocs / finalStats.totalNodes) * 100 : 100;

    console.log('\n✅ Partial Cleanup Results:');
    console.log(`🗑️ Nodes removed: ${nodeReduction} (${initialStats.totalNodes} → ${finalStats.totalNodes})`);
    console.log(`📦 Empty nodes remaining: ${emptyNodes}`);
    console.log(`📏 Tree height: ${initialStats.treeHeight} → ${finalStats.treeHeight}`);
    console.log(`⚡ Tree efficiency: ${efficiency.toFixed(1)}%`);

    if (finalNodesWithDoc1 === 0 && finalNodesWithDoc2 > 0) {
      console.log('🎉 SUCCESS: Doc1 completely removed, Doc2 preserved!');
    } else {
      console.log('⚠️ WARNING: Cleanup may not have worked correctly');
    }

    // Test functionality with remaining document
    console.log('\n🧪 Testing tree functionality with remaining document...');
    const testResult = await documentAVLService.checkDuplicateContent(
      'second test document', 
      { minSimilarity: 10, maxResults: 5 }
    );
    
    console.log(`Matches found: ${testResult.matches.length}`);
    if (testResult.matches.length > 0) {
      console.log('✅ Tree still functional with remaining document');
    }

    // Cleanup test documents
    console.log('\n🧹 Cleaning up test documents...');
    await Document.deleteOne({ _id: doc1._id });
    await Document.deleteOne({ _id: doc2._id });
    console.log('✅ Test documents cleaned up');

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run test if called directly
if (require.main === module) {
  testPartialCleanup()
    .then(() => {
      console.log('\n🎉 Partial cleanup test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Partial cleanup test failed:', error);
      process.exit(1);
    });
}

module.exports = testPartialCleanup;