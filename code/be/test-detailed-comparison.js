require('dotenv').config();
const mongoose = require('mongoose');
const PlagiarismCheck = require('./models/PlagiarismCheck');

// Test script để kiểm tra getDetailedComparison
async function testDetailedComparison() {
  try {
    // Kết nối MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Connected to MongoDB');
    
    // Tìm một plagiarism check để test
    const checks = await PlagiarismCheck.find().limit(5).sort({ createdAt: -1 });
    
    console.log(`Found ${checks.length} plagiarism checks`);
    
    if (checks.length > 0) {
      const testCheck = checks[0];
      console.log('Test check:', {
        id: testCheck._id,
        textLength: testCheck.originalText?.length,
        duplicatePercentage: testCheck.duplicatePercentage,
        matchesCount: testCheck.matches?.length
      });
      
      // Test logic tìm document tương tự
      const Document = require('./models/Document');
      const documents = await Document.find({ 
        status: 'processed',
        extractedText: { $exists: true, $ne: null, $ne: '' }
      }).limit(10);
      
      console.log(`Found ${documents.length} documents in database`);
      
      if (documents.length > 0) {
        console.log('Sample documents:');
        documents.slice(0, 3).forEach((doc, index) => {
          console.log(`${index + 1}. ${doc.originalFileName} - ${doc.extractedText?.length} chars`);
        });
      }
    }
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testDetailedComparison();