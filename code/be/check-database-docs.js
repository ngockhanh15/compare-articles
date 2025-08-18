require('dotenv').config();
const mongoose = require('mongoose');
const Document = require('./models/Document');

async function checkDatabaseDocuments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('=== Checking Database Documents ===');
    
    // Find all documents with title "123"
    const docs123 = await Document.find({ title: "123" });
    console.log(`Found ${docs123.length} documents with title "123"`);
    
    docs123.forEach((doc, idx) => {
      console.log(`\nDocument ${idx + 1}:`);
      console.log(`  ID: ${doc._id}`);
      console.log(`  Title: ${doc.title}`);
      console.log(`  FileName: ${doc.fileName}`);
      console.log(`  OriginalFileName: ${doc.originalFileName}`);
      console.log(`  FilePath: ${doc.filePath}`);
      console.log(`  ExtractedText: "${doc.extractedText}"`);
      console.log(`  CreatedAt: ${doc.createdAt}`);
      console.log(`  UploadedBy: ${doc.uploadedBy}`);
    });
    
    // Check all documents
    console.log('\n=== All Documents in Database ===');
    const allDocs = await Document.find({}).select('_id title fileName extractedText createdAt');
    console.log(`Total documents: ${allDocs.length}`);
    
    allDocs.forEach((doc, idx) => {
      console.log(`${idx + 1}. ID: ${doc._id}`);
      console.log(`   Title: ${doc.title}`);
      console.log(`   FileName: ${doc.fileName}`);
      console.log(`   Text: "${doc.extractedText?.substring(0, 50)}..."`);
      console.log(`   Created: ${doc.createdAt}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkDatabaseDocuments();
