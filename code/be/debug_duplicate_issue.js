const mongoose = require('mongoose');
const Document = require('./models/Document');
const DocumentAVLService = require('./services/DocumentAVLService');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/plagiarism_checker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function debugDuplicateIssue() {
  try {
    console.log('🔍 Starting debug for duplicate document issue...\n');

    // 1. Check documents in database
    console.log('1. Checking documents in database:');
    const documents = await Document.find({ 
      status: 'processed',
      extractedText: { $exists: true, $ne: '' }
    }).select('_id title fileType extractedText createdAt uploadedBy');
    
    console.log(`   Found ${documents.length} processed documents in database`);
    documents.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc.title} (${doc.fileType}) - ${doc.extractedText.length} chars`);
    });

    if (documents.length === 0) {
      console.log('   ❌ No documents found! This might be the issue.');
      return;
    }

    // 2. Initialize DocumentAVLService
    console.log('\n2. Initializing DocumentAVLService:');
    const documentAVLService = new DocumentAVLService();
    await documentAVLService.initialize();
    
    const treeSize = documentAVLService.documentTree.getSize();
    console.log(`   AVL Tree size: ${treeSize} entries`);

    // 3. Test with sample text
    console.log('\n3. Testing with sample text:');
    const sampleText = documents[0] ? documents[0].extractedText.substring(0, 200) : "This is a test document for plagiarism checking.";
    console.log(`   Sample text: "${sampleText.substring(0, 100)}..."`);

    const result = await documentAVLService.checkDuplicateContent(sampleText, {
      minSimilarity: 10, // Very low threshold to see all matches
      maxResults: 20
    });

    console.log('\n4. Analysis of results:');
    console.log(`   Duplicate percentage: ${result.duplicatePercentage}%`);
    console.log(`   Total matches: ${result.totalMatches}`);
    console.log(`   Checked documents: ${result.checkedDocuments}`);
    console.log(`   Total documents in system: ${result.totalDocumentsInSystem}`);

    if (result.matches && result.matches.length > 0) {
      console.log('\n   Detailed matches:');
      result.matches.forEach((match, index) => {
        console.log(`   ${index + 1}. Document ID: ${match.documentId}`);
        console.log(`      Title: ${match.title}`);
        console.log(`      Similarity: ${match.similarity}%`);
        console.log(`      Matched hashes: ${match.matchedHashes}/${match.totalHashes}`);
        console.log(`      Source: ${match.source}`);
        console.log('      ---');
      });

      // Check if there are duplicate document IDs
      const documentIds = result.matches.map(m => m.documentId.toString());
      const uniqueDocumentIds = [...new Set(documentIds)];
      
      console.log(`\n5. Duplicate analysis:`);
      console.log(`   Total matches: ${result.matches.length}`);
      console.log(`   Unique document IDs: ${uniqueDocumentIds.length}`);
      
      if (documentIds.length > uniqueDocumentIds.length) {
        console.log(`   ❌ FOUND DUPLICATE ISSUE! Same document appears ${documentIds.length - uniqueDocumentIds.length} extra times`);
        
        // Find which documents are duplicated
        const idCounts = {};
        documentIds.forEach(id => {
          idCounts[id] = (idCounts[id] || 0) + 1;
        });
        
        console.log('\n   Document ID occurrence count:');
        Object.entries(idCounts).forEach(([id, count]) => {
          if (count > 1) {
            console.log(`   ❌ Document ${id}: appears ${count} times`);
          } else {
            console.log(`   ✅ Document ${id}: appears ${count} time`);
          }
        });
      } else {
        console.log(`   ✅ No duplicate document IDs found`);
      }
    }

    // 6. Check AVL tree structure
    console.log('\n6. Checking AVL tree structure:');
    const allNodes = documentAVLService.documentTree.getAllNodes();
    console.log(`   Total nodes in AVL tree: ${allNodes.length}`);
    
    // Group by document ID to see how many entries per document
    const documentEntries = {};
    allNodes.forEach(node => {
      const docId = node.data.documentId.toString();
      documentEntries[docId] = (documentEntries[docId] || 0) + 1;
    });
    
    console.log('\n   Entries per document in AVL tree:');
    Object.entries(documentEntries).forEach(([docId, count]) => {
      const doc = documents.find(d => d._id.toString() === docId);
      const title = doc ? doc.title : 'Unknown';
      console.log(`   Document ${docId} (${title}): ${count} entries`);
    });

  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugDuplicateIssue();