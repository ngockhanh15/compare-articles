const mongoose = require('mongoose');
const PlagiarismCheck = require('./be/models/PlagiarismCheck');
const PlagiarismDetectionService = require('./be/services/PlagiarismDetectionService');

// Kết nối database
mongoose.connect('mongodb://localhost:27017/filter_word', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function debugPlagiarismIssue() {
  try {
    console.log('🔍 DEBUGGING PLAGIARISM DETECTION ISSUE');
    console.log('=====================================');

    // 1. Kiểm tra dữ liệu trong database
    console.log('\n1. Checking database content...');
    const totalChecks = await PlagiarismCheck.countDocuments();
    console.log(`Total plagiarism checks in database: ${totalChecks}`);

    if (totalChecks > 0) {
      const sampleChecks = await PlagiarismCheck.find({})
        .select('originalText duplicatePercentage matches sources createdAt')
        .limit(5)
        .lean();
      
      console.log('\nSample checks:');
      sampleChecks.forEach((check, index) => {
        console.log(`${index + 1}. Text length: ${check.originalText?.length || 0} chars`);
        console.log(`   Duplicate %: ${check.duplicatePercentage}%`);
        console.log(`   Matches: ${check.matches?.length || 0}`);
        console.log(`   Created: ${check.createdAt}`);
        console.log(`   Text preview: ${check.originalText?.substring(0, 100)}...`);
        console.log('---');
      });
    }

    // 2. Kiểm tra PlagiarismDetectionService
    console.log('\n2. Checking PlagiarismDetectionService...');
    const service = new PlagiarismDetectionService();
    
    console.log('Initializing service...');
    await service.initialize();
    
    const stats = service.getStats();
    console.log('Service stats:', stats);

    // 3. Test với văn bản mẫu
    console.log('\n3. Testing with sample text...');
    const testText = "Đây là một đoạn văn bản mẫu để kiểm tra hệ thống phát hiện trùng lặp. Chúng ta sẽ xem liệu hệ thống có hoạt động đúng không.";
    
    console.log(`Testing text: "${testText}"`);
    console.log('Running plagiarism check...');
    
    const result = await service.checkPlagiarism(testText, { sensitivity: 'medium' });
    
    console.log('\nPlagiarism check result:');
    console.log('- Duplicate percentage:', result.duplicatePercentage);
    console.log('- Confidence:', result.confidence);
    console.log('- Matches found:', result.matches?.length || 0);
    console.log('- Sources:', result.sources?.length || 0);
    console.log('- Processing time:', result.processingTime, 'ms');
    console.log('- Total documents checked:', result.totalDocumentsChecked);
    console.log('- Total words checked:', result.totalWordsChecked);
    console.log('- Total sentences checked:', result.totalSentencesChecked);

    if (result.matches && result.matches.length > 0) {
      console.log('\nMatch details:');
      result.matches.forEach((match, index) => {
        console.log(`${index + 1}. Similarity: ${match.similarity}%`);
        console.log(`   Method: ${match.method}`);
        console.log(`   Text: ${match.text?.substring(0, 100)}...`);
      });
    }

    // 4. Test với văn bản đã có trong database
    if (totalChecks > 0) {
      console.log('\n4. Testing with existing database text...');
      const existingCheck = await PlagiarismCheck.findOne({}).lean();
      
      if (existingCheck && existingCheck.originalText) {
        const existingText = existingCheck.originalText.substring(0, 500); // Lấy 500 ký tự đầu
        console.log(`Testing with existing text: "${existingText.substring(0, 100)}..."`);
        
        const existingResult = await service.checkPlagiarism(existingText, { sensitivity: 'medium' });
        
        console.log('\nResult for existing text:');
        console.log('- Duplicate percentage:', existingResult.duplicatePercentage);
        console.log('- Matches found:', existingResult.matches?.length || 0);
        console.log('- Should be high similarity since text exists in database');
      }
    }

    // 5. Kiểm tra Vietnamese stopword service
    console.log('\n5. Checking Vietnamese stopword service...');
    const vietnameseStopwordService = require('./be/services/VietnameseStopwordService');
    
    if (!vietnameseStopwordService.initialized) {
      console.log('Initializing Vietnamese stopword service...');
      await vietnameseStopwordService.initialize();
    }
    
    const stopwordStats = vietnameseStopwordService.getStats();
    console.log('Stopword service stats:', stopwordStats);
    
    // Test meaningful words extraction
    const meaningfulWords = vietnameseStopwordService.extractMeaningfulWords(testText);
    console.log('Meaningful words from test text:', meaningfulWords);

    console.log('\n🎯 DIAGNOSIS COMPLETE');
    console.log('===================');
    
    if (totalChecks === 0) {
      console.log('❌ ISSUE FOUND: No data in database to compare against!');
      console.log('   Solution: Upload some documents first to build the comparison database.');
    } else if (stats.totalDocuments === 0) {
      console.log('❌ ISSUE FOUND: Service not properly initialized with database content!');
      console.log('   Solution: Check service initialization process.');
    } else if (result.duplicatePercentage === 0 && result.matches.length === 0) {
      console.log('❌ ISSUE FOUND: Algorithm not finding matches even with existing data!');
      console.log('   Solution: Check similarity calculation algorithms.');
    } else {
      console.log('✅ System appears to be working correctly.');
    }

  } catch (error) {
    console.error('Error during debugging:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugPlagiarismIssue();