const fs = require("fs");
const path = require("path");
// Use vntk word tokenizer for better phrase recognition
const vntk = require("vntk");
const tokenizer = vntk.tokenizer();
const wordTokenizer = vntk.wordTokenizer();

class VietnameseStopwordService {
  constructor() {
    this.stopwords = new Set();
    this.initialized = false;
    // Chỉ sử dụng các cụm từ từ file vietnamese-stopwords.txt
    this.preservedPhrases = new Set();
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

      // Phân loại các từ và cụm từ từ file stopwords
      words.forEach((word) => {
        // Nếu là cụm từ (có khoảng trắng), thêm vào preservedPhrases
        if (word.includes(' ')) {
          this.preservedPhrases.add(word);
        }
        // Vẫn thêm vào stopwords set để kiểm tra
        this.stopwords.add(word);
      });

      this.initialized = true;
      console.log(
        `Vietnamese stopwords service initialized with ${this.stopwords.size} stopwords`
      );
      console.log(
        `Found ${this.preservedPhrases.size} preserved phrases from stopwords file`
      );
    } catch (error) {
      console.error("Error initializing Vietnamese stopwords service:", error);
      throw error;
    }
  }

  // Bảo vệ cụm từ khỏi bị tách bằng cách thay thế chúng bằng placeholder
  protectPhrases(text) {
    if (!text || typeof text !== "string") return { text, mappings: new Map() };
    
    const mappings = new Map();
    let protectedText = text;
    let counter = 0;
    
    // Tạo danh sách tất cả các cụm từ cần bảo vệ - chỉ từ file stopwords
    const allPhrases = this.preservedPhrases;
    
    // Sắp xếp theo độ dài giảm dần để xử lý cụm từ dài trước
    const sortedPhrases = Array.from(allPhrases).sort((a, b) => b.length - a.length);
    
    for (const phrase of sortedPhrases) {
      const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      protectedText = protectedText.replace(regex, (match) => {
        const placeholder = `__PHRASE_${counter}__`;
        mappings.set(placeholder, match);
        counter++;
        return placeholder;
      });
    }
    
    return { text: protectedText, mappings };
  }

  // Khôi phục các cụm từ đã được bảo vệ
  restorePhrases(text, mappings) {
    if (!text || !mappings || mappings.size === 0) return text;
    
    let restoredText = text;
    for (const [placeholder, originalPhrase] of mappings) {
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      restoredText = restoredText.replace(regex, originalPhrase);
    }
    
    return restoredText;
  }

  // Tokenize với bảo vệ cụm từ
  tokenizeWithPhraseProtection(sentence) {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }
    if (!sentence || typeof sentence !== "string") return [];

    // Bảo vệ cụm từ
    const { text: protectedText, mappings } = this.protectPhrases(sentence);

    // Sử dụng word tokenizer để tách từ
    let tokens = [];
    try {
      tokens = wordTokenizer.tag(protectedText);
    } catch (e) {
      try {
        tokens = tokenizer.tokenize(protectedText);
      } catch (e2) {
        tokens = protectedText.split(/\s+/);
      }
    }

    // Khôi phục cụm từ và xử lý
    const processed = [];
    for (const token of tokens) {
      const restored = this.restorePhrases(token, mappings);
      
      // Nếu là cụm từ được bảo vệ, giữ nguyên
      if (this.preservedPhrases.has(restored.toLowerCase())) {
        processed.push(restored);
      } else {
        // Xử lý bình thường
        const normalized = restored.toLowerCase()
          .normalize("NFKC")
          .replace(/[.,!?;:()\[\]{}"'`~@#$%^&*+=|\\<>\/…""''–—\-]/g, " ")
          .replace(/\d+/g, " ")
          .trim();
        
        if (normalized && !this.stopwords.has(normalized)) {
          // Có thể còn chứa khoảng trắng, tách tiếp
          for (const t of normalized.split(/\s+/)) {
            if (t && !this.stopwords.has(t)) {
              processed.push(t);
            }
          }
        }
      }
    }

    return processed;
  }

  // Tokenize với vntk wordTokenizer (tự động nhận diện cụm từ)
  tokenizeWithWordTokenizer(sentence) {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }
    if (!sentence || typeof sentence !== "string") return [];

    let tokens = [];
    try {
      // vntk wordTokenizer tự động nhận diện cụm từ
      tokens = wordTokenizer.tag(sentence);
    } catch (e) {
      try {
        tokens = tokenizer.tokenize(sentence);
      } catch (e2) {
        tokens = sentence.split(/\s+/);
      }
    }

    // Lọc stopwords và normalize
    const processed = [];
    const seen = new Set();
    
    for (const token of tokens) {
      const lower = token.toLowerCase().trim();
      
      // Bỏ qua nếu là stopword hoặc đã thấy
      if (!lower || this.stopwords.has(lower) || seen.has(lower)) {
        continue;
      }
      
      // Nếu là cụm từ (có khoảng trắng), kiểm tra xem có nên giữ không
      if (lower.includes(' ')) {
        // Cụm từ từ file stopwords hoặc preserved phrases
        if (this.preservedPhrasesFromStopwords.has(lower) || 
            this.preservedPhrases.has(lower)) {
          processed.push(lower);
          seen.add(lower);
        } else {
          // Tách cụm từ và xử lý từng từ
          const words = lower.split(/\s+/);
          for (const word of words) {
            if (word && !this.stopwords.has(word) && !seen.has(word)) {
              processed.push(word);
              seen.add(word);
            }
          }
        }
      } else {
        // Từ đơn
        const normalized = lower
          .replace(/[.,!?;:()\[\]{}"'`~@#$%^&*+=|\\<>\/…""''–—\-]/g, "")
          .replace(/\d+/g, "")
          .trim();
        
        if (normalized && !this.stopwords.has(normalized)) {
          processed.push(normalized);
          seen.add(normalized);
        }
      }
    }

    return processed;
  }

  // Tokenize a sentence with vntk word tokenizer (better for phrases)
  tokenizeAndFilterUniqueWithPhrases(sentence) {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }
    if (!sentence || typeof sentence !== "string") return [];

    // Use word tokenizer for better phrase recognition
    let tokens = [];
    try {
      const segmented = wordTokenizer.tag(sentence);
      // wordTokenizer trả về Array, convert to string rồi split
      const stringResult = String(segmented);
      tokens = stringResult.split(',').filter(t => t.trim()).map(t => t.trim());
    } catch (e) {
      // Fallback to tokenizer
      try {
        tokens = tokenizer.tokenize(sentence);
      } catch (e2) {
        // Final fallback: simple split
        tokens = String(sentence).split(/\s+/);
      }
    }

    // Normalize and filter
    const cleaned = [];
    const seen = new Set();
    for (const raw of tokens) {
      const lower = String(raw).toLowerCase();
      // remove punctuation/specials/numbers
      const normalized = lower
        .normalize("NFKC")
        .replace(/[.,!?;:()\[\]{}"'`~@#$%^&*+=|\\<>\/…""''–—\-]/g, " ")
        .replace(/\d+/g, " ")
        .trim();
      if (!normalized) continue;

      // Token can still contain spaces from normalization
      // Nếu là cụm từ có khoảng trắng, kiểm tra xem có phải stopword hay không
      if (normalized.includes(' ')) {
        // Nếu không phải stopword, giữ nguyên cụm từ
        if (!this.stopwords.has(normalized)) {
          if (!seen.has(normalized)) {
            seen.add(normalized);
            cleaned.push(normalized);
          }
        }
      } else {
        // Xử lý từ đơn như cũ
        if (!this.stopwords.has(normalized) && !seen.has(normalized)) {
          seen.add(normalized);
          cleaned.push(normalized);
        }
      }
    }
    return cleaned;
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

  // Loại bỏ stopwords từ một đoạn text sử dụng vntk với bảo vệ cụm từ
  removeStopwords(text) {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }

    try {
      // Bảo vệ cụm từ trước khi xử lý
      const { text: protectedText, mappings } = this.protectPhrases(text);
      
      // Sử dụng vntk để tách từ tiếng Việt
      const words = tokenizer.tokenize(protectedText);
      
      // Lọc ra những từ không phải stopword
      const filteredWords = words.filter(word => {
        const cleanWord = word.toLowerCase().trim();
        
        // Kiểm tra xem có phải là placeholder của cụm từ được bảo vệ không
        if (word.startsWith('__PHRASE_') && word.endsWith('__')) {
          return true; // Giữ lại placeholder
        }
        
        return cleanWord.length > 0 && !this.stopwords.has(cleanWord);
      });

      // Khôi phục cụm từ và join lại
      const result = filteredWords.join(" ");
      return this.restorePhrases(result, mappings);
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

  // Tách text thành các từ có nghĩa (loại bỏ stopwords) sử dụng vntk với bảo vệ cụm từ
  extractMeaningfulWords(text) {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }

    let meaningfulWords;

    if (typeof text === "string") {
      try {
        // Bảo vệ cụm từ trước khi xử lý
        const { text: protectedText, mappings } = this.protectPhrases(text);
        
        // Sử dụng vntk để tách từ tiếng Việt
        const words = tokenizer.tokenize(protectedText);
        
        // Lọc ra những từ có nghĩa (loại bỏ stopwords và từ rỗng)
        meaningfulWords = [];
        for (const word of words) {
          // Khôi phục cụm từ nếu là placeholder
          const restored = this.restorePhrases(word, mappings);
          
          // Nếu là cụm từ được bảo vệ, giữ nguyên
          if (this.preservedPhrases.has(restored.toLowerCase())) {
            meaningfulWords.push(restored.toLowerCase());
          } else {
            const lower = restored.toLowerCase().trim();
            // Loại bỏ từ rỗng, dấu câu và stopwords
            if (lower.length > 0 && 
                !/^[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/\s]+$/.test(lower) &&
                !this.stopwords.has(lower)) {
              meaningfulWords.push(lower);
            }
          }
        }
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

  // Thêm cụm từ cần bảo vệ
  addPreservedPhrase(phrase) {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }
    this.preservedPhrases.add(phrase.toLowerCase().trim());
  }

  // Xóa cụm từ bảo vệ
  removePreservedPhrase(phrase) {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }
    return this.preservedPhrases.delete(phrase.toLowerCase().trim());
  }

  // Lấy tất cả cụm từ được bảo vệ
  getAllPreservedPhrases() {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }
    return {
      customPhrases: Array.from(this.preservedPhrases).sort(),
      stopwordPhrases: Array.from(this.preservedPhrasesFromStopwords).sort()
    };
  }

  // Kiểm tra xem có phải cụm từ được bảo vệ không
  isPreservedPhrase(phrase) {
    if (!this.initialized) {
      throw new Error("Vietnamese stopwords service not initialized");
    }
    const normalized = phrase.toLowerCase().trim();
    return this.preservedPhrases.has(normalized) || 
           this.preservedPhrasesFromStopwords.has(normalized);
  }
}

// Tạo singleton instance
const vietnameseStopwordService = new VietnameseStopwordService();

module.exports = vietnameseStopwordService;
