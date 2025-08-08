const fs = require("fs");
const path = require("path");
// Use vntk tokenizer per requirements
const vntk = require("vntk");
const tokenizer = vntk.tokenizer();

class VietnameseStopwordService {
  constructor() {
    this.stopwords = new Set();
    this.initialized = false;
  }

  // Khởi tạo và load stopwords từ file
  async initialize() {
    try {
      const stopwordPath = path.join(
        __dirname,
        "..",
        "vietnamese-stopwords.txt"
      );
      const data = fs.readFileSync(stopwordPath, "utf8");

      // Tách từng dòng và loại bỏ khoảng trắng thừa
      const words = data
        .split("\n")
        .map((word) => word.trim().toLowerCase())
        .filter((word) => word.length > 0);

      // Thêm vào Set để tìm kiếm nhanh
      words.forEach((word) => this.stopwords.add(word));

      this.initialized = true;
      console.log(
        `Vietnamese stopwords service initialized with ${this.stopwords.size} stopwords`
      );
    } catch (error) {
      console.error("Error initializing Vietnamese stopwords service:", error);
      throw error;
    }
  }

  // Tokenize a sentence with vntk and filter tokens per rules
  // - lowercase
  // - remove punctuation, special chars, numbers
  // - remove stopwords
  // - remove duplicates within a sentence
  tokenizeAndFilterUnique(sentence) {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }
    if (!sentence || typeof sentence !== "string") return [];

    // vntk tokenize
    let tokens = [];
    try {
      tokens = tokenizer.tokenize(sentence);
    } catch (e) {
      // Fallback: simple split
      tokens = String(sentence).split(/\s+/);
    }

    // Normalize and filter
    const cleaned = [];
    const seen = new Set();
    for (const raw of tokens) {
      const lower = String(raw).toLowerCase();
      // remove punctuation/specials/numbers
      const normalized = lower
        .normalize("NFKC")
        .replace(/[.,!?;:()\[\]{}"'`~@#$%^&*+=|\\<>\/…“”‘’–—\-]/g, " ")
        .replace(/\d+/g, " ")
        .trim();
      if (!normalized) continue;

      // Token can still contain spaces from normalization; split again
      for (const t of normalized.split(/\s+/)) {
        if (!t) continue;
        if (this.stopwords.has(t)) continue;
        if (seen.has(t)) continue; // de-duplicate within the sentence
        seen.add(t);
        cleaned.push(t);
      }
    }
    return cleaned;
  }

  // Kiểm tra xem một từ có phải là stopword không
  isStopword(word) {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }
    return this.stopwords.has(word.toLowerCase().trim());
  }

  // Loại bỏ stopwords từ một đoạn text sử dụng vntk
  removeStopwords(text) {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }

    try {
  // Sử dụng vntk để tách từ tiếng Việt
  const words = tokenizer.tokenize(text);
      
      // Lọc ra những từ không phải stopword
      const filteredWords = words.filter(word => {
        const cleanWord = word.toLowerCase().trim();
        return cleanWord.length > 0 && !this.stopwords.has(cleanWord);
      });

      return filteredWords.join(" ");
    } catch (error) {
      console.warn("Lỗi khi sử dụng vntk trong removeStopwords, fallback về phương pháp cũ:", error);
      // Fallback về phương pháp cũ nếu vntk gặp lỗi
      const words = text.split(/(\s+|[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/])/);

      const filteredWords = words.filter((word) => {
        // Giữ lại khoảng trắng và dấu câu
        if (
          /^\s+$/.test(word) ||
          /^[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/]+$/.test(word)
        ) {
          return true;
        }

        // Loại bỏ stopwords
        const cleanWord = word.trim().toLowerCase();
        if (cleanWord.length === 0) return false;

        return !this.stopwords.has(cleanWord);
      });

      return filteredWords.join("").replace(/\s+/g, " ").trim();
    }
  }

  // Tách text thành các từ có nghĩa (loại bỏ stopwords) sử dụng vntk
  extractMeaningfulWords(text) {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }

    let meaningfulWords;

    if (typeof text === "string") {
      try {
        // Sử dụng vntk để tách từ tiếng Việt
    const words = tokenizer.tokenize(text);
        
        // Lọc ra những từ có nghĩa (loại bỏ stopwords và từ rỗng)
        meaningfulWords = words
          .map(word => word.toLowerCase().trim())
          .filter(word => {
            // Loại bỏ từ rỗng, dấu câu và stopwords
            return word.length > 0 && 
                   !/^[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/\s]+$/.test(word) &&
                   !this.stopwords.has(word);
          });
      } catch (error) {
        console.warn("Lỗi khi sử dụng vntk, fallback về phương pháp cũ:", error);
        // Fallback về phương pháp cũ nếu vntk gặp lỗi
        const words = text
          .toLowerCase()
          .replace(/[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/]/g, " ")
          .split(/\s+/)
          .filter((word) => word.trim().length > 0);

        meaningfulWords = words.filter((word) => !this.stopwords.has(word));
      }
    } else {
      // Xử lý khi input là array
      meaningfulWords = [];
      text.forEach((word) => {
        const cleanWord = word.toLowerCase().trim();
        if (cleanWord.length > 0 && !this.stopwords.has(cleanWord)) {
          meaningfulWords.push(cleanWord);
        }
      });
    }

    return meaningfulWords;
  }

  // Tách text thành chunks dựa trên stopwords sử dụng vntk
  splitByStopwords(text, options = {}) {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }

    const {
      minChunkLength = 3, // Số từ tối thiểu trong một chunk
      maxChunkLength = 50, // Số từ tối đa trong một chunk
      preserveStopwords = false, // Có giữ lại stopwords trong kết quả không
    } = options;

    let words;
    try {
      // Sử dụng vntk để tách từ tiếng Việt
  words = tokenizer.tokenize(text).filter((word) => word.trim().length > 0);
    } catch (error) {
      console.warn("Lỗi khi sử dụng vntk trong splitByStopwords, fallback về phương pháp cũ:", error);
      // Fallback về phương pháp cũ nếu vntk gặp lỗi
      words = text.split(/\s+/).filter((word) => word.trim().length > 0);
    }
    const chunks = [];
    let currentChunk = [];
    let meaningfulWordCount = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const cleanWord = word
        .toLowerCase()
        .replace(/[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/]/g, "");
      const isStopword = this.stopwords.has(cleanWord);

      if (isStopword) {
        // Nếu gặp stopword và chunk hiện tại đủ dài, kết thúc chunk
        if (meaningfulWordCount >= minChunkLength) {
          if (preserveStopwords && currentChunk.length > 0) {
            currentChunk.push(word);
          }

          chunks.push({
            text: currentChunk.join(" ").trim(),
            meaningfulWordCount: meaningfulWordCount,
            totalWordCount: currentChunk.length,
            startIndex: i - currentChunk.length + (preserveStopwords ? 0 : 1),
            endIndex: i,
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
            text: currentChunk.join(" ").trim(),
            meaningfulWordCount: meaningfulWordCount,
            totalWordCount: currentChunk.length,
            startIndex: i - currentChunk.length + 1,
            endIndex: i + 1,
          });

          currentChunk = [];
          meaningfulWordCount = 0;
        }
      }
    }

    // Thêm chunk cuối cùng nếu có
    if (currentChunk.length > 0 && meaningfulWordCount >= minChunkLength) {
      chunks.push({
        text: currentChunk.join(" ").trim(),
        meaningfulWordCount: meaningfulWordCount,
        totalWordCount: currentChunk.length,
        startIndex: words.length - currentChunk.length,
        endIndex: words.length,
      });
    }

    return chunks;
  }

  // Tính toán mật độ stopwords trong text sử dụng vntk
  calculateStopwordDensity(text) {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }

    try {
      // Sử dụng vntk để tách từ tiếng Việt
      const words = tokenizer
        .tokenize(text)
        .map(word => word.toLowerCase().trim())
        .filter(word => word.length > 0 && !/^[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/\s]+$/.test(word));

      if (words.length === 0) return 0;

      const stopwordCount = words.filter((word) =>
        this.stopwords.has(word)
      ).length;
      return (stopwordCount / words.length) * 100;
    } catch (error) {
      console.warn("Lỗi khi sử dụng vntk trong calculateStopwordDensity, fallback về phương pháp cũ:", error);
      // Fallback về phương pháp cũ nếu vntk gặp lỗi
      const words = text
        .toLowerCase()
        .replace(/[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/]/g, " ")
        .split(/\s+/)
        .filter((word) => word.trim().length > 0);

      if (words.length === 0) return 0;

      const stopwordCount = words.filter((word) =>
        this.stopwords.has(word)
      ).length;
      return (stopwordCount / words.length) * 100;
    }
  }

  // Lấy thống kê
  getStats() {
    return {
      totalStopwords: this.stopwords.size,
      initialized: this.initialized,
      sampleStopwords: Array.from(this.stopwords).slice(0, 10),
    };
  }

  // Thêm stopword mới
  addStopword(word) {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }
    this.stopwords.add(word.toLowerCase().trim());
  }

  // Xóa stopword
  removeStopword(word) {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }
    return this.stopwords.delete(word.toLowerCase().trim());
  }

  // Lấy tất cả stopwords
  getAllStopwords() {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }
    return Array.from(this.stopwords).sort();
  }
}

// Tạo singleton instance
const vietnameseStopwordService = new VietnameseStopwordService();

module.exports = vietnameseStopwordService;
