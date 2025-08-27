const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabaseDocs() {
  console.log('🔍 Checking documents in database...');
  
  try {
    // Kết nối database sử dụng MONGODB_URI từ .env
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    console.log('Connecting to MongoDB with URI:', process.env.MONGODB_URI.substring(0, 20) + '...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Import Document model
    const Document = require('../models/Document');
    
    // Đếm tổng số documents
    const totalDocs = await Document.countDocuments();
    console.log(`📊 Total documents in database: ${totalDocs}`);
    
    if (totalDocs > 0) {
      // Lấy một số documents mẫu
      const sampleDocs = await Document.find().limit(5).select('title fileName extractedText status');
      
      console.log('\n📋 Sample documents:');
      sampleDocs.forEach((doc, index) => {
        console.log(`\nDocument ${index + 1}:`);
        console.log(`- ID: ${doc._id}`);
        console.log(`- Title: ${doc.title || 'N/A'}`);
        console.log(`- File Name: ${doc.fileName || 'N/A'}`);
        console.log(`- Status: ${doc.status || 'N/A'}`);
        console.log(`- Content Length: ${doc.extractedText ? doc.extractedText.length : 0} characters`);
        if (doc.extractedText) {
          console.log(`- Content Preview: "${doc.extractedText.substring(0, 100)}..."`);
        }
      });
      
      // Kiểm tra documents có status "processed"
      const processedDocs = await Document.countDocuments({ status: 'processed' });
      console.log(`\n📈 Processed documents: ${processedDocs}`);
      
      // Kiểm tra documents có extractedText
      const docsWithText = await Document.countDocuments({ extractedText: { $exists: true, $ne: null } });
      console.log(`📝 Documents with extracted text: ${docsWithText}`);
      
    } else {
      console.log('❌ No documents found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run check if called directly
if (require.main === module) {
  checkDatabaseDocs();
}
