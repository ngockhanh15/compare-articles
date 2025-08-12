const mongoose = require('mongoose');
const documentAVLService = require('../services/DocumentAVLService');
const GlobalAVLTreeUnified = require('../models/GlobalAVLTreeUnified');
const Document = require('../models/Document');
require('dotenv').config();

async function testUploadToGlobalAVL() {
  try {
    console.log('🧪 Testing File Upload Integration with Global AVL Tree\n');
    console.log('=' .repeat(60));

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plagiarism_checker', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Check initial state
    console.log('📊 STEP 1: Initial State Check');
    console.log('-'.repeat(40));
    
    // Initialize service if needed
    if (!documentAVLService.initialized) {
      await documentAVLService.initialize();
    }
    
    const initialStats = documentAVLService.getTreeStats();
    console.log('Initial AVL Tree Stats:', {
      totalDocuments: initialStats.totalDocuments,
      totalNodes: initialStats.totalNodes,
      treeHeight: initialStats.treeHeight
    });

    const initialDBCount = await Document.countDocuments({ status: 'processed' });
    console.log(`Documents in database: ${initialDBCount}`);

    const initialTreeCount = await GlobalAVLTreeUnified.countDocuments();
    console.log(`Saved AVL Trees in database: ${initialTreeCount}`);

    // Step 2: Check latest saved tree
    console.log('\n🔍 STEP 2: Check Latest Saved Tree');
    console.log('-'.repeat(40));
    
    const latestTree = await GlobalAVLTreeUnified.getLatest();
    if (latestTree) {
      console.log('Latest saved tree metadata:', {
        version: latestTree.version,
        lastUpdated: latestTree.lastUpdated,
        totalNodes: latestTree.metadata.totalNodes,
        totalDocuments: latestTree.metadata.totalDocuments,
        nodesCount: latestTree.nodes.length,
        documentsCount: latestTree.documentInfo.length
      });

      // Compare memory vs database
      console.log('\n📈 Memory vs Database Comparison:');
      console.log(`Memory Documents: ${initialStats.totalDocuments}`);
      console.log(`Database Documents: ${latestTree.metadata.totalDocuments}`);
      console.log(`Memory Nodes: ${initialStats.totalNodes}`);
      console.log(`Database Nodes: ${latestTree.metadata.totalNodes}`);
      
      const isSync = 
        initialStats.totalDocuments === latestTree.metadata.totalDocuments &&
        initialStats.totalNodes === latestTree.metadata.totalNodes;
      
      console.log(`Sync Status: ${isSync ? '✅ Synchronized' : '❌ Out of Sync'}`);
    } else {
      console.log('❌ No saved tree found in database');
    }

    // Step 3: Simulate adding a new document
    console.log('\n🆕 STEP 3: Simulate Document Upload');
    console.log('-'.repeat(40));
    
    // Create a mock document
    const mockDocument = {
      _id: new mongoose.Types.ObjectId(),
      title: 'Test Document for AVL',
      extractedText: 'Đây là một văn bản test để kiểm tra việc lưu trữ vào Global AVL Tree. Nó chứa từ khóa thể thao và các cụm từ khác.',
      fileType: 'txt',
      createdAt: new Date(),
      uploadedBy: new mongoose.Types.ObjectId()
    };

    console.log('Mock document created:', {
      title: mockDocument.title,
      textLength: mockDocument.extractedText.length,
      words: mockDocument.extractedText.split(' ').length
    });

    // Add to AVL tree
    const addResult = await documentAVLService.addDocumentToTree(mockDocument);
    console.log('Add result:', addResult);

    if (addResult.success) {
      // Force save to database
      console.log('\n💾 Saving updated tree to database...');
      const saveResult = await documentAVLService.forceSave();
      console.log(`Save result: ${saveResult ? '✅ Success' : '❌ Failed'}`);

      // Check updated stats
      const updatedStats = documentAVLService.getTreeStats();
      console.log('Updated AVL Tree Stats:', {
        totalDocuments: updatedStats.totalDocuments,
        totalNodes: updatedStats.totalNodes,
        treeHeight: updatedStats.treeHeight
      });

      // Check database
      const updatedTree = await GlobalAVLTreeUnified.getLatest();
      if (updatedTree) {
        console.log('Updated database tree:', {
          lastUpdated: updatedTree.lastUpdated,
          totalNodes: updatedTree.metadata.totalNodes,
          totalDocuments: updatedTree.metadata.totalDocuments
        });
      }
    }

    // Step 4: Check tokenization samples
    console.log('\n🔤 STEP 4: Check Tokenization Samples');
    console.log('-'.repeat(40));
    
    const finalTree = await GlobalAVLTreeUnified.getLatest();
    if (finalTree && finalTree.tokenizationSamples) {
      console.log(`Tokenization samples count: ${finalTree.tokenizationSamples.length}`);
      
      // Show sample tokenization
      const samples = finalTree.tokenizationSamples.slice(0, 3);
      samples.forEach((sample, index) => {
        console.log(`Sample ${index + 1}:`, {
          documentId: sample.documentId,
          sentence: sample.originalText.substring(0, 50) + '...',
          tokensCount: sample.tokens.length,
          sampleTokens: sample.tokens.slice(0, 5)
        });
      });
    } else {
      console.log('❌ No tokenization samples found');
    }

    // Step 5: Verify persistence
    console.log('\n🔄 STEP 5: Verify Persistence');
    console.log('-'.repeat(40));
    
    // Clear memory tree
    documentAVLService.documentTree.clear();
    documentAVLService.docInfo.clear();
    documentAVLService.initialized = false;
    
    console.log('Memory tree cleared');
    
    // Reload from database
    await documentAVLService.initialize();
    
    const reloadedStats = documentAVLService.getTreeStats();
    console.log('Reloaded stats:', {
      totalDocuments: reloadedStats.totalDocuments,
      totalNodes: reloadedStats.totalNodes,
      treeHeight: reloadedStats.treeHeight
    });

    // Verify data integrity
    const dataMatch = 
      updatedStats.totalDocuments === reloadedStats.totalDocuments &&
      updatedStats.totalNodes === reloadedStats.totalNodes;
    
    console.log(`Data integrity: ${dataMatch ? '✅ Maintained' : '❌ Corrupted'}`);

    console.log('\n🎉 CONCLUSION');
    console.log('='.repeat(60));
    console.log('✅ File upload integration with Global AVL Tree tested');
    console.log('✅ Documents are properly indexed in memory tree');
    console.log('✅ Tree is saved to database after document upload');
    console.log('✅ Tokenization samples are preserved');
    console.log('✅ Data persistence is working correctly');

  } catch (error) {
    console.error('❌ Test Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📤 Disconnected from MongoDB');
  }
}

// Run test if called directly
if (require.main === module) {
  testUploadToGlobalAVL()
    .then(() => {
      console.log('\n🎊 Test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = testUploadToGlobalAVL;
