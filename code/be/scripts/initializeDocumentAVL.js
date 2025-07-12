const mongoose = require('mongoose');
const documentAVLService = require('../services/DocumentAVLService');
require('dotenv').config();

const initializeDocumentAVL = async () => {
  try {
    console.log('Starting Document AVL Tree initialization...');
    
    // Initialize the AVL tree (database connection should already exist)
    await documentAVLService.initialize();
    
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