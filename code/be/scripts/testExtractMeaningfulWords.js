const vietnameseStopwordService = require('../services/VietnameseStopwordService');

async function testExtractMeaningfulWords() {
  try {
    console.log('=== KHỞI TẠO ===');
    await vietnameseStopwordService.initialize();
    
    const testText = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
    console.log(`\nText test: ${testText}`);
    
    console.log('\n=== SO SÁNH CÁC METHODS ===');
    
    // 1. extractMeaningfulWords (được sử dụng bởi TextHasher)
    console.log('\n1. extractMeaningfulWords:');
    const meaningful = vietnameseStopwordService.extractMeaningfulWords(testText);
    console.log(`   [${meaningful.join(', ')}]`);
    
    // 2. tokenizeAndFilterUniqueWithPhrases (method mới)
    console.log('\n2. tokenizeAndFilterUniqueWithPhrases:');
    const withPhrases = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(testText);
    console.log(`   [${withPhrases.join(', ')}]`);
    
    console.log('\n=== PHÂN TÍCH ===');
    console.log(`extractMeaningfulWords count: ${meaningful.length}`);
    console.log(`tokenizeAndFilterUniqueWithPhrases count: ${withPhrases.length}`);
    
    const phrasesInMeaningful = meaningful.filter(word => word.includes(' '));
    const phrasesInWithPhrases = withPhrases.filter(word => word.includes(' '));
    
    console.log(`Cụm từ trong extractMeaningfulWords: [${phrasesInMeaningful.join(', ')}]`);
    console.log(`Cụm từ trong tokenizeAndFilterUniqueWithPhrases: [${phrasesInWithPhrases.join(', ')}]`);
    
  } catch (error) {
    console.error('Lỗi:', error);
  }
}

testExtractMeaningfulWords();
