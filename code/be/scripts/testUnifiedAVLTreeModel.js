const mongoose = require('mongoose');
const documentAVLService = require('../services/DocumentAVLService');
const GlobalAVLTreeUnified = require('../models/GlobalAVLTreeUnified');
require('dotenv').config();

async function testUnifiedAVLTreeModel() {
  try {
    console.log('🧪 Testing Unified Global AVL Tree Model...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plagiarism_checker', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Initialize with unified model
    console.log('📋 Step 1: Initialize DocumentAVLService');
    await documentAVLService.initialize();
    
    const initialStats = documentAVLService.getTreeStats();
    console.log('Initial tree stats:', {
      totalDocuments: initialStats.totalDocuments,
      totalNodes: initialStats.totalNodes,
      treeHeight: initialStats.treeHeight,
      initialized: initialStats.initialized
    });

    console.log(`Tokenization samples collected: ${documentAVLService.tokenizationSamples.length}`);

    // Step 2: Save with unified model
    console.log('\n💾 Step 2: Save to Unified Model');
    const saveResult = await documentAVLService.forceSave();
    console.log('Save result:', saveResult);

    // Step 3: Check unified database content
    console.log('\n🔍 Step 3: Check Unified Database Content');
    const savedTrees = await GlobalAVLTreeUnified.find().sort({ lastUpdated: -1 });
    console.log(`Found ${savedTrees.length} unified trees in database`);
    
    if (savedTrees.length > 0) {
      const latestTree = savedTrees[0];
      console.log('Latest unified tree:', {
        version: latestTree.version,
        totalNodes: latestTree.metadata.totalNodes,
        totalDocuments: latestTree.metadata.totalDocuments,
        tokenStats: latestTree.metadata.tokenStats,
        samplesCount: latestTree.tokenizationSamples.length
      });

      // Sample nodes with token info
      if (latestTree.nodes.length > 0) {
        console.log('\n🌲 Sample nodes with token info:');
        latestTree.nodes.slice(0, 5).forEach((node, index) => {
          console.log(`Node ${index + 1}:`, {
            hash: node.hash,
            originalWord: node.originalWord,
            tokenInfo: node.tokenInfo,
            documentsCount: node.documents.length,
            sentencesCount: node.sentences.length
          });
        });
      }

      // Sample tokenization examples
      if (latestTree.tokenizationSamples.length > 0) {
        console.log('\n📝 Sample tokenization examples:');
        latestTree.tokenizationSamples.slice(0, 3).forEach((sample, index) => {
          console.log(`Sample ${index + 1}:`);
          console.log(`  Original: "${sample.originalText}"`);
          console.log(`  Tokens: [${sample.tokenizedWords.map(t => 
            `"${t.word}"${t.isPreservedPhrase ? '(phrase)' : ''}`
          ).join(', ')}]`);
        });
      }

      // Document info with tokenization stats
      if (latestTree.documentInfo.length > 0) {
        console.log('\n📊 Document tokenization stats:');
        latestTree.documentInfo.forEach((doc, index) => {
          console.log(`Doc ${index + 1}: ${doc.title}`);
          console.log(`  Total tokens: ${doc.tokenizationStats?.totalTokens || 0}`);
          console.log(`  Preserved phrases: ${doc.tokenizationStats?.preservedPhrases || 0}`);
          console.log(`  Unique tokens: ${doc.tokenizationStats?.uniqueTokens || 0}`);
        });
      }
    }

    // Step 4: Test reload with unified model
    console.log('\n🔄 Step 4: Test Reload with Unified Model');
    
    // Clear current state
    documentAVLService.documentTree.clear();
    documentAVLService.docInfo.clear();
    documentAVLService.tokenizationSamples = [];
    documentAVLService.initialized = false;
    
    console.log('Cleared current state, reloading...');
    
    // Reload
    await documentAVLService.initialize();
    
    const reloadedStats = documentAVLService.getTreeStats();
    console.log('Reloaded stats:', {
      totalDocuments: reloadedStats.totalDocuments,
      totalNodes: reloadedStats.totalNodes,
      treeHeight: reloadedStats.treeHeight,
      samplesRestored: documentAVLService.tokenizationSamples.length
    });

    // Step 5: Check tokenization preservation
    console.log('\n🎯 Step 5: Check Tokenization Data Preservation');
    
    if (documentAVLService.tokenizationSamples.length > 0) {
      console.log('✅ Tokenization samples preserved');
      
      // Count preserved phrases
      let preservedPhrases = 0;
      let totalTokens = 0;
      
      documentAVLService.tokenizationSamples.forEach(sample => {
        sample.tokenizedWords.forEach(token => {
          totalTokens++;
          if (token.isPreservedPhrase) {
            preservedPhrases++;
          }
        });
      });
      
      console.log(`Total tokens: ${totalTokens}`);
      console.log(`Preserved phrases: ${preservedPhrases}`);
      console.log(`Phrase ratio: ${((preservedPhrases/totalTokens)*100).toFixed(2)}%`);
    } else {
      console.log('❌ No tokenization samples found');
    }

    // Step 6: Test tree structure with token info
    console.log('\n🌳 Step 6: Test Tree Structure with Token Info');
    
    const allNodes = documentAVLService.documentTree.getAllNodes();
    console.log(`Tree has ${allNodes.length} nodes`);
    
    if (allNodes.length > 0) {
      // Find nodes with preserved phrases
      const phraseNodes = allNodes.filter(node => 
        node.hash && documentAVLService.documentTree.search(node.hash)?.originalWord?.includes(' ')
      );
      
      console.log(`Nodes with preserved phrases: ${phraseNodes.length}`);
      
      if (phraseNodes.length > 0) {
        console.log('Sample phrase nodes:');
        phraseNodes.slice(0, 3).forEach((node, index) => {
          const treeNode = documentAVLService.documentTree.search(node.hash);
          console.log(`  ${index + 1}. "${treeNode?.originalWord}" (${node.documents.length} docs)`);
        });
      }
    }

    console.log('\n✅ Unified model test completed successfully!');

  } catch (error) {
    console.error('❌ Error in unified model test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📤 Disconnected from MongoDB');
  }
}

// Run test if called directly
if (require.main === module) {
  testUnifiedAVLTreeModel()
    .then(() => {
      console.log('\n🎉 Unified model test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = testUnifiedAVLTreeModel;
