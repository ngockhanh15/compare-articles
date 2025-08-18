const mongoose = require('mongoose');
const Document = require('./models/Document');

async function checkDocuments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plagiarism_checker');
    
    console.log('=== Searching for documents containing target text ===');
    
    const searchTexts = [
      'tôi rất yêu em',
      'yêu em', 
      'tôi yêu',
      'rất yêu'
    ];
    
    for (const searchText of searchTexts) {
      console.log(`\nSearching for: "${searchText}"`);
      const docs = await Document.find({
        $or: [
          { extractedText: { $regex: searchText, $options: 'i' } },
          { title: { $regex: searchText, $options: 'i' } }
        ]
      }).select('title extractedText createdAt uploadedBy').limit(5);
      
      console.log(`Found ${docs.length} documents`);
      docs.forEach((doc, idx) => {
        console.log(`  ${idx + 1}. ${doc.title}`);
        console.log(`     Text preview: ${doc.extractedText?.substring(0, 100)}...`);
        console.log(`     Created: ${doc.createdAt}`);
      });
    }
    
    console.log('\n=== All documents in database ===');
    const allDocs = await Document.find({}).select('title extractedText createdAt').limit(10);
    console.log(`Total documents in database: ${await Document.countDocuments()}`);
    allDocs.forEach((doc, idx) => {
      console.log(`  ${idx + 1}. ${doc.title}`);
      console.log(`     Text: ${doc.extractedText?.substring(0, 150)}...`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkDocuments();
