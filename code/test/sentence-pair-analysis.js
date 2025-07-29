/**
 * Phân tích logic tính theo cặp câu (sentence pairs)
 * Dựa trên DocumentAVLService.findDuplicateSentences
 */

const vietnameseStopwordService = require('../be/services/VietnameseStopwordService');
const { TextHasher } = require('../be/utils/TreeAVL');

class SentencePairAnalyzer {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      console.log('🔧 Khởi tạo Vietnamese Stopword Service...');
      await vietnameseStopwordService.initialize();
      this.initialized = true;
      console.log('✅ Khởi tạo hoàn tất!');
    }
  }

  // Logic tách câu giống TextHasher.extractSentences
  extractSentences(text) {
    const sentences = text
      .split(/[.!?]+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 10); // Lọc câu quá ngắn

    return sentences;
  }

  // Logic tính độ tương đồng cho cặp câu (giống findDuplicateSentences)
  async findDuplicateSentences(inputText, documentText) {
    await this.initialize();
    
    console.log('🔍 PHÂN TÍCH LOGIC TÍNH THEO CẶP CÂU');
    console.log('='.repeat(60));
    
    console.log('📝 Văn bản gốc:');
    console.log('Input Text:', inputText);
    console.log('Doc Text:  ', documentText);
    
    // Bước 1: Tách thành các câu
    const inputSentences = this.extractSentences(inputText);
    const docSentences = this.extractSentences(documentText);
    
    console.log('\n📊 Tách câu:');
    console.log('Input sentences:', inputSentences.length);
    inputSentences.forEach((sentence, index) => {
      console.log(`  ${index + 1}. "${sentence}"`);
    });
    
    console.log('Doc sentences:', docSentences.length);
    docSentences.forEach((sentence, index) => {
      console.log(`  ${index + 1}. "${sentence}"`);
    });
    
    // Bước 2: So sánh từng cặp câu
    const duplicateSentences = [];
    let pairIndex = 0;
    
    console.log('\n🔗 SO SÁNH TỪNG CẶP CÂU:');
    console.log('-'.repeat(60));
    
    for (const inputSentence of inputSentences) {
      const inputWords = vietnameseStopwordService.extractMeaningfulWords(inputSentence);
      
      for (const docSentence of docSentences) {
        pairIndex++;
        const docWords = vietnameseStopwordService.extractMeaningfulWords(docSentence);
        
        // Tính số từ chung
        const commonWords = inputWords.filter(word => docWords.includes(word));
        const similarity = inputWords.length > 0 
          ? (commonWords.length / inputWords.length) * 100 
          : 0;
        
        console.log(`\nCặp ${pairIndex}:`);
        console.log(`  Input: "${inputSentence}"`);
        console.log(`  Doc:   "${docSentence}"`);
        console.log(`  Input words: [${inputWords.join(', ')}] (${inputWords.length} từ)`);
        console.log(`  Doc words:   [${docWords.join(', ')}] (${docWords.length} từ)`);
        console.log(`  Common words: [${commonWords.join(', ')}] (${commonWords.length} từ)`);
        console.log(`  Similarity: (${commonWords.length}/${inputWords.length}) × 100 = ${similarity.toFixed(2)}%`);
        
        // Nếu độ tương đồng >= 50%, coi là câu trùng lặp
        if (similarity >= 50) {
          const duplicateInfo = {
            inputSentence,
            docSentence,
            similarity: Math.round(similarity),
            commonWords: commonWords.length,
            inputWords,
            docWords,
            commonWordsList: commonWords
          };
          
          duplicateSentences.push(duplicateInfo);
          console.log(`  ✅ TRÙNG LẶP (${Math.round(similarity)}% >= 50%)`);
        } else {
          console.log(`  ❌ KHÔNG TRÙNG LẶP (${Math.round(similarity)}% < 50%)`);
        }
      }
    }
    
    // Bước 3: Tính tỷ lệ trùng lặp tổng thể
    const overallSimilarity = duplicateSentences.length > 0 
      ? Math.round(duplicateSentences.reduce((sum, s) => sum + s.similarity, 0) / duplicateSentences.length)
      : 0;
    
    console.log('\n📈 KẾT QUẢ TỔNG THỂ:');
    console.log('='.repeat(60));
    console.log(`Số cặp câu trùng lặp: ${duplicateSentences.length}`);
    console.log(`Tổng số cặp câu kiểm tra: ${pairIndex}`);
    
    if (duplicateSentences.length > 0) {
      console.log('\nChi tiết các cặp trùng lặp:');
      duplicateSentences.forEach((dup, index) => {
        console.log(`  ${index + 1}. ${dup.similarity}% - "${dup.inputSentence}" vs "${dup.docSentence}"`);
      });
      
      console.log('\nTính tỷ lệ trung bình:');
      const similarities = duplicateSentences.map(d => d.similarity);
      console.log(`Các tỷ lệ: [${similarities.join('%, ')}%]`);
      console.log(`Trung bình: (${similarities.join(' + ')}) / ${similarities.length} = ${overallSimilarity}%`);
    }
    
    console.log(`\n🎯 TỶ LỆ TRÙNG LẶP CUỐI CÙNG: ${overallSimilarity}%`);
    
    return {
      inputSentences,
      docSentences,
      duplicateSentences,
      overallSimilarity,
      totalPairs: pairIndex
    };
  }
}

// Test với 2 câu cụ thể
async function analyzeSentencePairs() {
  const analyzer = new SentencePairAnalyzer();
  
  try {
    const inputText = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt";
    const docText = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng";
    
    const result = await analyzer.findDuplicateSentences(inputText, docText);
    
    console.log('\n💡 GIẢI THÍCH TẠI SAO 83%:');
    console.log('='.repeat(60));
    
    if (result.overallSimilarity === 83) {
      console.log('✅ Kết quả khớp với 83% như mong đợi!');
      console.log('Logic: Chương trình so sánh từng cặp câu và lấy trung bình');
      console.log(`Có ${result.duplicateSentences.length} cặp câu trùng lặp với tỷ lệ trung bình ${result.overallSimilarity}%`);
    } else {
      console.log(`❓ Kết quả ${result.overallSimilarity}% khác với 83% mong đợi`);
      console.log('Có thể do logic tách câu hoặc tính toán khác nhau');
    }
    
  } catch (error) {
    console.error('❌ Lỗi khi chạy test:', error);
  }
}

// Export
module.exports = {
  SentencePairAnalyzer,
  analyzeSentencePairs
};

// Chạy nếu gọi trực tiếp
if (require.main === module) {
  analyzeSentencePairs();
}