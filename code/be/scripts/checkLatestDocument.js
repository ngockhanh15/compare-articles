const mongoose = require('mongoose');
const Document = require('../models/Document');

async function checkLatestDocument() {
  try {
    console.log('=== KẾT NỐI DATABASE ===');
    require('dotenv').config();
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB');
    
    console.log('\n=== KIỂM TRA DOCUMENT MỚI NHẤT ===');
    
    // Tìm document mới nhất
    const latestDoc = await Document.findOne().sort({ createdAt: -1 });
    
    if (latestDoc) {
      console.log(`Document ID: ${latestDoc._id}`);
      console.log(`Title: ${latestDoc.title}`);
      console.log(`Created: ${latestDoc.createdAt}`);
      console.log(`Status: ${latestDoc.status}`);
      console.log(`Text: "${latestDoc.extractedText}"`);
      
      if (latestDoc.avlTreeData) {
        console.log('\n=== AVL TREE DATA ===');
        console.log(`Word count: ${latestDoc.avlTreeData.hashVector.length}`);
        console.log('Hash Vector:');
        latestDoc.avlTreeData.hashVector.forEach((item, index) => {
          console.log(`  ${index}: "${item.word}" -> ${item.hash}`);
        });
        
        // Kiểm tra xem có cụm từ nào được bảo vệ
        const phrases = latestDoc.avlTreeData.hashVector.filter(item => item.word.includes(' '));
        if (phrases.length > 0) {
          console.log('\n✅ CÁC CỤM TỪ ĐƯỢC BẢO VỆ:');
          phrases.forEach(phrase => {
            console.log(`  - "${phrase.word}"`);
          });
        } else {
          console.log('\n❌ KHÔNG CÓ CỤM TỪ NÀO ĐƯỢC BẢO VỆ');
        }
      } else {
        console.log('❌ Không có AVL tree data');
      }
    } else {
      console.log('❌ Không tìm thấy document nào');
    }
    
  } catch (error) {
    console.error('Lỗi:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkLatestDocument();
