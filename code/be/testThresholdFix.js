const mongoose = require('mongoose');
const PlagiarismDetectionService = require('./services/PlagiarismDetectionService');

async function testThresholdFix() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/compare-articles', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Initialize service
    const plagiarismService = new PlagiarismDetectionService();
    await plagiarismService.initialize();
    console.log('✅ PlagiarismDetectionService initialized');

    // Test text that should have some similarity
    const testText = "Tôi là một sinh viên đại học. Tôi đang học về công nghệ thông tin.";
    
    console.log('\n🔍 Testing plagiarism detection with database threshold:');
    console.log(`📝 Test text: "${testText}"`);
    
    // Call without minSimilarity - should use database threshold (20%)
    const result = await plagiarismService.checkPlagiarism(testText, {
      maxResults: 5
    });
    
    console.log('\n📊 Results:');
    console.log(`- Duplicate percentage: ${result.duplicatePercentage}%`);
    console.log(`- Confidence: ${result.confidence}%`);
    console.log(`- Matches found: ${result.matches ? result.matches.length : 0}`);
    
    if (result.matches && result.matches.length > 0) {
      console.log('\n🎯 Top matches:');
      result.matches.slice(0, 3).forEach((match, index) => {
        console.log(`  ${index + 1}. ${match.text} - ${match.similarity}% similarity`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testThresholdFix();