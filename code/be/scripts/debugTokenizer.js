const vietnameseStopwordService = require('../services/VietnameseStopwordService');
const vntk = require('vntk');

async function debugTokenizer() {
  try {
    console.log('=== KHỞI TẠO ===');
    await vietnameseStopwordService.initialize();
    
    const testText = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
    console.log(`\nText test: ${testText}`);
    
    console.log('\n=== KIỂM TRA CÁC TOKENIZER VNTK ===');
    
    // 1. tokenizer
    console.log('\n1. vntk.tokenizer():');
    try {
      const tokenizer = vntk.tokenizer();
      const tokens1 = tokenizer.tokenize(testText);
      console.log(`   Kết quả: [${tokens1.join(', ')}]`);
    } catch (e) {
      console.log(`   Lỗi: ${e.message}`);
    }
    
    // 2. wordTokenizer  
    console.log('\n2. vntk.wordTokenizer():');
    try {
      const wordTokenizer = vntk.wordTokenizer();
      const tokens2 = wordTokenizer.tag(testText, 'text');
      console.log(`   Kết quả: [${tokens2.join(', ')}]`);
    } catch (e) {
      console.log(`   Lỗi: ${e.message}`);
    }
    
    // 3. word_sent (deprecated)
    console.log('\n3. vntk.word_sent() (deprecated):');
    try {
      const wordSent = vntk.word_sent();
      const tokens3 = wordSent.tag(testText, 'text');
      console.log(`   Kết quả: [${tokens3.join(', ')}]`);
    } catch (e) {
      console.log(`   Lỗi: ${e.message}`);
    }
    
    console.log('\n=== KIỂM TRA CÁC CỤM TỪ TRONG STOPWORDS ===');
    const preservedPhrases = Array.from(vietnameseStopwordService.preservedPhrases);
    const relevantPhrases = preservedPhrases.filter(phrase => 
      phrase.includes('thể') || phrase.includes('thao') || phrase.includes('đá') || phrase.includes('bóng')
    );
    console.log('Các cụm từ có liên quan trong stopwords:');
    relevantPhrases.forEach(phrase => {
      console.log(`   "${phrase}"`);
    });
    
    console.log('\n=== KIỂM TRA PHRASE PROTECTION ===');
    const { text: protectedText, mappings } = vietnameseStopwordService.protectPhrases(testText);
    console.log(`Text bảo vệ: ${protectedText}`);
    console.log('Mappings:');
    for (const [placeholder, phrase] of mappings) {
      console.log(`   ${placeholder} -> "${phrase}"`);
    }
    
  } catch (error) {
    console.error('Lỗi:', error);
  }
}

debugTokenizer();
