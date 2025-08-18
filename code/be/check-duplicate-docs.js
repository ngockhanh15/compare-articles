require('dotenv').config();
const mongoose = require('mongoose');
const Document = require('./models/Document');

async function checkDuplicateDocuments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Tìm tất cả documents
    const allDocs = await Document.find({}).select('_id title fileName extractedText createdAt uploadedBy');
    console.log(`\nTotal documents: ${allDocs.length}`);
    
    // Group by title để tìm duplicates
    const groupedByTitle = {};
    allDocs.forEach(doc => {
      const title = doc.title || 'Untitled';
      if (!groupedByTitle[title]) {
        groupedByTitle[title] = [];
      }
      groupedByTitle[title].push(doc);
    });
    
    console.log('\n=== Documents Grouped by Title ===');
    Object.entries(groupedByTitle).forEach(([title, docs]) => {
      console.log(`\nTitle: "${title}" (${docs.length} documents)`);
      docs.forEach((doc, idx) => {
        console.log(`  ${idx + 1}. ID: ${doc._id}`);
        console.log(`     File: ${doc.fileName}`);
        console.log(`     Text: "${doc.extractedText?.substring(0, 50)}..."`);
        console.log(`     Created: ${doc.createdAt}`);
        console.log(`     User: ${doc.uploadedBy}`);
      });
      
      if (docs.length > 1) {
        console.log(`     🚨 DUPLICATE FOUND! ${docs.length} documents with same title`);
      }
    });
    
    // Tìm documents có cùng content
    console.log('\n=== Checking for Same Content ===');
    const contentMap = {};
    allDocs.forEach(doc => {
      const content = doc.extractedText?.trim() || '';
      if (content.length > 0) {
        if (!contentMap[content]) {
          contentMap[content] = [];
        }
        contentMap[content].push(doc);
      }
    });
    
    Object.entries(contentMap).forEach(([content, docs]) => {
      if (docs.length > 1) {
        console.log(`\nSame content (${docs.length} docs): "${content.substring(0, 30)}..."`);
        docs.forEach((doc, idx) => {
          console.log(`  ${idx + 1}. ${doc.title} (${doc._id}) - ${doc.createdAt}`);
        });
      }
    });
    
    // Ask if user wants to remove duplicates
    console.log('\n=== Summary ===');
    const duplicateTitles = Object.entries(groupedByTitle).filter(([title, docs]) => docs.length > 1);
    console.log(`Found ${duplicateTitles.length} titles with duplicate documents`);
    
    if (duplicateTitles.length > 0) {
      console.log('\nTo remove duplicates, you can:');
      console.log('1. Keep the oldest document for each title');
      console.log('2. Keep the newest document for each title');
      console.log('3. Manual review each case');
      
      // Optional: Auto-remove duplicates (commented out for safety)
      /*
      for (const [title, docs] of duplicateTitles) {
        if (docs.length > 1) {
          // Sort by creation date, keep oldest, remove others
          docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          const toKeep = docs[0];
          const toRemove = docs.slice(1);
          
          console.log(`\nRemoving ${toRemove.length} duplicate(s) for "${title}", keeping ${toKeep._id}`);
          for (const doc of toRemove) {
            await Document.findByIdAndDelete(doc._id);
            console.log(`  Removed: ${doc._id}`);
          }
        }
      }
      */
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkDuplicateDocuments();
