const express = require('express');
const router = express.Router();
const documentAVLService = require('../services/DocumentAVLService');
const GlobalAVLTreeUnified = require('../models/GlobalAVLTreeUnified');

// Get AVL Tree database status
router.get('/status', async (req, res) => {
  try {
    const saveStatus = documentAVLService.getSaveStatus();
    const treeStats = documentAVLService.getTreeStats();
    
    // Get database info
    const savedTrees = await GlobalAVLTreeUnified.find()
      .sort({ lastUpdated: -1 })
      .limit(5)
      .select('version createdAt lastUpdated metadata');

    const latestTree = await GlobalAVLTreeUnified.getLatest();
    
    res.json({
      success: true,
      memory: {
        initialized: treeStats.initialized,
        totalDocuments: treeStats.totalDocuments,
        totalNodes: treeStats.totalNodes,
        treeHeight: treeStats.treeHeight,
        totalSentences: treeStats.totalSentences
      },
      persistence: {
        autoSave: saveStatus.autoSave,
        lastSaved: saveStatus.lastSaved,
        saveInterval: saveStatus.saveInterval,
        saveIntervalMinutes: saveStatus.saveInterval / (1000 * 60)
      },
      database: {
        hasSavedData: !!latestTree,
        latestVersion: latestTree?.version,
        latestSave: latestTree?.lastUpdated,
        savedNodes: latestTree?.metadata?.totalNodes || 0,
        savedDocuments: latestTree?.metadata?.totalDocuments || 0,
        totalBackups: savedTrees.length
      },
      backups: savedTrees.map(tree => ({
        version: tree.version,
        createdAt: tree.createdAt,
        lastUpdated: tree.lastUpdated,
        totalNodes: tree.metadata?.totalNodes || 0,
        totalDocuments: tree.metadata?.totalDocuments || 0
      }))
    });
  } catch (error) {
    console.error('Error getting AVL tree status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Force save AVL tree to database
router.post('/save', async (req, res) => {
  try {
    console.log('📤 Manual save requested via API');
    
    if (!documentAVLService.initialized) {
      return res.status(400).json({
        success: false,
        error: 'DocumentAVLService not initialized'
      });
    }

    const beforeStats = documentAVLService.getTreeStats();
    const saveResult = await documentAVLService.forceSave();
    
    if (saveResult) {
      const afterSaveStatus = documentAVLService.getSaveStatus();
      
      res.json({
        success: true,
        message: 'AVL Tree saved to database successfully',
        stats: {
          totalDocuments: beforeStats.totalDocuments,
          totalNodes: beforeStats.totalNodes,
          treeHeight: beforeStats.treeHeight
        },
        saveTime: afterSaveStatus.lastSaved
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to save AVL tree to database'
      });
    }
  } catch (error) {
    console.error('Error saving AVL tree:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reload AVL tree from database
router.post('/reload', async (req, res) => {
  try {
    console.log('🔄 Reload from database requested via API');
    
    // Clear current tree
    documentAVLService.documentTree.clear();
    documentAVLService.docInfo.clear();
    documentAVLService.initialized = false;
    
    // Reload from database
    await documentAVLService.initialize();
    
    const stats = documentAVLService.getTreeStats();
    
    res.json({
      success: true,
      message: 'AVL Tree reloaded from database successfully',
      stats: {
        totalDocuments: stats.totalDocuments,
        totalNodes: stats.totalNodes,
        treeHeight: stats.treeHeight,
        initialized: stats.initialized
      }
    });
  } catch (error) {
    console.error('Error reloading AVL tree:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get detailed tree data (for debugging)
router.get('/debug', async (req, res) => {
  try {
    const latestTree = await GlobalAVLTreeUnified.getLatest();
    
    if (!latestTree) {
      return res.json({
        success: false,
        message: 'No saved tree found in database'
      });
    }

    // Sample some nodes for debugging
    const sampleNodes = latestTree.nodes.slice(0, 10).map(node => ({
      hash: node.hash,
      documentsCount: node.documents.length,
      sentencesCount: node.sentences.length,
      height: node.height,
      sampleDocuments: node.documents.slice(0, 3),
      sampleSentences: node.sentences.slice(0, 3)
    }));

    res.json({
      success: true,
      data: {
        version: latestTree.version,
        metadata: latestTree.metadata,
        rootHash: latestTree.rootHash,
        totalNodes: latestTree.nodes.length,
        totalDocuments: latestTree.documentInfo.length,
        sampleNodes,
        documentInfo: latestTree.documentInfo.map(doc => ({
          documentId: doc.documentId,
          title: doc.title,
          fileType: doc.fileType,
          sentenceCount: doc.sentenceCount
        }))
      }
    });
  } catch (error) {
    console.error('Error getting debug info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
