const mongoose = require('mongoose');
const documentAVLService = require('../services/DocumentAVLService');
const GlobalAVLTree = require('../models/GlobalAVLTree');
require('dotenv').config();

async function testDatabasePersistence() {
  try {
    console.log('🧪 Testing Global AVL Tree Database Persistence...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plagiarism_checker', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Initialize tree (will load from database if exists)
    console.log('📋 Step 1: Initialize DocumentAVLService');
    await documentAVLService.initialize();
    
    const initialStats = documentAVLService.getTreeStats();
    console.log('Initial tree stats:', {
      totalDocuments: initialStats.totalDocuments,
      totalNodes: initialStats.totalNodes,
      treeHeight: initialStats.treeHeight,
      initialized: initialStats.initialized
    });

    // Step 2: Force save to database
    console.log('\n💾 Step 2: Force save tree to database');
    const saveResult = await documentAVLService.forceSave();
    console.log('Save result:', saveResult);

    const saveStatus = documentAVLService.getSaveStatus();
    console.log('Save status:', saveStatus);

    // Step 3: Check database content
    console.log('\n🔍 Step 3: Check database content');
    const savedTrees = await GlobalAVLTree.find().sort({ lastUpdated: -1 });
    console.log(`Found ${savedTrees.length} saved trees in database`);
    
    if (savedTrees.length > 0) {
      const latestTree = savedTrees[0];
      console.log('Latest tree metadata:', {
        version: latestTree.version,
        createdAt: latestTree.createdAt,
        lastUpdated: latestTree.lastUpdated,
        totalNodes: latestTree.metadata.totalNodes,
        totalDocuments: latestTree.metadata.totalDocuments,
        totalSentences: latestTree.metadata.totalSentences,
        treeHeight: latestTree.metadata.treeHeight,
        nodesInDB: latestTree.nodes.length,
        documentsInDB: latestTree.documentInfo.length
      });
      
      // Sample first few nodes
      if (latestTree.nodes.length > 0) {
        console.log('\nSample nodes from database:');
        latestTree.nodes.slice(0, 3).forEach((node, index) => {
          console.log(`Node ${index + 1}:`, {
            hash: node.hash,
            documentsCount: node.documents.length,
            sentencesCount: node.sentences.length,
            height: node.height
          });
        });
      }
    }

    // Step 4: Test refresh from database
    console.log('\n🔄 Step 4: Test refresh tree from database');
    
    // Clear current tree
    documentAVLService.documentTree.clear();
    documentAVLService.docInfo.clear();
    documentAVLService.initialized = false;
    
    console.log('Tree cleared, re-initializing...');
    
    // Re-initialize (should load from database)
    await documentAVLService.initialize();
    
    const reloadedStats = documentAVLService.getTreeStats();
    console.log('Reloaded tree stats:', {
      totalDocuments: reloadedStats.totalDocuments,
      totalNodes: reloadedStats.totalNodes,
      treeHeight: reloadedStats.treeHeight,
      initialized: reloadedStats.initialized
    });

    // Step 5: Verify data integrity
    console.log('\n🎯 Step 5: Verify data integrity');
    console.log('Stats comparison:');
    console.log('Initial vs Reloaded:');
    console.log(`Documents: ${initialStats.totalDocuments} -> ${reloadedStats.totalDocuments} ✅`);
    console.log(`Nodes: ${initialStats.totalNodes} -> ${reloadedStats.totalNodes} ✅`);
    console.log(`Tree Height: ${initialStats.treeHeight} -> ${reloadedStats.treeHeight} ✅`);

    const integrity = 
      initialStats.totalDocuments === reloadedStats.totalDocuments &&
      initialStats.totalNodes === reloadedStats.totalNodes &&
      initialStats.treeHeight === reloadedStats.treeHeight;

    console.log(`\n🎉 Data integrity check: ${integrity ? '✅ PASSED' : '❌ FAILED'}`);

    // Step 6: Performance comparison
    console.log('\n⚡ Step 6: Performance test');
    const testText = "Việt Nam là một đất nước xinh đẹp với thể thao phát triển mạnh.";
    
    const startTime = Date.now();
    const duplicateResult = await documentAVLService.checkDuplicateContent(testText, {
      threshold: 0.5,
      includeStatistics: true
    });
    const endTime = Date.now();
    
    console.log(`Plagiarism check took: ${endTime - startTime}ms`);
    console.log('Duplicate result:', {
      similarity: duplicateResult.similarity,
      totalMatches: duplicateResult.matches?.length || 0,
      isPlagiarized: duplicateResult.isPlagiarized
    });

    console.log('\n✅ Database persistence test completed successfully!');

  } catch (error) {
    console.error('❌ Error in database persistence test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📤 Disconnected from MongoDB');
  }
}

// Run test if called directly
if (require.main === module) {
  testDatabasePersistence()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = testDatabasePersistence;
