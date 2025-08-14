const vietnameseStopwordService = require('../services/VietnameseStopwordService');

async function debugMethodComparison() {
  try {
    console.log('=== KHỞI TẠO ===');
    await vietnameseStopwordService.initialize();
    
    const testText = "Tin tức về thể thao và kinh tế hôm nay rất thú vị. Các chuyên gia y tế đang nghiên cứu về sức khỏe cộng đồng.";
    console.log(`\nText test: ${testText}`);
    
    console.log('\n=== SO SÁNH TOKENIZE METHODS ===');
    
    // 1. Method cũ 
    console.log('\n1. tokenizeAndFilterUnique:');
    const tokensOld = vietnameseStopwordService.tokenizeAndFilterUnique(testText);
    console.log(`   [${tokensOld.join(', ')}]`);
    
    // 2. Method mới
    console.log('\n2. tokenizeAndFilterUniqueWithPhrases:');
    const tokensNew = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(testText);
    console.log(`   [${tokensNew.join(', ')}]`);
    
    console.log('\n=== PHÂN TÍCH ===');
    console.log(`Số tokens cũ: ${tokensOld.length}`);
    console.log(`Số tokens mới: ${tokensNew.length}`);
    
    // Tìm sự khác biệt
    const newPhrases = tokensNew.filter(token => token.includes(' '));
    console.log(`Cụm từ trong kết quả mới: [${newPhrases.join(', ')}]`);
    
    const missingInOld = tokensNew.filter(token => !tokensOld.includes(token));
    const missingInNew = tokensOld.filter(token => !tokensNew.includes(token));
    
    console.log(`Có trong mới, không có trong cũ: [${missingInOld.join(', ')}]`);
    console.log(`Có trong cũ, không có trong mới: [${missingInNew.join(', ')}]`);
    
  } catch (error) {
    console.error('Lỗi:', error);
  }
}

debugMethodComparison();
