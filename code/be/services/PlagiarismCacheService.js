const { TreeAVL, TextHasher } = require('../utils/TreeAVL');

class PlagiarismCacheService {
  constructor() {
    this.textCache = new TreeAVL();
    this.wordCache = new TreeAVL();
    this.stats = {
      totalCached: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  cacheResult(text, result) {
    try {
      const fullHash = TextHasher.createMD5Hash(text);
      const words = TextHasher.createWordHashes(text, true);
      
      const cacheData = {
        text: text,
        result: result,
        timestamp: Date.now(),
        wordCount: text.trim().split(/\s+/).length,
        meaningfulWordCount: words.length
      };
      
      this.textCache.insert(fullHash, cacheData);
      
      words.forEach(wordData => {
        this.wordCache.insert(wordData.hash, {
          word: wordData.word,
          fullHash: fullHash,
          index: wordData.index,
          method: wordData.method,
          timestamp: Date.now()
        });
      });
      
      this.stats.totalCached++;
      
      return {
        success: true,
        fullHash: fullHash,
        wordsCount: words.length
      };
      
    } catch (error) {
      console.error('Error caching plagiarism result:', error);
      return { success: false, error: error.message };
    }
  }

  findCachedResult(text) {
    try {
      const fullHash = TextHasher.createMD5Hash(text);
      const exactMatch = this.textCache.search(fullHash);
      
      if (exactMatch) {
        this.stats.cacheHits++;
        return {
          type: 'exact',
          data: exactMatch.data,
          similarity: 100
        };
      }
      
      this.stats.cacheMisses++;
      return null;
      
    } catch (error) {
      console.error('Error finding cached result:', error);
      this.stats.cacheMisses++;
      return null;
    }
  }

  findSimilarWords(text, threshold = 0.5) {
    try {
      const words = TextHasher.createWordHashes(text, true);
      const similarWords = [];
      const documentMatches = new Map();
      
      words.forEach(wordData => {
        const exactMatch = this.wordCache.search(wordData.hash);
        if (exactMatch) {
          const docHash = exactMatch.data.fullHash;
          
          if (!documentMatches.has(docHash)) {
            documentMatches.set(docHash, {
              matchedWords: [],
              totalWords: 0,
              fullHash: docHash
            });
          }
          
          const docMatch = documentMatches.get(docHash);
          docMatch.matchedWords.push({
            original: wordData.word,
            matched: exactMatch.data.word
          });
          docMatch.totalWords++;
        }
      });
      
      // Tính similarity cho mỗi document
      documentMatches.forEach((docMatch, docHash) => {
        const similarity = (docMatch.matchedWords.length / words.length) * 100;
        
        if (similarity >= threshold * 100) {
          // Lấy thông tin text gốc từ cache
          const cachedText = this.textCache.search(docHash);
          
          similarWords.push({
            type: 'word-based',
            originalText: text.substring(0, 200) + '...',
            matchedText: cachedText ? cachedText.data.text.substring(0, 200) + '...' : 'Unknown',
            similarity: Math.round(similarity),
            matchedWords: docMatch.matchedWords.slice(0, 10), // Giới hạn 10 từ
            fullHash: docHash
          });
        }
      });
      
      return similarWords.sort((a, b) => b.similarity - a.similarity);
      
    } catch (error) {
      console.error('Error finding similar words:', error);
      return [];
    }
  }

  getCacheStats() {
    return {
      ...this.stats,
      textCacheSize: this.textCache.getSize(),
      wordCacheSize: this.wordCache.getSize(),
      hitRate: this.stats.cacheHits + this.stats.cacheMisses > 0 
        ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  clearAllCache() {
    this.textCache.clear();
    this.wordCache.clear();
    this.stats = {
      totalCached: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    return { success: true, message: 'All cache cleared' };
  }

  // Tương thích ngược
  findSimilarChunks(text, threshold = 0.5) {
    console.warn('findSimilarChunks is deprecated, use findSimilarWords instead');
    return this.findSimilarWords(text, threshold);
  }
}

const plagiarismCacheService = new PlagiarismCacheService();
module.exports = plagiarismCacheService;