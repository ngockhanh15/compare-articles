const MurmurHash3 = require("murmurhash3js");
const vietnameseStopwordService = require("../services/VietnameseStopwordService");

class AVLNode {
  constructor(hash) {
    this.hash = hash;
    // Store aggregated refs
    this.documents = new Set(); // document IDs containing this token
    this.sentences = new Set(); // sentence IDs (docId:index) containing this token
    this.height = 1;
    this.left = null;
    this.right = null;
  }
}

class TreeAVL {
  constructor() {
    this.root = null;
    this.size = 0;
  }

  getHeight(node) {
    return node ? node.height : 0;
  }

  getBalance(node) {
    return node ? this.getHeight(node.left) - this.getHeight(node.right) : 0;
  }

  updateHeight(node) {
    if (node) {
      node.height =
        Math.max(this.getHeight(node.left), this.getHeight(node.right)) + 1;
    }
  }

  rotateRight(y) {
    const x = y.left;
    const T2 = x.right;
    x.right = y;
    y.left = T2;
    this.updateHeight(y);
    this.updateHeight(x);
    return x;
  }

  rotateLeft(x) {
    const y = x.right;
    const T2 = y.left;
    y.left = x;
    x.right = T2;
    this.updateHeight(x);
    this.updateHeight(y);
    return y;
  }

  // Insert an occurrence of a token hash, adding doc and sentence refs
  insertOccurrence(hash, documentId, sentenceId) {
    const [newRoot, insertedNew] = this._insertNode(this.root, hash, documentId, sentenceId);
    this.root = newRoot;
    if (insertedNew) this.size++;
  }

  _insertNode(node, hash, documentId, sentenceId) {
    if (!node) {
      const created = new AVLNode(hash);
      if (documentId) created.documents.add(String(documentId));
      if (sentenceId) created.sentences.add(String(sentenceId));
      return [created, true];
    }

    if (hash < node.hash) {
      const [left, insertedNew] = this._insertNode(node.left, hash, documentId, sentenceId);
      node.left = left;
      this.updateHeight(node);
      return [this._rebalance(node, hash), insertedNew];
    } else if (hash > node.hash) {
      const [right, insertedNew] = this._insertNode(node.right, hash, documentId, sentenceId);
      node.right = right;
      this.updateHeight(node);
      return [this._rebalance(node, hash), insertedNew];
    } else {
      // Existing node: add refs (no size change)
      if (documentId) node.documents.add(String(documentId));
      if (sentenceId) node.sentences.add(String(sentenceId));
      return [node, false];
    }
  }

  _rebalance(node, hash) {
    const balance = this.getBalance(node);

    if (balance > 1 && hash < node.left.hash) {
      return this.rotateRight(node);
    }

    if (balance < -1 && hash > node.right.hash) {
      return this.rotateLeft(node);
    }

    if (balance > 1 && hash > node.left.hash) {
      node.left = this.rotateLeft(node.left);
      return this.rotateRight(node);
    }

    if (balance < -1 && hash < node.right.hash) {
      node.right = this.rotateRight(node.right);
      return this.rotateLeft(node);
    }

    return node;
  }

  search(hash) {
    return this._searchNode(this.root, hash);
  }

  _searchNode(node, hash) {
    if (!node || node.hash === hash) {
      return node;
    }
    if (hash < node.hash) {
      return this._searchNode(node.left, hash);
    }
    return this._searchNode(node.right, hash);
  }

  getAllNodes() {
    const result = [];
    this._inOrderTraversal(this.root, result);
    return result;
  }

  _inOrderTraversal(node, result) {
    if (node) {
      this._inOrderTraversal(node.left, result);
      result.push({
        hash: node.hash,
        documents: Array.from(node.documents),
        sentences: Array.from(node.sentences),
      });
      this._inOrderTraversal(node.right, result);
    }
  }

  getSize() {
    return this.size;
  }

  clear() {
    this.root = null;
    this.size = 0;
  }
}

class TextHasher {
  static createMurmurHash(text) {
    // 32-bit hash as hex string for consistency
    const val = MurmurHash3.x86.hash32(String(text).trim().toLowerCase());
    // Ensure hex padding to 8 chars
    return Number(val >>> 0).toString(16).padStart(8, "0");
  }

  static createWordHashes(text) {
    // Use vntk-based tokenizer and unique within sentence semantics not needed here; this is generic
    const words = vietnameseStopwordService.initialized
      ? vietnameseStopwordService.extractMeaningfulWords(text)
      : String(text)
          .toLowerCase()
          .replace(/[^\p{L}\s]/gu, " ")
          .split(/\s+/)
          .filter(Boolean);

    return words.map((word, index) => ({
      hash: this.createMurmurHash(word),
      word,
      index,
      method: "murmur32",
    }));
  }

  // Method cũ để tạo word hashes (backup)
  static createWordHashesLegacy(text) {
    const words = String(text)
      .toLowerCase()
      .replace(/[^\p{L}\s]/gu, " ")
      .split(/\s+/)
      .filter(Boolean);

    return words.map((word, index) => ({
      hash: this.createMurmurHash(word),
      word,
      index,
      method: "legacy-murmur32",
    }));
  }

  // Tương thích ngược: tạo chunk hashes (deprecated)
  static createChunkHashes(text, chunkSize = 100, useStopwords = true) {
    console.warn(
      "createChunkHashes is deprecated, use createWordHashes instead"
    );
    return this.createWordHashes(text, useStopwords);
  }

  // Tạo hash cho text đã loại bỏ stopwords
  static createMeaningfulHash(text) {
    const words = vietnameseStopwordService.initialized
      ? vietnameseStopwordService.extractMeaningfulWords(text)
      : String(text).toLowerCase().split(/\s+/);
    return this.createMurmurHash(words.join(" "));
  }

  // Tạo cụm từ (n-grams) từ danh sách từ có nghĩa (ưu tiên cụm từ 2-gram)
  static createMeaningfulPhrases(meaningfulWords, maxPhraseLength = 2) {
    const allPhrases = new Set();
    const usedWordIndices = new Set();

    // Ưu tiên tạo cụm từ 2-gram trước
    for (let i = 0; i <= meaningfulWords.length - 2; i++) {
      if (!usedWordIndices.has(i) && !usedWordIndices.has(i + 1)) {
        const phrase = meaningfulWords.slice(i, i + 2).join(" ");
        allPhrases.add(phrase);
        usedWordIndices.add(i);
        usedWordIndices.add(i + 1);
      }
    }

    // Thêm các từ đơn lẻ chưa được sử dụng
    meaningfulWords.forEach((word, index) => {
      if (!usedWordIndices.has(index)) {
        allPhrases.add(word);
      }
    });

    return Array.from(allPhrases);
  }

  // So sánh độ tương tự dựa trên cụm từ có nghĩa (sử dụng Plagiarism Ratio)
  static calculateMeaningfulSimilarity(text1, text2) {
    if (!vietnameseStopwordService.initialized) {
      return this.calculateBasicSimilarity(text1, text2);
    }

    const words1 = vietnameseStopwordService.extractMeaningfulWords(text1);
    const words2 = vietnameseStopwordService.extractMeaningfulWords(text2);

    if (words1.length === 0 || words2.length === 0) return 0;

    // Tạo cụm từ từ các từ có nghĩa
    let phrases1 = this.createMeaningfulPhrases(words1);
    let phrases2 = this.createMeaningfulPhrases(words2);

    // Loại bỏ nhóm từ
    phrases1 = vietnameseStopwordService.extractMeaningfulWords(phrases1);
    phrases2 = vietnameseStopwordService.extractMeaningfulWords(phrases2);

    // Biến về từ thường bằng cách tách lại từ dấu cách
    phrases1 = phrases1.flatMap((p) => p.split(/\s+/));
    phrases2 = phrases2.flatMap((p) => p.split(/\s+/));

    const set1 = new Set(phrases1);
    const set2 = new Set(phrases2);

    const intersection = [...set1].filter((x) => set2.has(x));

    // Plagiarism Ratio: số cụm từ trùng lặp / tổng số cụm từ trong văn bản kiểm tra * 100%
    const plagiarismRatio = (intersection.length / set1.size) * 100;

    return plagiarismRatio;
  }

  // So sánh cơ bản (fallback) - sử dụng Plagiarism Ratio
  static calculateBasicSimilarity(text1, text2) {
  const words1 = String(text1).toLowerCase().split(/\s+/);
  const words2 = String(text2).toLowerCase().split(/\s+/);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = [...set1].filter((x) => set2.has(x));

    // Plagiarism Ratio = số từ trùng lặp / tổng số từ trong văn bản kiểm tra * 100%
    return (intersection.length / set2.size) * 100;
  }

  // Tách văn bản thành các câu hoàn chỉnh
  static extractSentences(text) {
    // Tách câu bằng dấu chấm, chấm hỏi, chấm than
    const sentences = text
      .split(/[.!?]+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 10); // Lọc câu quá ngắn

    return sentences;
  }

  // Tạo hash cho từng câu
  static createSentenceHashes(text, useStopwords = true) {
    const sentences = this.extractSentences(text);
    const sentenceHashes = [];

    sentences.forEach((sentence, index) => {
      if (sentence.trim().length > 10) {
        // Tạo hash cho câu gốc
  const originalHash = this.createMurmurHash(sentence);

        // Tạo hash cho câu đã lọc stopwords (nếu có)
        let meaningfulHash = originalHash;
        if (useStopwords && vietnameseStopwordService.initialized) {
          const meaningfulWords =
            vietnameseStopwordService.extractMeaningfulWords(sentence);
          const meaningfulText = meaningfulWords.join(" ");
          if (meaningfulText.trim().length > 0) {
            meaningfulHash = this.createMurmurHash(meaningfulText);
          }
        }

        sentenceHashes.push({
          hash: meaningfulHash,
          originalHash: originalHash,
          sentence: sentence,
          index: index,
          wordCount: sentence.split(/\s+/).length,
          method: useStopwords ? "stopword-filtered" : "original",
        });
      }
    });

    return sentenceHashes;
  }

  // So sánh độ tương tự giữa hai câu (Plagiarism Ratio)
  static calculateSentenceSimilarity(
    sentence1,
    sentence2,
    useStopwords = true
  ) {
    if (useStopwords && vietnameseStopwordService.initialized) {
      return this.calculateMeaningfulSimilarity(sentence1, sentence2);
    } else {
      return this.calculateBasicSimilarity(sentence1, sentence2);
    }
  }

  // Tính plagiarism ratio chi tiết với thông tin debug (sử dụng cụm từ)
  static calculatePlagiarismRatio(sourceText, checkText, useStopwords = true) {
    let words1, words2, phrases1, phrases2;

    if (useStopwords && vietnameseStopwordService.initialized) {
      words1 = vietnameseStopwordService.extractMeaningfulWords(sourceText);
      words2 = vietnameseStopwordService.extractMeaningfulWords(checkText);
      phrases1 = this.createMeaningfulPhrases(words1);
      phrases2 = this.createMeaningfulPhrases(words2);
    } else {
      words1 = sourceText
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.trim().length > 0);
      words2 = checkText
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.trim().length > 0);
      phrases1 = words1; // Fallback to individual words
      phrases2 = words2;
    }

    if (words1.length === 0 && words2.length === 0)
      return {
        ratio: 100,
        matchedPhrases: [],
        totalPhrases: 0,
        sourcePhrases: 0,
        details: "Both texts are empty",
        meaningfulWords1: [],
        meaningfulWords2: [],
      };

    if (words1.length === 0)
      return {
        ratio: 0,
        matchedPhrases: [],
        totalPhrases: phrases2.length,
        sourcePhrases: 0,
        details: "Source text is empty",
        meaningfulWords1: [],
        meaningfulWords2: words2,
      };

    const set1 = new Set(phrases1);
    const set2 = new Set(phrases2);
    const intersection = [...set1].filter((x) => set2.has(x));

    // Plagiarism Ratio = số cụm từ trùng lặp / tổng số cụm từ trong văn bản kiểm tra * 100%
    const ratio = (intersection.length / set2.size) * 100;

    return {
      ratio: ratio,
      matchedPhrases: intersection,
      totalPhrases: set1.size,
      sourcePhrases: set2.size,
      details: `${intersection.length}/${set1.size} phrases matched`,
      sourcePhrasesList: Array.from(set1),
      checkPhrasesList: Array.from(set2),
      matchedPhrasesList: intersection,
      meaningfulWords1: words1,
      meaningfulWords2: words2,
    };
  }

  // Phát hiện trùng lặp với ngưỡng tùy chỉnh
  static isDuplicate(
    sentence1,
    sentence2,
    threshold = 70,
    useStopwords = true
  ) {
    const similarity = this.calculateSentenceSimilarity(
      sentence1,
      sentence2,
      useStopwords
    );
    return {
      isDuplicate: similarity >= threshold,
      similarity: similarity,
      threshold: threshold,
    };
  }

  // Tạo hash cho nhóm từ có nghĩa (để phát hiện trùng lặp tốt hơn)
  static createSemanticHash(text, useStopwords = true) {
    if (useStopwords && vietnameseStopwordService.initialized) {
      const meaningfulWords =
        vietnameseStopwordService.extractMeaningfulWords(text);
      // Sắp xếp từ để tạo hash nhất quán cho nội dung tương tự
      const sortedWords = meaningfulWords.sort();
      const semanticText = sortedWords.join(" ");
      return this.createMurmurHash(semanticText);
    }
    return this.createMurmurHash(text);
  }

  // So sánh hash semantic
  static compareSemanticHashes(text1, text2, useStopwords = true) {
    const hash1 = this.createSemanticHash(text1, useStopwords);
    const hash2 = this.createSemanticHash(text2, useStopwords);
    return {
      hash1: hash1,
      hash2: hash2,
      isEqual: hash1 === hash2,
    };
  }
}

module.exports = { TreeAVL, TextHasher };
