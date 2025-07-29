/**
 * Kiểm tra xem chương trình có tạo bigram/n-gram hay không
 */

const vietnameseStopwordService = require('../be/services/VietnameseStopwordService');
const { TextHasher } = require('../be/utils/TreeAVL');

class WordProcessingChecker {
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

  async checkWordProcessing() {
    await this.initialize();
    
    console.log('🔍 KIỂM TRA CÁCH XỬ LÝ TỪ TRONG CHƯƠNG TRÌNH');
    console.log('='.repeat(60));
    
    const testText = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt";
    
    console.log('📝 Văn bản test:', testText);
    
    // 1. Kiểm tra extractMeaningfulWords
    console.log('\n1️⃣ EXTRACT MEANINGFUL WORDS:');
    const meaningfulWords = vietnameseStopwordService.extractMeaningfulWords(testText);
    console.log('Meaningful words:', meaningfulWords);
    console.log('Số từ:', meaningfulWords.length);
    
    // 2. Kiểm tra createWordHashes
    console.log('\n2️⃣ CREATE WORD HASHES:');
    const wordHashes = TextHasher.createWordHashes(testText, true);
    console.log('Word hashes count:', wordHashes.length);
    console.log('Sample hashes:');
    wordHashes.slice(0, 5).forEach((hash, index) => {
      console.log(`  ${index + 1}. Word: "${hash.word}" | Hash: ${hash.hash.substring(0, 12)}... | Method: ${hash.method}`);
    });
    
    // 3. Kiểm tra splitByStopwords (chunks)
    console.log('\n3️⃣ SPLIT BY STOPWORDS (CHUNKS):');
    const chunks = vietnameseStopwordService.splitByStopwords(testText, {
      minChunkLength: 2,
      maxChunkLength: 5,
      preserveStopwords: false
    });
    console.log('Chunks count:', chunks.length);
    chunks.forEach((chunk, index) => {
      console.log(`  Chunk ${index + 1}: "${chunk.text}" (${chunk.meaningfulWordCount} meaningful words)`);
    });
    
    // 4. Tạo bigram thủ công để so sánh
    console.log('\n4️⃣ BIGRAM THỦ CÔNG (ĐỂ SO SÁNH):');
    const bigrams = this.createBigrams(meaningfulWords);
    console.log('Bigrams:', bigrams);
    console.log('Số bigram:', bigrams.length);
    
    // 5. Tạo trigram thủ công
    console.log('\n5️⃣ TRIGRAM THỦ CÔNG (ĐỂ SO SÁNH):');
    const trigrams = this.createTrigrams(meaningfulWords);
    console.log('Trigrams:', trigrams);
    console.log('Số trigram:', trigrams.length);
    
    return {
      meaningfulWords,
      wordHashes,
      chunks,
      bigrams,
      trigrams
    };
  }

  // Tạo bigram từ danh sách từ
  createBigrams(words) {
    const bigrams = [];
    for (let i = 0; i < words.length - 1; i++) {
      bigrams.push(`${words[i]}_${words[i + 1]}`);
    }
    return bigrams;
  }

  // Tạo trigram từ danh sách từ
  createTrigrams(words) {
    const trigrams = [];
    for (let i = 0; i < words.length - 2; i++) {
      trigrams.push(`${words[i]}_${words[i + 1]}_${words[i + 2]}`);
    }
    return trigrams;
  }

  // So sánh 2 câu với bigram
  async compareSentencesWithBigrams(sentence1, sentence2) {
    await this.initialize();
    
    console.log('\n🔗 SO SÁNH VỚI BIGRAM:');
    console.log('Sentence 1:', sentence1);
    console.log('Sentence 2:', sentence2);
    
    const words1 = vietnameseStopwordService.extractMeaningfulWords(sentence1);
    const words2 = vietnameseStopwordService.extractMeaningfulWords(sentence2);
    
    const bigrams1 = this.createBigrams(words1);
    const bigrams2 = this.createBigrams(words2);
    
    console.log('Bigrams 1:', bigrams1);
    console.log('Bigrams 2:', bigrams2);
    
    const commonBigrams = bigrams1.filter(bigram => bigrams2.includes(bigram));
    const similarity = bigrams1.length > 0 ? (commonBigrams.length / bigrams1.length) * 100 : 0;
    
    console.log('Common bigrams:', commonBigrams);
    console.log('Bigram similarity:', Math.round(similarity) + '%');
    
    return {
      bigrams1,
      bigrams2,
      commonBigrams,
      similarity: Math.round(similarity)
    };
  }
}

// Test chính
async function checkWordProcessing() {
  const checker = new WordProcessingChecker();
  
  try {
    // Kiểm tra cách xử lý từ
    await checker.checkWordProcessing();
    
    // So sánh 2 câu với bigram
    const sentence1 = "Thể thao là môn ưa thích của mọi người tôi cũng không đặc biệt";
    const sentence2 = "Tôi là Khánh, tôi ưa thích thể thao, đặc biệt là đá bóng";
    
    await checker.compareSentencesWithBigrams(sentence1, sentence2);
    
    console.log('\n💡 KẾT LUẬN:');
    console.log('='.repeat(50));
    console.log('- Chương trình hiện tại xử lý theo từ đơn lẻ');
    console.log('- Không có logic tạo bigram/n-gram tự động');
    console.log('- Có thể tạo chunks nhưng không phải bigram');
    console.log('- Nếu muốn bigram, cần implement thêm logic');
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
  }
}

// Export
module.exports = {
  WordProcessingChecker,
  checkWordProcessing
};

// Chạy nếu gọi trực tiếp
if (require.main === module) {
  checkWordProcessing();
}