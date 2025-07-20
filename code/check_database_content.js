const mongoose = require('mongoose');
const Document = require('./be/models/Document');
require('dotenv').config();

async function checkDatabaseContent() {
  console.log('=== KIỂM TRA NỘI DUNG DATABASE ===\n');
  
  try {
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected');
    
    // Lấy tất cả documents
    const documents = await Document.find({}).limit(10);
    console.log(`📄 Found ${documents.length} documents in database:\n`);
    
    documents.forEach((doc, index) => {
      console.log(`${index + 1}. Document ID: ${doc._id}`);
      console.log(`   Name: ${doc.name || 'No name'}`);
      console.log(`   Status: ${doc.status}`);
      console.log(`   Created: ${doc.createdAt}`);
      console.log(`   Text length: ${doc.extractedText ? doc.extractedText.length : 'No text'}`);
      
      if (doc.extractedText) {
        const preview = doc.extractedText.substring(0, 100);
        console.log(`   Text preview: "${preview}${doc.extractedText.length > 100 ? '...' : ''}"`);
        
        // Kiểm tra xem có phải doc1 không
        const doc1 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
        if (doc.extractedText.includes("Khánh") || doc.extractedText.includes("thể thao")) {
          console.log(`   🎯 POTENTIAL MATCH with doc1!`);
          console.log(`   📝 Full text: "${doc.extractedText}"`);
          console.log(`   🔍 Exact match: ${doc.extractedText.trim() === doc1.trim()}`);
          console.log(`   📏 Length comparison: DB=${doc.extractedText.length}, Expected=${doc1.length}`);
        }
      }
      console.log();
    });
    
    // Tìm documents có chứa từ khóa
    console.log('🔍 Searching for documents containing "thể thao" or "Khánh":');
    const searchResults = await Document.find({
      $or: [
        { extractedText: { $regex: "thể thao", $options: "i" } },
        { extractedText: { $regex: "Khánh", $options: "i" } }
      ]
    });
    
    console.log(`Found ${searchResults.length} documents with keywords:`);
    searchResults.forEach((doc, index) => {
      console.log(`${index + 1}. "${doc.extractedText}"`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Database disconnected');
  }
}

checkDatabaseContent().catch(console.error);