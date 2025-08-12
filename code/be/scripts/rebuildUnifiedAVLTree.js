const mongoose = require('mongoose');
const documentAVLService = require('../services/DocumentAVLService');
const Document = require('../models/Document');
const GlobalAVLTreeUnified = require('../models/GlobalAVLTreeUnified');
require('dotenv').config();

async function rebuildUnifiedAVLTree() {
  try {
    console.log('🔄 Rebuilding Global AVL Tree with Unified Model...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plagiarism_checker', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Clear existing trees and data
    console.log('🗑️  Step 1: Clear Existing Data');
    
    // Clear all existing unified trees
    const deleteResult = await GlobalAVLTreeUnified.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing unified trees`);
    
    // Clear service state
    documentAVLService.documentTree.clear();
    documentAVLService.docInfo.clear();
    documentAVLService.tokenizationSamples = [];
    documentAVLService.initialized = false;
    
    console.log('Service state cleared');

    // Step 2: Rebuild from documents
    console.log('\n🚀 Step 2: Rebuild from Documents');
    
    const documents = await Document.find({
      status: "processed",
      extractedText: { $exists: true, $ne: "" },
    }).select("_id title fileType extractedText createdAt uploadedBy");

    console.log(`Found ${documents.length} processed documents`);

    if (documents.length === 0) {
      console.log('⚠️  No documents to process');
      return;
    }

    // Initialize Vietnamese service first
    const vietnameseStopwordService = require('../services/VietnameseStopwordService');
    if (!vietnameseStopwordService.initialized) {
      await vietnameseStopwordService.initialize();
    }

    // Process each document and collect tokenization data
    for (const doc of documents) {
      console.log(`\n📄 Processing document: ${doc.title}`);
      
      const result = await documentAVLService.addDocumentToTreeOnly(doc);
      console.log(`  ✅ Added: ${result?.sentenceCount || 'unknown'} sentences, ${result?.uniqueTokenCount || 'unknown'} tokens`);
    }

    documentAVLService.initialized = true;

    // Step 3: Display collection results
    console.log('\n📊 Step 3: Collection Results');
    
    const stats = documentAVLService.getTreeStats();
    console.log('Tree statistics:', {
      totalDocuments: stats.totalDocuments,
      totalNodes: stats.totalNodes,
      treeHeight: stats.treeHeight,
      totalSentences: stats.totalSentences
    });

    console.log(`Tokenization samples collected: ${documentAVLService.tokenizationSamples.length}`);

    // Sample collected tokenization data
    if (documentAVLService.tokenizationSamples.length > 0) {
      console.log('\n📝 Sample tokenization data:');
      documentAVLService.tokenizationSamples.slice(0, 3).forEach((sample, index) => {
        console.log(`Sample ${index + 1}:`);
        console.log(`  Document: ${sample.documentId}`);
        console.log(`  Original: "${sample.originalText}"`);
        console.log(`  Tokens: [${sample.tokenizedWords.map(t => 
          `"${t.word}"${t.isPreservedPhrase ? '(phrase)' : ''}`
        ).join(', ')}]`);
      });
    }

    // Step 4: Save to unified model
    console.log('\n💾 Step 4: Save to Unified Model');
    
    const saveResult = await documentAVLService.forceSave();
    console.log(`Save result: ${saveResult ? '✅ Success' : '❌ Failed'}`);

    if (saveResult) {
      // Verify saved data
      const savedTree = await GlobalAVLTreeUnified.getLatest();
      if (savedTree) {
        console.log('\n🔍 Saved tree verification:');
        console.log('Version:', savedTree.version);
        console.log('Nodes saved:', savedTree.nodes.length);
        console.log('Documents saved:', savedTree.documentInfo.length);
        console.log('Tokenization samples saved:', savedTree.tokenizationSamples.length);
        console.log('Token stats:', savedTree.metadata.tokenStats);

        // Check for nodes with original words
        const nodesWithWords = savedTree.nodes.filter(node => node.originalWord);
        console.log(`Nodes with original words: ${nodesWithWords.length}/${savedTree.nodes.length}`);

        if (nodesWithWords.length > 0) {
          console.log('\nSample nodes with words:');
          nodesWithWords.slice(0, 5).forEach((node, index) => {
            console.log(`  ${index + 1}. "${node.originalWord}" (hash: ${node.hash})`);
          });
        }
      }
    }

    // Step 5: Test reload
    console.log('\n🔄 Step 5: Test Reload');
    
    // Clear again
    documentAVLService.documentTree.clear();
    documentAVLService.docInfo.clear();
    documentAVLService.tokenizationSamples = [];
    documentAVLService.initialized = false;
    
    // Reload
    await documentAVLService.initialize();
    
    const reloadedStats = documentAVLService.getTreeStats();
    console.log('Reloaded stats:', {
      totalDocuments: reloadedStats.totalDocuments,
      totalNodes: reloadedStats.totalNodes,
      treeHeight: reloadedStats.treeHeight,
      tokensRestored: documentAVLService.tokenizationSamples.length
    });

    // Step 6: Check phrase preservation
    console.log('\n🎯 Step 6: Check Phrase Preservation');
    
    if (documentAVLService.tokenizationSamples.length > 0) {
      let totalTokens = 0;
      let preservedPhrases = 0;
      
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
      
      // Find some preserved phrases
      const phrases = [];
      documentAVLService.tokenizationSamples.forEach(sample => {
        sample.tokenizedWords.forEach(token => {
          if (token.isPreservedPhrase && !phrases.includes(token.word)) {
            phrases.push(token.word);
          }
        });
      });
      
      if (phrases.length > 0) {
        console.log('Sample preserved phrases:', phrases.slice(0, 5));
      }
    }

    console.log('\n✅ Unified AVL Tree rebuild completed successfully!');

  } catch (error) {
    console.error('❌ Error rebuilding unified AVL tree:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📤 Disconnected from MongoDB');
  }
}

// Run rebuild if called directly
if (require.main === module) {
  rebuildUnifiedAVLTree()
    .then(() => {
      console.log('\n🎉 Rebuild completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Rebuild failed:', error);
      process.exit(1);
    });
}

module.exports = rebuildUnifiedAVLTree;
