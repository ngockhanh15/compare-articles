const vntk = require('vntk');

async function testWordSegmentationCorrect() {
  try {
    const testText = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
    console.log(`Text test: ${testText}`);
    
    console.log('\n=== KIỂM TRA WORD SEGMENTATION ===');
    
    // 1. wordSent - phân tách từ
    console.log('\n1. vntk.wordSent():');
    try {
      const segmented = vntk.wordSent(testText);
      console.log(`   Kết quả: "${segmented}"`);
      console.log(`   Loại: ${typeof segmented}`);
      
      if (typeof segmented === 'string') {
        const words = segmented.split(' ').filter(w => w.trim());
        console.log(`   Tách thành array: [${words.join(', ')}]`);
      }
    } catch (e) {
      console.log(`   Lỗi: ${e.message}`);
    }
    
    // 2. posTag - part of speech tagging  
    console.log('\n2. vntk.posTag():');
    try {
      const posTags = vntk.posTag(testText);
      console.log(`   Kết quả:`, posTags);
      console.log(`   Loại: ${typeof posTags}, Length: ${Array.isArray(posTags) ? posTags.length : 'N/A'}`);
      
      if (Array.isArray(posTags)) {
        const words = posTags.map(item => Array.isArray(item) ? item[0] : item);
        console.log(`   Chỉ từ: [${words.join(', ')}]`);
      }
    } catch (e) {
      console.log(`   Lỗi: ${e.message}`);
    }
    
    // 3. ner - named entity recognition
    console.log('\n3. vntk.ner():');
    try {
      const nerResult = vntk.ner(testText);
      console.log(`   Kết quả:`, nerResult);
      console.log(`   Loại: ${typeof nerResult}`);
    } catch (e) {
      console.log(`   Lỗi: ${e.message}`);
    }
    
  } catch (error) {
    console.error('Lỗi:', error);
  }
}

testWordSegmentationCorrect();
