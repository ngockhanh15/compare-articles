const mongoose = require('mongoose');
const documentAVLService = require('../services/DocumentAVLService');
const Document = require('../models/Document');
const vietnameseStopwordService = require('../services/VietnameseStopwordService');

async function testAVLWithPhrases() {
  try {
    console.log('=== KẾT NỐI DATABASE ===');
    // Kết nối MongoDB
    await mongoose.connect('mongodb://localhost:27017/compare-articles', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Đã kết nối MongoDB');
    
    console.log('\n=== KHỞI TẠO SERVICES ===');
    
    // Khởi tạo Vietnamese stopword service
    if (!vietnameseStopwordService.initialized) {
      await vietnameseStopwordService.initialize();
    }
    
    // Khởi tạo Document AVL service
    if (!documentAVLService.initialized) {
      await documentAVLService.initialize();
    }
    
    console.log('\n=== TEST TEXT ===');
    const testText = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
    console.log(`Text gốc: ${testText}`);
    
    console.log('\n=== TOKENIZE VỚI PHRASE PROTECTION ===');
    const tokens = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(testText);
    console.log(`Tokens: ${tokens}`);
    
    console.log('\n=== TẠO LẠI AVL TREE CHO DOCUMENT ===');
    // Tìm document với ID cụ thể
    const document = await Document.findById('689affd57944f766fe4247a6');
    if (document) {
      console.log(`Found document: ${document.title}`);
      console.log(`Extracted text: ${document.extractedText}`);
      
      // Tạo lại AVL tree data với phrase protection
      const avlTreeData = await documentAVLService.createDocumentVector(
        document._id,
        document.title,
        document.extractedText,
        document.fileType,
        document.uploadedBy,
        document.createdAt
      );
      
      console.log('\n=== AVL TREE DATA MỚI ===');
      console.log('Hash Vector:');
      avlTreeData.hashVector.forEach((item, index) => {
        console.log(`  ${index}: "${item.word}" -> ${item.hash}`);
      });
      
      console.log('\n=== CẬP NHẬT DATABASE ===');
      // Cập nhật document với AVL tree data mới
      document.avlTreeData = avlTreeData;
      await document.save();
      
      console.log('✅ Document đã được cập nhật thành công!');
    } else {
      console.log('❌ Không tìm thấy document với ID đã cho');
    }
    
  } catch (error) {
    console.error('Lỗi:', error);
  } finally {
    // Đóng kết nối database
    await mongoose.connection.close();
    process.exit(0);
  }
}

testAVLWithPhrases();
