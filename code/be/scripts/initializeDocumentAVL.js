const mongoose = require('mongoose');
const documentAVLService = require('../services/DocumentAVLService');
const Document = require('../models/Document');
require('dotenv').config();

const initializeDocumentAVL = async () => {
  try {
    console.log('Starting Document AVL Tree initialization...');
    
    // Initialize the AVL tree (database connection should already exist)
    await documentAVLService.initialize();
    
    // Update existing documents with AVL tree data if they don't have it
    console.log('Updating existing documents with AVL tree data...');
    const documentsWithoutAVLData = await Document.find({ 
      status: 'processed',
      extractedText: { $exists: true, $ne: '' },
      avlTreeData: { $exists: false }
    });

    console.log(`Found ${documentsWithoutAVLData.length} documents without AVL tree data`);

    for (const doc of documentsWithoutAVLData) {
      try {
        const avlTreeData = await documentAVLService.addDocumentToTree(doc);
        if (avlTreeData) {
          doc.avlTreeData = avlTreeData;
          await doc.save();
          console.log(`Updated AVL tree data for document: ${doc.title}`);
        }
      } catch (error) {
        console.error(`Error updating AVL tree data for document ${doc._id}:`, error);
      }
    }
    
    // Get statistics
    const stats = documentAVLService.getTreeStats();
    console.log('Document AVL Tree Statistics:', stats);
    
    console.log('Document AVL Tree initialization completed successfully!');
    
  } catch (error) {
    console.error('Error initializing Document AVL Tree:', error);
    throw error; // Don't exit process, let caller handle
  }
};

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      // Connect to MongoDB when running standalone
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plagiarism_checker', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('Connected to MongoDB');
      
      await initializeDocumentAVL();
      console.log('Initialization script completed');
      process.exit(0);
    } catch (error) {
      console.error('Initialization script failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = initializeDocumentAVL;