const vietnameseStopwordService = require('../services/VietnameseStopwordService');

async function testStopwordsOnly() {
  try {
    // Khởi tạo service
    await vietnameseStopwordService.initialize();
    
    console.log('=== THỐNG KÊ SERVICE ===');
    const stats = vietnameseStopwordService.getStats();
    console.log(`Tổng số stopwords: ${stats.totalStopwords}`);
    console.log(`Số cụm từ được bảo vệ: ${vietnameseStopwordService.preservedPhrases.size}`);
    
    console.log('\n=== CÁC CỤM TỪ ĐƯỢC BẢO VỆ TỪ FILE STOPWORDS ===');
    const preservedPhrases = Array.from(vietnameseStopwordService.preservedPhrases);
    console.log(preservedPhrases.slice(0, 20)); // Hiển thị 20 cụm từ đầu
    
    console.log('\n=== TEST TOKENIZE VỚI WORD SEGMENTATION ===');
    const testText = "Tin tức về thể thao và kinh tế hôm nay rất thú vị. Các chuyên gia y tế đang nghiên cứu về sức khỏe cộng đồng.";
    console.log(`Text gốc: ${testText}`);
    
    const tokens = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(testText);
    console.log(`Tokens sau khi xử lý: ${tokens}`);
    
    console.log('\n=== TEST REMOVE STOPWORDS ===');
    const filtered = vietnameseStopwordService.removeStopwords(testText);
    console.log(`Text sau khi loại bỏ stopwords: ${filtered}`);
    
    console.log('\n=== TEST EXTRACT MEANINGFUL WORDS ===');
    const meaningful = vietnameseStopwordService.extractMeaningfulWords(testText);
    console.log(`Meaningful words: ${meaningful}`);
    
  } catch (error) {
    console.error('Lỗi:', error);
  }
}

testStopwordsOnly();
