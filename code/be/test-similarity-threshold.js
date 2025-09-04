const dotenv = require("dotenv");
const connectDB = require("./config/database");
const documentAVLService = require("./services/DocumentAVLService");
const vietnameseStopwordService = require("./services/VietnameseStopwordService");

// Load environment variables
dotenv.config();

const testSimilarityThreshold = async () => {
  try {
    console.log("🧪 Testing Similarity Threshold (50% minimum)...\n");
    
    // Connect to database and initialize services
    await connectDB();
    await vietnameseStopwordService.initialize();
    await documentAVLService.initialize();
    
    console.log("✅ Services initialized successfully\n");
    
    // Test cases with different similarity levels
    const testCases = [
      {
        name: "100% match (should be detected)",
        text: "tôi yêu em",
        expectedDetection: true
      },
      {
        name: "High similarity ~80% (should be detected)", 
        text: "tôi rất yêu em nhiều",
        expectedDetection: true
      },
      {
        name: "Medium similarity ~60% (should be detected)",
        text: "tôi yêu em rất nhiều",
        expectedDetection: true
      },
      {
        name: "Low similarity ~40% (should NOT be detected)",
        text: "tôi thích em",
        expectedDetection: false
      },
      {
        name: "Very low similarity ~20% (should NOT be detected)",
        text: "em là người tốt",
        expectedDetection: false
      },
      {
        name: "No similarity (should NOT be detected)",
        text: "hôm nay trời đẹp",
        expectedDetection: false
      }
    ];
    
    console.log("📊 Testing with 50% minimum similarity threshold:\n");
    
    for (const testCase of testCases) {
      console.log(`🔍 ${testCase.name}:`);
      console.log(`   Input: "${testCase.text}"`);
      
      try {
        const result = await documentAVLService.checkDuplicateContent(testCase.text, {
          minSimilarity: 50  // Explicitly set 50% threshold
        });
        
        const hasMatches = result.matches && result.matches.length > 0;
        const duplicatePercentage = result.duplicatePercentage || 0;
        
        console.log(`   Result: ${duplicatePercentage}% similarity`);
        console.log(`   Matches found: ${hasMatches ? 'YES' : 'NO'}`);
        console.log(`   Expected detection: ${testCase.expectedDetection ? 'YES' : 'NO'}`);
        
        const testPassed = hasMatches === testCase.expectedDetection;
        console.log(`   Test result: ${testPassed ? '✅ PASS' : '❌ FAIL'}\n`);
        
        if (hasMatches && result.matches.length > 0) {
          const topMatch = result.matches[0];
          console.log(`   Top match: ${topMatch.title} (${topMatch.similarity}%)`);
          console.log(`   Duplicate sentences: ${topMatch.duplicateSentences || 0}\n`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
      }
    }
    
    console.log("🏁 Similarity threshold test completed!");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    process.exit(0);
  }
};

testSimilarityThreshold();
