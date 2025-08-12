const mongoose = require('mongoose');
const Document = require('../models/Document');

async function removeAVLTreeDataFromDocuments() {
  try {
    console.log('=== MIGRATION: REMOVE AVL TREE DATA FROM DOCUMENTS ===');
    
    // Kết nối database
    require('dotenv').config();
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n=== ANALYZING CURRENT STATE ===');
    
    // Đếm documents có avlTreeData
    const totalDocs = await Document.countDocuments();
    const docsWithAVL = await Document.countDocuments({ 
      avlTreeData: { $exists: true, $ne: null } 
    });
    
    console.log(`Total documents: ${totalDocs}`);
    console.log(`Documents with avlTreeData: ${docsWithAVL}`);
    
    if (docsWithAVL === 0) {
      console.log('✅ No documents have avlTreeData field. Migration not needed.');
      return;
    }
    
    console.log('\n=== REMOVING AVL TREE DATA ===');
    
    // Xóa field avlTreeData từ tất cả documents
    const result = await Document.updateMany(
      { avlTreeData: { $exists: true } },
      { $unset: { avlTreeData: "" } }
    );
    
    console.log(`✅ Removed avlTreeData from ${result.modifiedCount} documents`);
    
    // Verify
    const docsWithAVLAfter = await Document.countDocuments({ 
      avlTreeData: { $exists: true, $ne: null } 
    });
    console.log(`Documents with avlTreeData after migration: ${docsWithAVLAfter}`);
    
    if (docsWithAVLAfter === 0) {
      console.log('🎉 Migration completed successfully!');
    } else {
      console.log('⚠️  Some documents still have avlTreeData. Manual check needed.');
    }
    
    console.log('\n=== STATS ===');
    console.log(`Before: ${docsWithAVL} documents with avlTreeData`);
    console.log(`After: ${docsWithAVLAfter} documents with avlTreeData`);
    console.log(`Removed: ${result.modifiedCount} documents`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
  }
}

// Run migration if called directly
if (require.main === module) {
  removeAVLTreeDataFromDocuments();
}

module.exports = removeAVLTreeDataFromDocuments;
