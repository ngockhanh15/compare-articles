const vietnameseStopwordService = require('../services/VietnameseStopwordService');
const { TextHasher } = require('../utils/TreeAVL');

async function testPhraseProtectionInHash() {
  try {
    console.log('=== KHỞI TẠO SERVICES ===');
    await vietnameseStopwordService.initialize();
    
    console.log('\n=== TEST TEXT ===');
    const testText = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
    console.log(`Text gốc: ${testText}`);
    
    console.log('\n=== SO SÁNH CÁC METHOD TOKENIZE ===');
    
    // Method cũ - không bảo vệ cụm từ
    console.log('\n1. tokenizeAndFilterUnique (cũ):');
    const tokensOld = vietnameseStopwordService.tokenizeAndFilterUnique(testText);
    console.log(`   Tokens: [${tokensOld.join(', ')}]`);
    
    // Method mới - có bảo vệ cụm từ
    console.log('\n2. tokenizeAndFilterUniqueWithPhrases (mới):');
    const tokensNew = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(testText);
    console.log(`   Tokens: [${tokensNew.join(', ')}]`);
    
    console.log('\n=== TẠO HASH VECTOR ===');
    
    // Tạo hash cho method cũ
    console.log('\n1. Hash vector với method cũ:');
    const hashVectorOld = tokensOld.map((word, index) => ({
      hash: TextHasher.murmur32(word),
      word: word,
      index: index,
      method: "murmur32"
    }));
    console.log(JSON.stringify(hashVectorOld, null, 2));
    
    // Tạo hash cho method mới
    console.log('\n2. Hash vector với method mới (bảo vệ cụm từ):');
    const hashVectorNew = tokensNew.map((word, index) => ({
      hash: TextHasher.murmur32(word),
      word: word,
      index: index,
      method: "murmur32"
    }));
    console.log(JSON.stringify(hashVectorNew, null, 2));
    
    console.log('\n=== PHÂN TÍCH KẾT QUẢ ===');
    console.log(`Số từ với method cũ: ${tokensOld.length}`);
    console.log(`Số từ với method mới: ${tokensNew.length}`);
    
    // Kiểm tra xem có cụm từ nào được bảo vệ không
    const preservedInNew = tokensNew.filter(token => token.includes(' ') || 
      vietnameseStopwordService.preservedPhrases.has(token.toLowerCase()));
    
    if (preservedInNew.length > 0) {
      console.log(`✅ Các cụm từ được bảo vệ: [${preservedInNew.join(', ')}]`);
    } else {
      console.log('❌ Không có cụm từ nào được bảo vệ trong kết quả này');
      console.log('Có thể do:');
      console.log('  - Cụm từ không có trong file stopwords');
      console.log('  - Method tokenize vẫn chưa hoạt động đúng');
    }
    
  } catch (error) {
    console.error('Lỗi:', error);
  }
}

testPhraseProtectionInHash();
