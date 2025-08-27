const mongoose = require('mongoose');
const documentAVLService = require('../services/DocumentAVLService');
const Document = require('../models/Document');
const path = require('path');

// Load .env from be directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testNodeCleanup() {
  try {
    console.log('🧪 Testing Node Cleanup After Document Removal...\n');

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

    // Initialize DocumentAVLService
    console.log('\n🔧 Initializing DocumentAVLService...');
    await documentAVLService.initialize();
    
    const initialStats = documentAVLService.getTreeStats();
    console.log('📊 BEFORE removal:', {
      totalDocuments: initialStats.totalDocuments,
      totalNodes: initialStats.totalNodes,
      treeHeight: initialStats.treeHeight,
      emptyNodes: documentAVLService.documentTree.getEmptyNodesCount()
    });

    // Check nodes containing this document
    const nodesBefore = documentAVLService.documentTree.getAllNodes().filter(
      node => node.documents.has(String(realDoc._id))
    ).length;
    console.log(`📊 Nodes containing document BEFORE: ${nodesBefore}`);

    // Remove document
    console.log('\n🗑️ Removing document with node cleanup...');
    await documentAVLService.removeDocumentFromTree(realDoc._id);

    // Check final state
    const finalStats = documentAVLService.getTreeStats();
    console.log('\n📊 AFTER removal:', {
      totalDocuments: finalStats.totalDocuments,
      totalNodes: finalStats.totalNodes,
      treeHeight: finalStats.treeHeight,
      emptyNodes: documentAVLService.documentTree.getEmptyNodesCount()
    });

    const nodesAfter = documentAVLService.documentTree.getAllNodes().filter(
      node => node.documents.has(String(realDoc._id))
    ).length;
    console.log(`📊 Nodes containing document AFTER: ${nodesAfter}`);

    // Calculate reduction
    const nodeReduction = initialStats.totalNodes - finalStats.totalNodes;
    const emptyNodeReduction = documentAVLService.documentTree.getEmptyNodesCount();

    console.log('\n✅ Cleanup Results:');
    console.log(`🗑️ Nodes removed: ${nodeReduction} (${initialStats.totalNodes} → ${finalStats.totalNodes})`);
    console.log(`📦 Empty nodes remaining: ${emptyNodeReduction}`);
    console.log(`📏 Tree height: ${initialStats.treeHeight} → ${finalStats.treeHeight}`);

    if (nodeReduction > 0) {
      console.log('🎉 SUCCESS: Empty nodes were cleaned up!');
    } else if (emptyNodeReduction === 0) {
      console.log('🎉 SUCCESS: No empty nodes remaining!');
    } else {
      console.log('⚠️ WARNING: Some empty nodes still remain');
    }

    // Test tree functionality
    console.log('\n🧪 Testing tree functionality after cleanup...');
    const testText = "This is a test sentence for checking tree functionality.";
    const duplicateResult = await documentAVLService.checkDuplicateContent(testText, {
      minSimilarity: 10,
      maxResults: 5
    });
    
    console.log(`Tree still functional: ${duplicateResult.matches.length} matches found`);

    // Show tree structure summary
    console.log('\n📊 Final Tree Structure:');
    const allNodes = documentAVLService.documentTree.getAllNodes();
    const nodesWithDocs = allNodes.filter(node => node.documents.size > 0);
    const emptyNodes = allNodes.filter(node => node.documents.size === 0);
    
    console.log(`- Total nodes: ${allNodes.length}`);
    console.log(`- Nodes with documents: ${nodesWithDocs.length}`);
    console.log(`- Empty nodes: ${emptyNodes.length}`);
    console.log(`- Tree efficiency: ${((nodesWithDocs.length / allNodes.length) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run test if called directly
if (require.main === module) {
  testNodeCleanup()
    .then(() => {
      console.log('\n🎉 Node cleanup test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Node cleanup test failed:', error);
      process.exit(1);
    });
}

module.exports = testNodeCleanup;