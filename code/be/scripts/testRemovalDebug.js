const mongoose = require('mongoose');
const documentAVLService = require('../services/DocumentAVLService');
const Document = require('../models/Document');
const path = require('path');

// Load .env from be directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testRemovalDebug() {
  try {
    console.log('🔍 Testing Document Removal Debug...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Initialize DocumentAVLService
    console.log('\n🔧 Initializing DocumentAVLService...');
    await documentAVLService.initialize();
    
    const initialStats = documentAVLService.getTreeStats();
    console.log('Initial tree stats:', {
      totalDocuments: initialStats.totalDocuments,
      totalNodes: initialStats.totalNodes,
      treeHeight: initialStats.treeHeight
    });

    // Get a sample document
    let sampleDoc = await Document.findOne({ 
      status: 'processed',
      extractedText: { $exists: true, $ne: '' }
    });
    
    // If no processed documents, try any document
    if (!sampleDoc) {
      sampleDoc = await Document.findOne({
        extractedText: { $exists: true, $ne: '' }
      });
    }
    
    // If still no documents, try any document
    if (!sampleDoc) {
      sampleDoc = await Document.findOne();
    }

    if (!sampleDoc) {
      console.log('❌ No documents found in database');
      
      // Check if there are any documents in the tree memory
      const docInfoKeys = Array.from(documentAVLService.docInfo.keys());
      if (docInfoKeys.length > 0) {
        console.log(`Found ${docInfoKeys.length} documents in tree memory:`, docInfoKeys.slice(0, 3));
        // Use the first document ID from memory
        const docId = docInfoKeys[0];
        sampleDoc = { _id: docId, title: documentAVLService.docInfo.get(docId)?.title || 'Unknown' };
        console.log(`Using document from memory: ${sampleDoc.title} (${docId})`);
      } else {
        console.log('No documents found in tree memory either');
        return;
      }
    }

    console.log(`\n📄 Testing with document: "${sampleDoc.title}" (ID: ${sampleDoc._id})`);

    // Check nodes containing this document BEFORE removal
    console.log('\n🔍 Checking nodes BEFORE removal...');
    const allNodesBefore = documentAVLService.documentTree.getAllNodes();
    let nodesWithDocBefore = 0;
    let sampleNodesBefore = [];
    
    console.log(`Total nodes in tree: ${allNodesBefore.length}`);
    
    for (let i = 0; i < allNodesBefore.length; i++) {
      const node = allNodesBefore[i];
      
      // Debug node structure
      if (i === 0) {
        console.log('Sample node structure:', {
          hash: typeof node.hash === 'string' ? node.hash.substring(0, 8) + '...' : node.hash,
          hashType: typeof node.hash,
          documentsType: typeof node.documents,
          documentsIsArray: Array.isArray(node.documents),
          documentsIsSet: node.documents instanceof Set,
          documentsLength: node.documents ? node.documents.length || node.documents.size : 0,
          sentencesType: typeof node.sentences,
          sentencesIsArray: Array.isArray(node.sentences),
          sentencesIsSet: node.sentences instanceof Set,
          sentencesLength: node.sentences ? node.sentences.length || node.sentences.size : 0
        });
      }
      
      // Convert to Set if it's an Array
      if (Array.isArray(node.documents)) {
        node.documents = new Set(node.documents);
      }
      if (Array.isArray(node.sentences)) {
        node.sentences = new Set(node.sentences);
      }
      
      if (node.documents.has && node.documents.has(String(sampleDoc._id))) {
        nodesWithDocBefore++;
        if (sampleNodesBefore.length < 3) {
          sampleNodesBefore.push({
            hash: typeof node.hash === 'string' ? node.hash.substring(0, 8) + '...' : node.hash,
            documentsCount: node.documents.size,
            sentencesCount: node.sentences.size,
            hasTargetDoc: node.documents.has(String(sampleDoc._id))
          });
        }
      }
    }
    
    console.log(`📊 Nodes containing document BEFORE: ${nodesWithDocBefore}`);
    console.log('Sample nodes before:', sampleNodesBefore);

    // Remove document from tree
    console.log('\n🗑️ Removing document from AVL tree...');
    const removedCount = documentAVLService.documentTree.removeDocumentFromAllNodes(sampleDoc._id);
    console.log(`Removed from ${removedCount} nodes`);

    // Check nodes containing this document AFTER removal
    console.log('\n🔍 Checking nodes AFTER removal...');
    const allNodesAfter = documentAVLService.documentTree.getAllNodes();
    let nodesWithDocAfter = 0;
    let sampleNodesAfter = [];
    
    for (const node of allNodesAfter) {
      if (node.documents.has(String(sampleDoc._id))) {
        nodesWithDocAfter++;
        if (sampleNodesAfter.length < 3) {
          sampleNodesAfter.push({
            hash: node.hash.substring(0, 8) + '...',
            documentsCount: node.documents.size,
            sentencesCount: node.sentences.size,
            hasTargetDoc: node.documents.has(String(sampleDoc._id))
          });
        }
      }
    }
    
    console.log(`📊 Nodes containing document AFTER: ${nodesWithDocAfter}`);
    console.log('Sample nodes after:', sampleNodesAfter);

    // Verification
    console.log('\n✅ Verification:');
    if (nodesWithDocAfter === 0) {
      console.log('🎉 SUCCESS: Document completely removed from all nodes!');
    } else {
      console.log('❌ ISSUE: Document still exists in some nodes');
      
      // Debug: Show which nodes still contain the document
      console.log('\n🔍 Nodes still containing the document:');
      for (const node of allNodesAfter) {
        if (node.documents.has(String(sampleDoc._id))) {
          console.log(`- Hash: ${node.hash.substring(0, 12)}...`);
          console.log(`  Documents: ${Array.from(node.documents).slice(0, 3)}`);
          console.log(`  Sentences: ${Array.from(node.sentences).slice(0, 3)}`);
        }
      }
    }

    // Test tree functionality
    console.log('\n🧪 Testing tree search functionality...');
    const testText = "This is a test sentence.";
    const searchResult = await documentAVLService.checkDuplicateContent(testText, {
      minSimilarity: 10,
      maxResults: 5
    });
    
    console.log(`Tree search still works: ${searchResult.matches.length} matches found`);

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run test if called directly
if (require.main === module) {
  testRemovalDebug()
    .then(() => {
      console.log('\n🎉 Debug test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Debug test failed:', error);
      process.exit(1);
    });
}

module.exports = testRemovalDebug;