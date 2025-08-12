const mongoose = require('mongoose');
const documentAVLService = require('../services/DocumentAVLService');
const GlobalAVLTree = require('../models/GlobalAVLTree');
require('dotenv').config();

async function forceSaveAVLTree() {
  try {
    console.log('🔄 Manual AVL Tree Database Save...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plagiarism_checker', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Initialize if needed
    if (!documentAVLService.initialized) {
      console.log('🚀 Initializing DocumentAVLService...');
      await documentAVLService.initialize();
    }

    // Get current stats
    const stats = documentAVLService.getTreeStats();
    console.log('📊 Current tree stats:', {
      totalDocuments: stats.totalDocuments,
      totalNodes: stats.totalNodes,
      treeHeight: stats.treeHeight,
      initialized: stats.initialized
    });

    // Force save
    console.log('\n💾 Saving to database...');
    const saveResult = await documentAVLService.forceSave();
    
    if (saveResult) {
      console.log('✅ Save successful!');
      
      // Check database
      const savedTree = await GlobalAVLTree.getLatest();
      if (savedTree) {
        console.log('📊 Database stats:', {
          version: savedTree.version,
          lastUpdated: savedTree.lastUpdated,
          totalNodes: savedTree.metadata.totalNodes,
          totalDocuments: savedTree.metadata.totalDocuments,
          nodesStored: savedTree.nodes.length
        });
      }
    } else {
      console.log('❌ Save failed!');
    }

    const saveStatus = documentAVLService.getSaveStatus();
    console.log('\n📈 Save status:', saveStatus);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📤 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  forceSaveAVLTree()
    .then(() => {
      console.log('\n🎉 Manual save completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Manual save failed:', error);
      process.exit(1);
    });
}

module.exports = forceSaveAVLTree;
