const crypto = require("crypto");
const vietnameseStopwordService = require("../services/VietnameseStopwordService");

class AVLNode {
  constructor(hash, data) {
    this.hash = hash;
    this.data = data;
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

  insert(hash, data) {
    this.root = this._insertNode(this.root, hash, data);
    this.size++;
  }

  _insertNode(node, hash, data) {
    if (!node) {
      return new AVLNode(hash, data);
    }

    if (hash < node.hash) {
      node.left = this._insertNode(node.left, hash, data);
    } else if (hash > node.hash) {
      node.right = this._insertNode(node.right, hash, data);
    } else {
      node.data = data;
      this.size--;
      return node;
    }

    this.updateHeight(node);
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
      result.push({ hash: node.hash, data: node.data });
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
  static createMD5Hash(text) {
    return crypto
      .createHash("md5")
      .update(text.trim().toLowerCase())
      .digest("hex");
  }

  static createWordHashes(text, useStopwords = true) {
    const wordHashes = [];

    if (useStopwords && vietnameseStopwordService.initialized) {
      // Lọc stopwords và tạo hash cho từng từ có nghĩa
      const meaningfulWords = vietnameseStopwordService.extractMeaningfulWords(text);
      
      meaningfulWords.forEach((word, index) => {
        if (word.trim().length > 0) {
          wordHashes.push({
            hash: this.createMD5Hash(word),
            word: word,
            index: index,
            method: "stopword-filtered",
          });
        }
      });

      // Nếu không có từ có nghĩa, fallback về method cũ
      if (wordHashes.length === 0) {
        return this.createWordHashesLegacy(text);
      }
    } else {
      // Fallback về method cũ nếu stopword service chưa khởi tạo
      return this.createWordHashesLegacy(text);
    }

    return wordHashes;
  }

  // Method cũ để tạo word hashes (backup)
  static createWordHashesLegacy(text) {
    const words = text.toLowerCase()
      .replace(/[.,!?;:()[\]{}""''`~@#$%^&*+=|\\<>\/]/g, ' ')
      .split(/\s+/)
      .filter(word => word.trim().length > 0);
    
    const wordHashes = [];

    words.forEach((word, index) => {
      if (word.trim().length > 0) {
        wordHashes.push({
          hash: this.createMD5Hash(word),
          word: word,
          index: index,
          method: "legacy",
        });
      }
    });

    return wordHashes;
  }

  // Tương thích ngược: tạo chunk hashes (deprecated)
  static createChunkHashes(text, chunkSize = 100, useStopwords = true) {
    console.warn('createChunkHashes is deprecated, use createWordHashes instead');
    return this.createWordHashes(text, useStopwords);
  }

  // Tạo hash cho text đã loại bỏ stopwords
  static createMeaningfulHash(text) {
    if (vietnameseStopwordService.initialized) {
      const meaningfulWords =
        vietnameseStopwordService.extractMeaningfulWords(text);
      const meaningfulText = meaningfulWords.join(" ");
      return this.createMD5Hash(meaningfulText);
    }
    return this.createMD5Hash(text);
  }

  // So sánh độ tương tự dựa trên từ có nghĩa
  static calculateMeaningfulSimilarity(text1, text2) {
    if (!vietnameseStopwordService.initialized) {
      return this.calculateBasicSimilarity(text1, text2);
    }

    const words1 = vietnameseStopwordService.extractMeaningfulWords(text1);
    const words2 = vietnameseStopwordService.extractMeaningfulWords(text2);

    if (words1.length === 0 && words2.length === 0) return 100;
    if (words1.length === 0) return 0;

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = [...set1].filter((x) => set2.has(x));

    // Copy Rate = số từ trùng / tổng số từ của câu kiểm tra
    return (intersection.length / set1.size) * 100;
  }

  // So sánh cơ bản (fallback)
  static calculateBasicSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = [...set1].filter((x) => set2.has(x));

    // Copy Rate = số từ trùng / tổng số từ của câu kiểm tra
    return (intersection.length / set1.size) * 100;
  }
}

module.exports = { TreeAVL, TextHasher };
