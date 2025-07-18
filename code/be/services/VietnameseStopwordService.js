const fs = require('fs');
const path = require('path');

class VietnameseStopwordService {
  constructor() {
    this.stopwords = new Set();
    this.initialized = false;
  }

  // Khởi tạo và load stopwords từ file
  async initialize() {
    try {
      const stopwordPath = path.join(__dirname, '..', 'vietnamese-stopwords.txt');
      const data = fs.readFileSync(stopwordPath, 'utf8');
      
      // Tách từng dòng và loại bỏ khoảng trắng thừa
      const words = data.split('\n')
        .map(word => word.trim().toLowerCase())
        .filter(word => word.length > 0);
      
      // Thêm vào Set để tìm kiếm nhanh
      words.forEach(word => this.stopwords.add(word));
      
      this.initialized = true;
      console.log(`Vietnamese stopwords service initialized with ${this.stopwords.size} stopwords`);
      
    } catch (error) {
      console.error('Error initializing Vietnamese stopwords service:', error);
      throw error;
    }
  }

  // Kiểm tra xem một từ có phải là stopword không
  isStopword(word) {
    if (!this.initialized) {
      throw new Error('Vietnamese stopwords service not initialized');
    }
    return this.stopwords.has(word.toLowerCase().trim());
  }

  // Loại bỏ stopwords từ một đoạn text
  removeStopwords(text) {
    if (!this.initialized) {
      throw new Error('Vietnamese stopwords service not initialized');
    }

    // Tách từ bằng regex để giữ lại dấu câu
    const words = text.split(/(\s+|[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/])/);
    
    const filteredWords = words.filter(word => {
      // Giữ lại khoảng trắng và dấu câu
      if (/^\s+$/.test(word) || /^[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/]+$/.test(word)) {
        return true;
      }
      
      // Loại bỏ stopwords
      const cleanWord = word.trim().toLowerCase();
      if (cleanWord.length === 0) return false;
      
      return !this.stopwords.has(cleanWord);
    });

    return filteredWords.join('').replace(/\s+/g, ' ').trim();
  }

  // Tách text thành các từ có nghĩa (loại bỏ stopwords)
  extractMeaningfulWords(text) {
    if (!this.initialized) {
      throw new Error('Vietnamese stopwords service not initialized');
    }

    // Tách từ và loại bỏ dấu câu
    const words = text.toLowerCase()
      .replace(/[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/]/g, ' ')
      .split(/\s+/)
      .filter(word => word.trim().length > 0);

    // Lọc ra những từ không phải stopword
    const meaningfulWords = words.filter(word => !this.stopwords.has(word));

    return meaningfulWords;
  }

  // Tách text thành chunks dựa trên stopwords
  splitByStopwords(text, options = {}) {
    if (!this.initialized) {
      throw new Error('Vietnamese stopwords service not initialized');
    }

    const {
      minChunkLength = 3, // Số từ tối thiểu trong một chunk
      maxChunkLength = 50, // Số từ tối đa trong một chunk
      preserveStopwords = false // Có giữ lại stopwords trong kết quả không
    } = options;

    // Tách từ giữ nguyên vị trí
    const words = text.split(/\s+/).filter(word => word.trim().length > 0);
    const chunks = [];
    let currentChunk = [];
    let meaningfulWordCount = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const cleanWord = word.toLowerCase().replace(/[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/]/g, '');
      const isStopword = this.stopwords.has(cleanWord);

      if (isStopword) {
        // Nếu gặp stopword và chunk hiện tại đủ dài, kết thúc chunk
        if (meaningfulWordCount >= minChunkLength) {
          if (preserveStopwords && currentChunk.length > 0) {
            currentChunk.push(word);
          }
          
          chunks.push({
            text: currentChunk.join(' ').trim(),
            meaningfulWordCount: meaningfulWordCount,
            totalWordCount: currentChunk.length,
            startIndex: i - currentChunk.length + (preserveStopwords ? 0 : 1),
            endIndex: i
          });
          
          currentChunk = [];
          meaningfulWordCount = 0;
        } else if (preserveStopwords) {
          // Nếu chunk chưa đủ dài nhưng muốn giữ stopwords
          currentChunk.push(word);
        }
      } else {
        // Từ có nghĩa
        currentChunk.push(word);
        meaningfulWordCount++;

        // Nếu chunk đã đạt độ dài tối đa, kết thúc chunk
        if (meaningfulWordCount >= maxChunkLength) {
          chunks.push({
            text: currentChunk.join(' ').trim(),
            meaningfulWordCount: meaningfulWordCount,
            totalWordCount: currentChunk.length,
            startIndex: i - currentChunk.length + 1,
            endIndex: i + 1
          });
          
          currentChunk = [];
          meaningfulWordCount = 0;
        }
      }
    }

    // Thêm chunk cuối cùng nếu có
    if (currentChunk.length > 0 && meaningfulWordCount >= minChunkLength) {
      chunks.push({
        text: currentChunk.join(' ').trim(),
        meaningfulWordCount: meaningfulWordCount,
        totalWordCount: currentChunk.length,
        startIndex: words.length - currentChunk.length,
        endIndex: words.length
      });
    }

    return chunks;
  }

  // Tính toán mật độ stopwords trong text
  calculateStopwordDensity(text) {
    if (!this.initialized) {
      throw new Error('Vietnamese stopwords service not initialized');
    }

    const words = text.toLowerCase()
      .replace(/[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/]/g, ' ')
      .split(/\s+/)
      .filter(word => word.trim().length > 0);

    if (words.length === 0) return 0;

    const stopwordCount = words.filter(word => this.stopwords.has(word)).length;
    return (stopwordCount / words.length) * 100;
  }

  // Lấy thống kê
  getStats() {
    return {
      totalStopwords: this.stopwords.size,
      initialized: this.initialized,
      sampleStopwords: Array.from(this.stopwords).slice(0, 10)
    };
  }

  // Thêm stopword mới
  addStopword(word) {
    if (!this.initialized) {
      throw new Error('Vietnamese stopwords service not initialized');
    }
    this.stopwords.add(word.toLowerCase().trim());
  }

  // Xóa stopword
  removeStopword(word) {
    if (!this.initialized) {
      throw new Error('Vietnamese stopwords service not initialized');
    }
    return this.stopwords.delete(word.toLowerCase().trim());
  }

  // Lấy tất cả stopwords
  getAllStopwords() {
    if (!this.initialized) {
      throw new Error('Vietnamese stopwords service not initialized');
    }
    return Array.from(this.stopwords).sort();
  }
}

// Tạo singleton instance
const vietnameseStopwordService = new VietnameseStopwordService();

module.exports = vietnameseStopwordService;