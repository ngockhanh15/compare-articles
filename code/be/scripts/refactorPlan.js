/**
 * REFACTOR PLAN: Chuyển sang sử dụng ONE BIG AVL TREE
 * 
 * HIỆN TẠI:
 * - Mỗi document có avlTreeData riêng
 * - Global AVL Tree (this.documentTree) cũng tồn tại song song
 * - Redundant và tốn memory
 * 
 * SAU KHI REFACTOR:
 * - CHỈ sử dụng Global AVL Tree
 * - Loại bỏ hoàn toàn avlTreeData từ documents
 * - Tất cả operations đều dựa vào Global Tree
 * 
 * STEPS:
 * 1. Remove avlTreeData from Document model ✅
 * 2. Update DocumentAVLService to only use Global Tree ✅  
 * 3. Update PlagiarismDetectionService to use Global Tree ✅
 * 4. Create migration script to remove avlTreeData from existing docs ✅
 * 5. Test the new system ✅
 */

// ============================================================================
// STEP 1: Remove avlTreeData from Document Model
// ============================================================================

console.log('Step 1: Removing avlTreeData from Document model...');

// File: be/models/Document.js
// REMOVE:
/*
  avlTreeData: {
    type: Object,
    default: null
  }
*/

// ============================================================================  
// STEP 2: Update DocumentAVLService
// ============================================================================

console.log('Step 2: Updating DocumentAVLService...');

// Current: addDocumentToTree() creates both Global Tree + avlTreeData
// New: addDocumentToTree() only adds to Global Tree

// BEFORE:
/*
async addDocumentToTree(document) {
  // Add to global tree
  const { sentenceCount, uniqueTokenCount } = this.indexDocument(document);
  
  // Generate individual avlTreeData (REMOVE THIS)
  const wordHashes = TextHasher.createWordHashes(document.extractedText);
  return this.generateAVLTreeData(document, sortKey, wordHashes);
}
*/

// AFTER:
/*
async addDocumentToTree(document) {
  // Only add to global tree
  const { sentenceCount, uniqueTokenCount } = this.indexDocument(document);
  
  console.log(`Added document "${document.title}" to Global AVL Tree: ${sentenceCount} sentences, ${uniqueTokenCount} unique tokens`);
  
  return { success: true, sentenceCount, uniqueTokenCount };
}
*/

// ============================================================================
// STEP 3: Update search/comparison logic
// ============================================================================

console.log('Step 3: Updating search/comparison logic...');

// All search operations should use Global AVL Tree
// Instead of comparing individual avlTreeData, query Global Tree

// ============================================================================
// STEP 4: Migration script
// ============================================================================

console.log('Step 4: Creating migration script...');

// Remove avlTreeData field from all existing documents

module.exports = {
  refactorDocumentAVLService: require('./refactorDocumentAVLService'),
  removeAVLTreeDataFromDocuments: require('./removeAVLTreeDataFromDocuments'),
  testGlobalAVLTree: require('./testGlobalAVLTree')
};
