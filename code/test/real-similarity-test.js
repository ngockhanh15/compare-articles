/**
 * Test thực tế với Vietnamese Stopword Service để phân tích tại sao 83%
 */

const vietnameseStopwordService = require('../be/services/VietnameseStopwordService');

class RealSimilarityAnalyzer {
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

  // Tính độ tương đồng chính xác như trong code gốc
  async calculateRealSimilarity(inputSentence, docSentence) {
    await this.initialize();
    
    console.log('🔍 PHÂN TÍCH THỰC TẾ VỚI VIETNAMESE STOPWORD SERVICE');
    console.log('='.repeat(70));
    
    console.log('📝 Câu gốc:');
    console.log('Input:', inputSentence);
    console.log('Doc:  ', docSentence);
    
    // Sử dụng extractMeaningfulWords thực tế
    const inputWords = vietnameseStopwordService.extractMeaningfulWords(inputSentence);
    const docWords = vietnameseStopwordService.extractMeaningfulWords(docSentence);
    
    console.log('\n📊 Từ có nghĩa sau khi lọc stopwords (THỰC TẾ):');
    console.log('Input words:', inputWords);
    console.log('Doc words:  ', docWords);
    console.log('Số từ input:', inputWords.length);
    console.log('Số từ doc:  ', docWords.length);
    
    // Tìm từ chung (giống logic trong findDuplicateSentences)
    const commonWords = inputWords.filter(word => docWords.includes(word));
    
    console.log('\n🔗 Từ chung:');
    console.log('Common words:', commonWords);
    console.log('Số từ chung: ', commonWords.length);
    
    // Tính độ tương đồng theo công thức chính xác
    const similarity = inputWords.length > 0 
      ? (commonWords.length / inputWords.length) * 100 
      : 0;
    
    console.log('\n📈 TÍNH TOÁN ĐỘ TƯƠNG ĐỒNG:');
    console.log('Công thức: (Số từ chung / Số từ input) × 100');
    console.log(`Tính toán: (${commonWords.length} / ${inputWords.length}) × 100`);
    console.log(`Kết quả:   ${similarity.toFixed(2)}%`);
    console.log(`Làm tròn:  ${Math.round(similarity)}%`);
    
    // Phân tích chi tiết từng từ
    console.log('\n🔍 PHÂN TÍCH TỪNG TỪ:');
    console.log('Từ trong input:');
    inputWords.forEach((word, index) => {
      const isCommon = commonWords.includes(word);
      console.log(`  ${index + 1}. "${word}" - ${isCommon ? '✅ CÓ TRONG DOC' : '❌ KHÔNG CÓ'}`);
    });
    
    console.log('\nTừ trong doc:');
    docWords.forEach((word, index) => {
      const isCommon = commonWords.includes(word);
      console.log(`  ${index + 1}. "${word}" - ${isCommon ? '✅ CÓ TRONG INPUT' : '❌ KHÔNG CÓ'}`);
    });
    
    // Kiểm tra từng từ có phải stopword không
    console.log('\n🛑 KIỂM TRA STOPWORDS:');
    const allWordsInput = inputSentence.toLowerCase().split(/\s+/);
    const allWordsDoc = docSentence.toLowerCase().split(/\s+/);
    
    console.log('Từ trong input sentence:');
    allWordsInput.forEach((word, index) => {
      const isStopword = vietnameseStopwordService.isStopword(word);
      const isKept = inputWords.includes(word);
      console.log(`  ${index + 1}. "${word}" - ${isStopword ? '🛑 STOPWORD' : '✅ MEANINGFUL'} - ${isKept ? 'KEPT' : 'REMOVED'}`);
    });
    
    console.log('\nTừ trong doc sentence:');
    allWordsDoc.forEach((word, index) => {
      const isStopword = vietnameseStopwordService.isStopword(word);
      const isKept = docWords.includes(word);
      console.log(`  ${index + 1}. "${word}" - ${isStopword ? '🛑 STOPWORD' : '✅ MEANINGFUL'} - ${isKept ? 'KEPT' : 'REMOVED'}`);
    });
    
    console.log('\n📋 KẾT LUẬN:');
    console.log(`Độ tương đồng: ${Math.round(similarity)}%`);
    console.log(`Ngưỡng trùng lặp: 50%`);
    console.log(`Kết quả: ${similarity >= 50 ? '✅ TRÙNG LẶP' : '❌ KHÔNG TRÙNG LẶP'}`);
    
    // Giải thích tại sao có kết quả này
    console.log('\n💡 GIẢI THÍCH KẾT QUẢ:');
    console.log('='.repeat(50));
    if (Math.round(similarity) === 83) {
      console.log('✅ Kết quả khớp với 83% như mong đợi!');
      console.log(`Lý do: Có ${commonWords.length} từ chung trong tổng số ${inputWords.length} từ có nghĩa của input`);
      console.log(`Tính toán: ${commonWords.length}/${inputWords.length} = ${(commonWords.length/inputWords.length*100).toFixed(1)}% ≈ 83%`);
    } else {
      console.log(`❓ Kết quả ${Math.round(similarity)}% khác với 83% mong đợi`);
      console.log('Có thể do:');
      console.log('- Danh sách stopwords khác nhau');
      console.log('- Logic xử lý từ khác nhau');
      console.log('- Phiên bản code khác nhau');
    }
    
    return {
      inputSentence,
      docSentence,
      inputWords,
      docWords,
      commonWords,
      similarity: Math.round(similarity),
      exactSimilarity: similarity,
      isDuplicate: similarity >= 50
    };
  }

  // Test với nhiều cách viết khác nhau
  async testVariations() {
    await this.initialize();
    
    console.log('\n🔄 TEST VỚI CÁC BIẾN THỂ KHÁC NHAU');
    console.log('='.repeat(70));
    
    const variations = [
      {
        name: 'Gốc',
        input: "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt",
        doc: "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng"
      },
      {
        name: 'Đảo thứ tự',
        input: "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng",
        doc: "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt"
      },
      {
        name: 'Bỏ dấu câu',
        input: "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt",
        doc: "Tôi là Khánh tôi ưa thích thể thao đặc biệt là đá bóng"
      }
    ];
    
    for (const variation of variations) {
      console.log(`\n--- ${variation.name} ---`);
      const result = await this.calculateRealSimilarity(variation.input, variation.doc);
      console.log(`Kết quả: ${result.similarity}%`);
    }
  }
}

// Chạy test
async function analyzeRealSimilarity() {
  const analyzer = new RealSimilarityAnalyzer();
  
  try {
    // Test chính
    const docSentence = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng";
    const inputSentence = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt";
    
    await analyzer.calculateRealSimilarity(inputSentence, docSentence);
    
    // Test các biến thể
    await analyzer.testVariations();
    
  } catch (error) {
    console.error('❌ Lỗi khi chạy test:', error);
  }
}

// Export
module.exports = {
  RealSimilarityAnalyzer,
  analyzeRealSimilarity
};

// Chạy nếu gọi trực tiếp
if (require.main === module) {
  analyzeRealSimilarity();
}