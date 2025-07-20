const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Document = require('./models/Document');

async function checkDocuments() {
  try {
    console.log('🔍 Checking documents in database for comparison...\n');
    
    // Tổng số documents
    const totalDocs = await Document.countDocuments();
    console.log(`📊 Total documents in database: ${totalDocs}`);
    
    // Documents có status processed
    const processedDocs = await Document.countDocuments({ status: 'processed' });
    console.log(`✅ Documents with status 'processed': ${processedDocs}`);
    
    // Documents có extractedText
    const docsWithText = await Document.countDocuments({ 
      extractedText: { $exists: true, $ne: null, $ne: '' } 
    });
    console.log(`📝 Documents with extractedText: ${docsWithText}`);
    
    // Documents phù hợp cho comparison
    const suitableDocs = await Document.find({
      $or: [
        { status: 'processed' },
        { status: { $exists: false } },
        { extractedText: { $exists: true, $ne: null, $ne: '' } }
      ]
    }).limit(10);
    
    console.log(`\n🎯 Documents suitable for comparison: ${suitableDocs.length}`);
    
    if (suitableDocs.length > 0) {
      console.log('\n📋 Sample documents:');
      suitableDocs.forEach((doc, index) => {
        console.log(`${index + 1}. ${doc.originalFileName || 'Unknown'}`);
        console.log(`   - ID: ${doc._id}`);
        console.log(`   - Status: ${doc.status || 'undefined'}`);
        console.log(`   - Text length: ${doc.extractedText?.length || 0} characters`);
        console.log(`   - Created: ${doc.createdAt}`);
        if (doc.extractedText && doc.extractedText.length > 0) {
          console.log(`   - Preview: ${doc.extractedText.substring(0, 100)}...`);
        }
        console.log('');
      });
    } else {
      console.log('\n❌ No documents found suitable for comparison!');
      console.log('💡 You need to upload some documents first.');
    }
    
  } catch (error) {
    console.error('❌ Error checking documents:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkDocuments();