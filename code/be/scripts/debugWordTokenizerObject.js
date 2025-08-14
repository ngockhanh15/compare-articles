const vntk = require('vntk');

async function debugWordTokenizerObject() {
  try {
    const testText = "Tin tức về thể thao và kinh tế hôm nay rất thú vị.";
    console.log(`Text test: ${testText}`);
    
    console.log('\n=== DEBUG WORD TOKENIZER OBJECT ===');
    
    const wordTokenizer = vntk.wordTokenizer();
    const result = wordTokenizer.tag(testText);
    
    console.log('Type:', typeof result);
    console.log('Constructor:', result.constructor.name);
    console.log('Keys:', Object.keys(result));
    console.log('String representation:', result.toString());
    
    // Thử các method có thể có
    if (typeof result.split === 'function') {
      console.log('\nTrying result.split():');
      try {
        const tokens = result.split(',');
        console.log('Tokens:', tokens);
      } catch (e) {
        console.log('Error:', e.message);
      }
    }
    
    // Thử convert to string rồi split
    console.log('\nTrying String(result).split():');
    try {
      const stringResult = String(result);
      console.log('String result:', stringResult);
      const tokens = stringResult.split(',').filter(t => t.trim()).map(t => t.trim());
      console.log('Tokens:', tokens);
      
      const phrases = tokens.filter(token => token.includes(' '));
      console.log('Phrases found:', phrases);
    } catch (e) {
      console.log('Error:', e.message);
    }
    
  } catch (error) {
    console.error('Lỗi:', error);
  }
}

debugWordTokenizerObject();
