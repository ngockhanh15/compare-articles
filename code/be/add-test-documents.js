require('dotenv').config();
const mongoose = require('mongoose');
const Document = require('./models/Document');
const User = require('./models/User');

async function addTestDocuments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('=== Adding Test Documents ===');
    
    // Find or create a test user
    let testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      testUser = new User({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        isEmailVerified: true
      });
      await testUser.save();
      console.log('Created test user');
    }
    
    // Test documents to add
    const testDocs = [
      {
        title: 'Document 1 - Love Text',
        extractedText: 'Tôi rất yêu em. Em là người con gái tuyệt vời nhất trên đời. Tình yêu của chúng ta sẽ mãi mãi bền vững.',
        fileType: 'txt',
        mimeType: 'text/plain',
        fileName: 'love-text-1.txt',
        originalFileName: 'love-text-1.txt',
        filePath: '/uploads/love-text-1.txt'
      },
      {
        title: 'Document 2 - Similar Love Text', 
        extractedText: 'Anh yêu em nhiều lắm. Em là thiên thần của anh. Tình cảm này sẽ không bao giờ thay đổi.',
        fileType: 'txt',
        mimeType: 'text/plain',
        fileName: 'love-text-2.txt',
        originalFileName: 'love-text-2.txt',
        filePath: '/uploads/love-text-2.txt'
      },
      {
        title: 'Document 3 - Weather Text',
        extractedText: 'Hôm nay trời đẹp quá. Tôi muốn đi dạo trong công viên. Thời tiết mùa xuân thật tuyệt vời.',
        fileType: 'txt',
        mimeType: 'text/plain',
        fileName: 'weather-text.txt',
        originalFileName: 'weather-text.txt',
        filePath: '/uploads/weather-text.txt'
      },
      {
        title: 'Document 4 - Short Love',
        extractedText: 'Tôi yêu em.',
        fileType: 'txt',
        mimeType: 'text/plain',
        fileName: 'short-love.txt',
        originalFileName: 'short-love.txt',
        filePath: '/uploads/short-love.txt'
      },
      {
        title: 'Document 5 - Technology', 
        extractedText: 'Trí tuệ nhân tạo đang phát triển mạnh mẽ. Các hệ thống thông minh ngày càng được ứng dụng rộng rãi.',
        fileType: 'txt',
        mimeType: 'text/plain',
        fileName: 'tech-text.txt',
        originalFileName: 'tech-text.txt',
        filePath: '/uploads/tech-text.txt'
      }
    ];
    
    // Clear existing documents
    await Document.deleteMany({});
    console.log('Cleared existing documents');
    
    // Add new test documents
    for (const docData of testDocs) {
      const doc = new Document({
        ...docData,
        uploadedBy: testUser._id,
        fileSize: docData.extractedText.length,
        textLength: docData.extractedText.length
      });
      
      await doc.save();
      console.log(`Added: ${doc.title}`);
      console.log(`  Text: ${doc.extractedText}`);
      console.log(`  ID: ${doc._id}`);
    }
    
    console.log('\n=== Documents Added Successfully ===');
    const totalDocs = await Document.countDocuments();
    console.log(`Total documents in database: ${totalDocs}`);
    
  } catch (error) {
    console.error('Error adding test documents:', error);
  } finally {
    await mongoose.disconnect();
  }
}

addTestDocuments();
