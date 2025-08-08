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
  const fullHash = TextHasher.createMeaningfulHash(text);
  const words = TextHasher.createWordHashes(text);
      
      const cacheData = {
        text: text,
        result: result,
        timestamp: Date.now(),
        wordCount: text.trim().split(/\s+/).length,
        meaningfulWordCount: words.length
      };
      
  this.textCache.insertOccurrence(fullHash, "_cache_", "_cache_:");
  // store payload reference by overriding getAllNodes is not suitable; attach to a side map
  if (!this.payloads) this.payloads = new Map();
  this.payloads.set(fullHash, cacheData);
      
      words.forEach(wordData => {
        this.wordCache.insertOccurrence(wordData.hash, fullHash, `cache:${fullHash}`);
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
  const fullHash = TextHasher.createMeaningfulHash(text);
  const exactMatch = this.textCache.search(fullHash);
      
      if (exactMatch) {
        this.stats.cacheHits++;
        return {
          type: 'exact',
          data: this.payloads ? this.payloads.get(fullHash) : undefined,
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
  const words = TextHasher.createWordHashes(text);
      const similarWords = [];
      const documentMatches = new Map();
      
      words.forEach(wordData => {
        const exactMatch = this.wordCache.search(wordData.hash);
        if (exactMatch) {
          // use the first doc reference from node.documents as the cached doc key
          const docHash = Array.from(exactMatch.documents)[0];
          
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
      
      // Tính similarity cho mỗi document sử dụng công thức Plagiarism Ratio sử dụng công thức Plagiarism Ratio
      documentMatches.forEach((docMatch, docHash) => {
        // Sử dụng công thức Plagiarism Ratio: (intersection.size / set1.size) * 100
        // Sử dụng công thức Plagiarism Ratio: (intersection.size / set1.size) * 100
        const similarity = (docMatch.matchedWords.length / words.length) * 100;
        
        if (similarity >= threshold * 100) {
          // Lấy thông tin text gốc từ cache
          const cachedText = this.payloads ? this.payloads.get(docHash) : undefined;
          
          similarWords.push({
            type: 'word-based',
            originalText: text.substring(0, 200) + '...',
            matchedText: cachedText ? String(cachedText.text || '').substring(0, 200) + '...' : 'Unknown',
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