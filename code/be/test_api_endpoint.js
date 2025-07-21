const express = require('express');
const documentAVLService = require('./services/DocumentAVLService');
const { TextHasher } = require('./utils/TreeAVL');

// Mock the plagiarismControlFler checkDocumentSimilarity function
async function testCheckDocumentSimilarity() {
  try {
    console.log('🧪 Testing checkDocumentSimilarity API logic...\n');

    // Clear and setup test data
    documentAVLService.documentTree.clear();
    
    // Add a test document to the AVL tree
    const testDocument = {
      _id: 'test-doc-123',
      title: 'Sample Research Paper',
      fileType: 'pdf',
      createdAt: new Date(),
      uploadedBy: 'user123',
      extractedText: 'This is a comprehensive research paper about artificial intelligence and machine learning. The paper discusses various algorithms and methodologies used in modern AI systems. It covers topics such as neural networks, deep learning, and natural language processing.'
    };

    console.log('1. Adding test document to AVL tree...');
    await documentAVLService.addDocumentToTree(testDocument);
    console.log(`   AVL tree size: ${documentAVLService.documentTree.getSize()} entries`);

    // Test with similar text
    const testText = 'This research paper discusses artificial intelligence and machine learning algorithms used in neural networks and deep learning systems.';
    console.log(`\n2. Testing with similar text:`);
    console.log(`   Text: "${testText}"`);

    // Simulate the API call logic from plagiarismController.js
    const options = { sensitivity: 'medium' };
    
    console.log('\n3. Calling checkDuplicateContent...');
    const result = await documentAVLService.checkDuplicateContent(testText, {
      minSimilarity: options.sensitivity === 'high' ? 30 : 
                     options.sensitivity === 'low' ? 70 : 50, // medium = 50
      chunkSize: 50,
      maxResults: 20
    });

    console.log('\n4. API Response Analysis:');
    console.log(`   Duplicate percentage: ${result.duplicatePercentage}%`);
    console.log(`   Total matches: ${result.totalMatches}`);
    console.log(`   Checked documents: ${result.checkedDocuments}`);
    console.log(`   Total documents in system: ${result.totalDocumentsInSystem || 0}`);

    if (result.matches && result.matches.length > 0) {
      console.log('\n   📄 Matches found:');
      result.matches.forEach((match, index) => {
        console.log(`   ${index + 1}. Document: ${match.title}`);
        console.log(`      ID: ${match.documentId}`);
        console.log(`      Similarity: ${match.similarity}%`);
        console.log(`      Method: ${match.method}`);
        console.log(`      Source: ${match.source}`);
        console.log('      ---');
      });

      // Check for duplicates
      const documentIds = result.matches.map(m => m.documentId.toString());
      const uniqueDocumentIds = [...new Set(documentIds)];
      
      console.log(`\n5. Duplicate Check Results:`);
      console.log(`   Total matches returned: ${result.matches.length}`);
      console.log(`   Unique document IDs: ${uniqueDocumentIds.length}`);
      
      if (documentIds.length === uniqueDocumentIds.length) {
        console.log(`   ✅ SUCCESS: No duplicate documents found!`);
      } else {
        console.log(`   ❌ ISSUE: Found ${documentIds.length - uniqueDocumentIds.length} duplicate entries`);
        
        // Show which documents are duplicated
        const idCounts = {};
        documentIds.forEach(id => {
          idCounts[id] = (idCounts[id] || 0) + 1;
        });
        
        Object.entries(idCounts).forEach(([id, count]) => {
          if (count > 1) {
            console.log(`   ❌ Document ${id}: appears ${count} times`);
          }
        });
      }
    } else {
      console.log('\n   ℹ️ No matches found (similarity below threshold)');
    }

    // Test with lower threshold to ensure we get results
    if (result.matches.length === 0) {
      console.log('\n6. Testing with lower threshold (10%)...');
      const lowThresholdResult = await documentAVLService.checkDuplicateContent(testText, {
        minSimilarity: 10,
        maxResults: 20
      });
      
      console.log(`   Matches with 10% threshold: ${lowThresholdResult.matches.length}`);
      if (lowThresholdResult.matches.length > 0) {
        const uniqueIds = [...new Set(lowThresholdResult.matches.map(m => m.documentId.toString()))];
        console.log(`   Unique documents: ${uniqueIds.length}`);
        console.log(`   ${lowThresholdResult.matches.length === uniqueIds.length ? '✅ No duplicates' : '❌ Duplicates found'}`);
      }
    }

    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCheckDocumentSimilarity();