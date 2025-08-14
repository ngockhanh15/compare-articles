const vntk = require('vntk');

async function debugWordTokenizerRaw() {
  try {
    const testText = "Tin tức về thể thao và kinh tế hôm nay rất thú vị.";
    console.log(`Text test: ${testText}`);
    
    console.log('\n=== DEBUG WORD TOKENIZER ===');
    
    const wordTokenizer = vntk.wordTokenizer();
    console.log('wordTokenizer object:', typeof wordTokenizer);
    
    const segmented = wordTokenizer.tag(testText);
    console.log(`Raw result: "${segmented}"`);
    console.log(`Type: ${typeof segmented}`);
    
    if (typeof segmented === 'string') {
      console.log('\n=== SPLIT BY COMMA ===');
      const tokens = segmented.split(',');
      console.log('Raw tokens:', tokens);
      
      const cleanTokens = tokens.filter(t => t.trim()).map(t => t.trim());
      console.log('Clean tokens:', cleanTokens);
      
      console.log('\n=== KIỂM TRA CỤM TỪ ===');
      const phrases = cleanTokens.filter(token => token.includes(' '));
      console.log('Phrases found:', phrases);
    }
    
  } catch (error) {
    console.error('Lỗi:', error);
  }
}

debugWordTokenizerRaw();
