const mongoose = require('mongoose');
const documentAVLService = require('../services/DocumentAVLService');
const Document = require('../models/Document');
const GlobalAVLTreeUnified = require('../models/GlobalAVLTreeUnified');
require('dotenv').config();

async function testUnifiedPlagiarismDetection() {
  try {
    console.log('🕵️‍♂️ Testing Plagiarism Detection with Unified Model...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plagiarism_checker', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Initialize service
    console.log('🚀 Initializing DocumentAVLService...');
    await documentAVLService.initialize();
    
    const initialStats = documentAVLService.getTreeStats();
    console.log('Initial tree stats:', initialStats);
    console.log(`Tokenization samples: ${documentAVLService.tokenizationSamples.length}\n`);

    // Test texts
    const testTexts = [
      {
        name: "Exact Match Test",
        text: "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng",
        expectedSimilarity: 100
      },
      {
        name: "Partial Match Test",
        text: "Tôi là Khánh, tôi ưa thích thể thao, hôm nay tôi buồn",
        expectedSimilarity: 100 // This is exactly Document7
      },
      {
        name: "High Similarity Test",
        text: "Khánh ưa thích thể thao và đá bóng rất nhiều",
        expectedSimilarity: 70 // Many common words
      },
      {
        name: "Weather Similar Test", 
        text: "Dự báo thời tiết hôm nay có thể mưa to",
        expectedSimilarity: 100 // This is exactly Document5
      },
      {
        name: "Phrase Combination Test",
        text: "Hôm nay thời tiết đẹp, tôi ưa thích đá bóng",
        expectedSimilarity: 60 // Mixed phrases
      },
      {
        name: "No Match Test",
        text: "Học máy và trí tuệ nhân tạo đang phát triển mạnh",
        expectedSimilarity: 0 // Completely different
      }
    ];

    console.log('🔍 Testing Plagiarism Detection:\n');

    for (const testCase of testTexts) {
      console.log(`📝 ${testCase.name}:`);
      console.log(`Input: "${testCase.text}"`);
      
      try {
        const result = await documentAVLService.checkDuplicateContent(testCase.text);
        
        console.log(`Results found: ${result.matches.length}`);
        console.log(`Overall similarity: ${result.overallSimilarity}%`);
        
        if (result.matches.length > 0) {
          console.log('Top matches:');
          result.matches.slice(0, 3).forEach((match, index) => {
            console.log(`  ${index + 1}. Document: ${match.title}`);
            console.log(`     Similarity: ${match.similarity}%`);
            console.log(`     Matched sentences: ${match.matchedSentenceCount}/${match.totalSentences}`);
            
            if (match.details && match.details.length > 0) {
              console.log(`     Sample matches:`);
              match.details.slice(0, 2).forEach((detail, idx) => {
                console.log(`       - "${detail.inputSentence}"`);
                console.log(`         → "${detail.matchedSentence}" (${detail.similarity}%)`);
              });
            }
          });
        } else {
          console.log('  No matches found');
        }
        
        // Check if result meets expectation
        const meetsExpectation = result.overallSimilarity >= (testCase.expectedSimilarity - 10); // Allow 10% tolerance
        console.log(`✨ Expected: ≥${testCase.expectedSimilarity}%, Got: ${result.overallSimilarity}% ${meetsExpectation ? '✅' : '❌'}`);
        
      } catch (error) {
        console.error(`❌ Error in ${testCase.name}:`, error.message);
      }
      
      console.log(''); // Empty line for separation
    }

    // Test tokenization statistics
    console.log('📊 Tokenization Analysis:');
    
    if (documentAVLService.tokenizationSamples.length > 0) {
      let totalWords = 0;
      let preservedPhrases = 0;
      const methodCount = {};
      
      documentAVLService.tokenizationSamples.forEach(sample => {
        sample.tokenizedWords.forEach(token => {
          totalWords++;
          if (token.isPreservedPhrase) preservedPhrases++;
          methodCount[token.method] = (methodCount[token.method] || 0) + 1;
        });
      });
      
      console.log(`Total words processed: ${totalWords}`);
      console.log(`Preserved phrases: ${preservedPhrases} (${((preservedPhrases/totalWords)*100).toFixed(1)}%)`);
      console.log('Tokenization methods:', methodCount);
    }

    // Test unified model data integrity
    console.log('\n🔍 Unified Model Data Integrity:');
    
    const unifiedTree = await GlobalAVLTreeUnified.getLatest();
    if (unifiedTree) {
      console.log(`Tree version: ${unifiedTree.version}`);
      console.log(`Nodes: ${unifiedTree.nodes.length}`);
      console.log(`Documents: ${unifiedTree.documentInfo.length}`);
      console.log(`Tokenization samples: ${unifiedTree.tokenizationSamples.length}`);
      console.log('Token statistics:', unifiedTree.metadata.tokenStats);
      
      // Check data consistency
      const nodesWithTokenInfo = unifiedTree.nodes.filter(node => 
        node.originalWord && node.tokenInfo
      ).length;
      
      console.log(`Nodes with complete token info: ${nodesWithTokenInfo}/${unifiedTree.nodes.length}`);
      
      if (nodesWithTokenInfo === unifiedTree.nodes.length) {
        console.log('✅ All nodes have complete token information');
      } else {
        console.log('⚠️  Some nodes missing token information');
      }
    }

    // Performance test
    console.log('\n⚡ Performance Test:');
    
    const performanceText = "Tôi ưa thích thể thao và đá bóng, hôm nay thời tiết đẹp";
    const startTime = Date.now();
    
    const perfResult = await documentAVLService.checkDuplicateContent(performanceText);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Detection time: ${duration}ms`);
    console.log(`Results: ${perfResult.matches.length} matches found`);
    console.log(`Overall similarity: ${perfResult.overallSimilarity}%`);
    
    if (duration < 1000) {
      console.log('✅ Performance: Excellent (< 1s)');
    } else if (duration < 3000) {
      console.log('✅ Performance: Good (< 3s)');
    } else {
      console.log('⚠️  Performance: Slow (> 3s)');
    }

    console.log('\n✅ Unified plagiarism detection test completed successfully!');

  } catch (error) {
    console.error('❌ Error in unified plagiarism detection test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📤 Disconnected from MongoDB');
  }
}

// Run test if called directly
if (require.main === module) {
  testUnifiedPlagiarismDetection()
    .then(() => {
      console.log('\n🎉 Test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = testUnifiedPlagiarismDetection;
