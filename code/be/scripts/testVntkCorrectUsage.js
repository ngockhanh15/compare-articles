const vntk = require('vntk');

async function testVntkCorrectUsage() {
  try {
    const testText = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
    console.log(`Text test: ${testText}`);
    
    console.log('\n=== KIỂM TRA VNTK ĐÚNG CÁCH ===');
    
    // 1. wordSent - word segmentation (deprecated)
    console.log('\n1. vntk.wordSent().tag():');
    try {
      const wordSent = vntk.wordSent();
      const segmented = wordSent.tag(testText);
      console.log(`   Kết quả: "${segmented}"`);
      
      if (typeof segmented === 'string') {
        const words = segmented.split(' ').filter(w => w.trim());
        console.log(`   Tách thành array: [${words.join(', ')}]`);
      }
    } catch (e) {
      console.log(`   Lỗi: ${e.message}`);
    }
    
    // 2. wordTokenizer - recommended
    console.log('\n2. vntk.wordTokenizer().tag():');
    try {
      const wordTokenizer = vntk.wordTokenizer();
      const segmented = wordTokenizer.tag(testText);
      console.log(`   Kết quả: "${segmented}"`);
      
      if (typeof segmented === 'string') {
        const words = segmented.split(' ').filter(w => w.trim());
        console.log(`   Tách thành array: [${words.join(', ')}]`);
      }
    } catch (e) {
      console.log(`   Lỗi: ${e.message}`);
    }
    
    // 3. posTag - part of speech tagging  
    console.log('\n3. vntk.posTag().tag():');
    try {
      const posTag = vntk.posTag();
      const posTags = posTag.tag(testText);
      console.log(`   Kết quả:`, posTags);
      
      if (Array.isArray(posTags)) {
        const words = posTags.map(item => Array.isArray(item) ? item[0] : item);
        console.log(`   Chỉ từ: [${words.join(', ')}]`);
      }
    } catch (e) {
      console.log(`   Lỗi: ${e.message}`);
    }
    
    // 4. tokenizer - basic tokenization
    console.log('\n4. vntk.tokenizer().tokenize():');
    try {
      const tokenizer = vntk.tokenizer();
      const tokens = tokenizer.tokenize(testText);
      console.log(`   Kết quả: [${tokens.join(', ')}]`);
    } catch (e) {
      console.log(`   Lỗi: ${e.message}`);
    }
    
  } catch (error) {
    console.error('Lỗi:', error);
  }
}

testVntkCorrectUsage();
