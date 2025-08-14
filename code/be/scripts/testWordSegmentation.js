const vntk = require('vntk');

async function testWordSegmentation() {
  try {
    const testText = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng.";
    console.log(`Text test: ${testText}`);
    
    console.log('\n=== KIỂM TRA WORD SEGMENTATION ===');
    
    // 1. Thử word segmentation
    console.log('\n1. vntk.word_sent():');
    try {
      const segmented = vntk.word_sent(testText);
      console.log(`   Kết quả: ${segmented}`);
      console.log(`   Loại: ${typeof segmented}`);
      
      if (typeof segmented === 'string') {
        const words = segmented.split(' ');
        console.log(`   Tách thành array: [${words.join(', ')}]`);
      }
    } catch (e) {
      console.log(`   Lỗi: ${e.message}`);
    }
    
    // 2. Thử ner
    console.log('\n2. vntk.ner():');
    try {
      const ner = vntk.ner(testText);
      console.log(`   Kết quả: [${ner.join(', ')}]`);
    } catch (e) {
      console.log(`   Lỗi: ${e.message}`);
    }
    
    // 3. Thử pos_tag
    console.log('\n3. vntk.pos_tag():');
    try {
      const posTags = vntk.pos_tag(testText);
      console.log(`   Kết quả:`, posTags);
      
      // Lấy chỉ từ
      const words = posTags.map(item => item[0]);
      console.log(`   Chỉ từ: [${words.join(', ')}]`);
    } catch (e) {
      console.log(`   Lỗi: ${e.message}`);
    }
    
  } catch (error) {
    console.error('Lỗi:', error);
  }
}

testWordSegmentation();
