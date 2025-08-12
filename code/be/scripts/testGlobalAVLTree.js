const mongoose = require('mongoose');
const Document = require('../models/Document');
const documentAVLService = require('../services/DocumentAVLService');

async function testGlobalAVLTree() {
  try {
    console.log('=== TEST GLOBAL AVL TREE SYSTEM ===');
    
    // Kết nối database
    require('dotenv').config();
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    console.log('\n=== INITIALIZING GLOBAL AVL TREE ===');
    
    // Khởi tạo DocumentAVLService với Global Tree
    await documentAVLService.initialize();
    
    console.log('\n=== GLOBAL AVL TREE STATS ===');
    const stats = documentAVLService.getTreeStats();
    console.log('Tree Statistics:', stats);
    
    console.log('\n=== TESTING PLAGIARISM DETECTION WITH GLOBAL TREE ===');
    
    // Test với text mới
    const testText = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
    console.log(`Test text: "${testText}"`);
    
    const duplicateResult = await documentAVLService.checkDuplicateContent(testText, {
      minSimilarity: 30,
      maxResults: 5
    });
    
    console.log('\n=== DUPLICATE DETECTION RESULT ===');
    console.log(`Duplicate percentage: ${duplicateResult.duplicatePercentage}%`);
    console.log(`Found ${duplicateResult.matches.length} matches:`);
    
    duplicateResult.matches.forEach((match, index) => {
      console.log(`\n${index + 1}. Document: ${match.title}`);
      console.log(`   Similarity: ${match.similarity}%`);
      console.log(`   Matched hashes: ${match.matchedHashes}`);
    });
    
    console.log('\n=== TESTING WITH DIFFERENT TEXT ===');
    
    const testText2 = "Hôm nay tôi đi học về rất muộn do có buổi học thêm môn thể thao.";
    console.log(`Test text 2: "${testText2}"`);
    
    const duplicateResult2 = await documentAVLService.checkDuplicateContent(testText2, {
      minSimilarity: 20,
      maxResults: 5
    });
    
    console.log(`Duplicate percentage: ${duplicateResult2.duplicatePercentage}%`);
    console.log(`Found ${duplicateResult2.matches.length} matches`);
    
    console.log('\n=== VERIFYING NO AVL TREE DATA IN DOCUMENTS ===');
    
    const docsWithAVL = await Document.countDocuments({ 
      avlTreeData: { $exists: true, $ne: null } 
    });
    
    console.log(`Documents with avlTreeData: ${docsWithAVL}`);
    
    if (docsWithAVL === 0) {
      console.log('✅ Perfect! No documents have individual avlTreeData');
      console.log('✅ System is using Global AVL Tree only');
    } else {
      console.log('⚠️  Some documents still have avlTreeData. Run migration script.');
    }
    
    console.log('\n=== TESTING DOCUMENT INFO FROM GLOBAL TREE ===');
    
    const allDocs = documentAVLService.docInfo;
    console.log(`Documents in Global Tree: ${allDocs.size}`);
    
    for (const [docId, info] of allDocs) {
      console.log(`\nDocument ID: ${docId}`);
      console.log(`  Title: ${info.title}`);
      console.log(`  Word count: ${info.wordCount}`);
      console.log(`  Sentence count: ${info.sentenceCount}`);
    }
    
    console.log('\n🎉 GLOBAL AVL TREE SYSTEM TEST COMPLETED!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
  }
}

// Run test if called directly
if (require.main === module) {
  testGlobalAVLTree();
}

module.exports = testGlobalAVLTree;
