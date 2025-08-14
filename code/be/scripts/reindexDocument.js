const mongoose = require('mongoose');
const Document = require('../models/Document');
const documentAVLService = require('../services/DocumentAVLService');

async function reindexDocument() {
  try {
    console.log('=== KẾT NỐI DATABASE ===');
    require('dotenv').config();
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB');
    
    console.log('\n=== KHỞI TẠO SERVICES ===');
    if (!documentAVLService.initialized) {
      await documentAVLService.initialize();
    }
    
    console.log('\n=== TÌM VÀ REINDEX DOCUMENT ===');
    const doc = await Document.findById('689b28cf0244a730687600a8');
    
    if (doc) {
      console.log(`Found document: ${doc.title}`);
      console.log(`Current AVL data word count: ${doc.avlTreeData.hashVector.length}`);
      
      console.log('\n=== TẠO LẠI AVL TREE DATA ===');
      const newAvlTreeData = await documentAVLService.addDocumentToTree(doc);
      
      console.log(`New AVL data word count: ${newAvlTreeData.hashVector.length}`);
      console.log('New hash vector:');
      newAvlTreeData.hashVector.forEach((item, index) => {
        console.log(`  ${index}: "${item.word}" -> ${item.hash}`);
      });
      
      // Cập nhật document
      doc.avlTreeData = newAvlTreeData;
      await doc.save();
      
      console.log('\n✅ Document đã được reindex thành công!');
      
      // Kiểm tra cụm từ được bảo vệ
      const phrases = newAvlTreeData.hashVector.filter(item => item.word.includes(' '));
      if (phrases.length > 0) {
        console.log('\n🎉 CÁC CỤM TỪ ĐƯỢC BẢO VỆ:');
        phrases.forEach(phrase => {
          console.log(`  - "${phrase.word}"`);
        });
      }
      
    } else {
      console.log('❌ Không tìm thấy document');
    }
    
  } catch (error) {
    console.error('Lỗi:', error);
  } finally {
    await mongoose.connection.close();
  }
}

reindexDocument();
