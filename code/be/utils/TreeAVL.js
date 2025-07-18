const crypto = require('crypto');
const vietnameseStopwordService = require('../services/VietnameseStopwordService');

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
      node.height = Math.max(this.getHeight(node.left), this.getHeight(node.right)) + 1;
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
    return crypto.createHash('md5').update(text.trim().toLowerCase()).digest('hex');
  }

  static createChunkHashes(text, chunkSize = 100, useStopwords = true) {
    const chunks = [];
    
    if (useStopwords && vietnameseStopwordService.initialized) {
      // Sử dụng stopword service để tách chunks thông minh hơn
      const stopwordChunks = vietnameseStopwordService.splitByStopwords(text, {
        minChunkLength: Math.floor(chunkSize * 0.3), // 30% của chunkSize
        maxChunkLength: chunkSize,
        preserveStopwords: false
      });

      stopwordChunks.forEach((chunk, index) => {
        if (chunk.text.trim().length > 0) {
          chunks.push({
            hash: this.createMD5Hash(chunk.text),
            text: chunk.text,
            startIndex: chunk.startIndex,
            endIndex: chunk.endIndex,
            meaningfulWordCount: chunk.meaningfulWordCount,
            totalWordCount: chunk.totalWordCount,
            chunkMethod: 'stopword-based'
          });
        }
      });

      // Nếu không có chunks từ stopword method, fallback về method cũ
      if (chunks.length === 0) {
        return this.createChunkHashesLegacy(text, chunkSize);
      }
    } else {
      // Fallback về method cũ nếu stopword service chưa khởi tạo
      return this.createChunkHashesLegacy(text, chunkSize);
    }
    
    return chunks;
  }

  // Method cũ để tạo chunks (backup)
  static createChunkHashesLegacy(text, chunkSize = 100) {
    const words = text.split(/\s+/);
    const chunks = [];
    
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push({
          hash: this.createMD5Hash(chunk),
          text: chunk,
          startIndex: i,
          endIndex: Math.min(i + chunkSize - 1, words.length - 1),
          meaningfulWordCount: words.slice(i, i + chunkSize).length,
          totalWordCount: words.slice(i, i + chunkSize).length,
          chunkMethod: 'legacy'
        });
      }
    }
    
    return chunks;
  }

  // Tạo hash cho text đã loại bỏ stopwords
  static createMeaningfulHash(text) {
    if (vietnameseStopwordService.initialized) {
      const meaningfulWords = vietnameseStopwordService.extractMeaningfulWords(text);
      const meaningfulText = meaningfulWords.join(' ');
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
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    // Jaccard similarity
    return (intersection.size / union.size) * 100;
  }

  // So sánh cơ bản (fallback)
  static calculateBasicSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return (intersection.size / union.size) * 100;
  }
}

module.exports = { TreeAVL, TextHasher };