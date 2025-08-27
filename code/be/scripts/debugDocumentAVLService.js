const mongoose = require('mongoose');
const documentAVLService = require('../services/DocumentAVLService');
require('dotenv').config();

async function debugDocumentAVLService() {
  console.log('🔍 Debugging DocumentAVLService...');
  
  try {
    // Kết nối database sử dụng MONGODB_URI từ .env
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    console.log('Connecting to MongoDB with URI:', process.env.MONGODB_URI.substring(0, 20) + '...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Khởi tạo service
    await documentAVLService.initialize();
    console.log('✅ DocumentAVLService initialized');

    // Test với text có 2 câu trùng lặp ở 2 documents khác nhau
    const testText = "Tôi là khánh. 10 giờ sáng nay, tâm bão số 3 (Wipha) ở vào khoảng 21,2 độ vĩ bắc và 109,6 độ kinh đông, cách Quảng Ninh khoảng 190 km, cách Hải Phòng 310 km.";
    
    console.log('\n📝 Testing text:', testText);
    console.log('Text length:', testText.length);

    // Kiểm tra trùng lặp
    const result = await documentAVLService.checkDuplicateContent(testText, {
      minSimilarity: 30,
      maxResults: 20
    });

    console.log('\n📊 DocumentAVLService Result:');
    console.log('- Dtotal:', result.dtotal + '%');
    console.log('- Total Matches:', result.totalMatches);
    console.log('- Checked Documents:', result.checkedDocuments);
    console.log('- Total Duplicated Sentences:', result.totalDuplicatedSentences);
    console.log('- Total Input Sentences:', result.totalInputSentences);

    if (result.matches && result.matches.length > 0) {
      console.log('\n📋 All Matches Found:');
      result.matches.forEach((match, index) => {
        console.log(`\nMatch ${index + 1}:`);
        console.log(`- Document ID: ${match.documentId}`);
        console.log(`- Title: ${match.title}`);
        console.log(`- Similarity: ${match.similarity}%`);
        console.log(`- Duplicate Sentences: ${match.duplicateSentences}`);
        console.log(`- DAB Percent: ${match.dabPercent}%`);
        
        if (match.duplicateSentencesDetails && match.duplicateSentencesDetails.length > 0) {
          console.log('- Duplicate Sentences Details:');
          match.duplicateSentencesDetails.forEach((detail, idx) => {
            console.log(`  ${idx + 1}. Input Sentence Index: ${detail.inputSentenceIndex}`);
            console.log(`     Input: "${detail.inputSentence}"`);
            console.log(`     Source: "${detail.sourceSentence || detail.docSentence}"`);
            console.log(`     Similarity: ${detail.similarity}%`);
            console.log(`     Matched Tokens: ${detail.matchedTokens}/${detail.totalTokens}`);
          });
        } else {
          console.log('- No duplicate sentence details');
        }
      });
    } else {
      console.log('\n❌ No matches found');
    }

    // Kiểm tra thống kê cây AVL
    const treeStats = documentAVLService.getTreeStats();
    console.log('\n🌳 AVL Tree Stats:');
    console.log('- Total Documents:', treeStats.totalDocuments);
    console.log('- Total Words:', treeStats.totalWords);
    console.log('- Tree Height:', treeStats.treeHeight);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run debug if called directly
if (require.main === module) {
  debugDocumentAVLService();
}
