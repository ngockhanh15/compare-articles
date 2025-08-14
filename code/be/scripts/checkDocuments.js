const mongoose = require('mongoose');
const Document = require('../models/Document');

async function checkDocuments() {
  try {
    console.log('=== KẾT NỐI DATABASE ===');
    await mongoose.connect('mongodb://localhost:27017/compare-articles');
    console.log('✅ Đã kết nối MongoDB');
    
    console.log('\n=== KIỂM TRA DOCUMENTS ===');
    
    // Đếm tất cả documents
    const totalCount = await Document.countDocuments();
    console.log(`Tổng số documents: ${totalCount}`);
    
    // Tìm documents có extractedText
    const withTextCount = await Document.countDocuments({
      extractedText: { $exists: true, $ne: "" }
    });
    console.log(`Documents có extractedText: ${withTextCount}`);
    
    // Tìm documents đã processed
    const processedCount = await Document.countDocuments({
      status: "processed"
    });
    console.log(`Documents đã processed: ${processedCount}`);
    
    // Lấy một vài documents đầu để xem
    const docs = await Document.find().limit(3).select('_id title status extractedText');
    console.log('\n=== MỘT SỐ DOCUMENTS ===');
    docs.forEach(doc => {
      console.log(`ID: ${doc._id}`);
      console.log(`Title: ${doc.title}`);
      console.log(`Status: ${doc.status}`);
      console.log(`ExtractedText length: ${doc.extractedText ? doc.extractedText.length : 'null'}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Lỗi:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkDocuments();
