const { TreeAVL, TextHasher } = require('../utils/TreeAVL');

class PlagiarismCacheService {
  constructor() {
    this.textCache = new TreeAVL();
    this.chunkCache = new TreeAVL();
    this.stats = {
      totalCached: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  cacheResult(text, result) {
    try {
      const fullHash = TextHasher.createMD5Hash(text);
      const chunks = TextHasher.createChunkHashes(text, 50);
      
      const cacheData = {
        text: text,
        result: result,
        timestamp: Date.now(),
        wordCount: text.trim().split(/\s+/).length
      };
      
      this.textCache.insert(fullHash, cacheData);
      
      chunks.forEach(chunk => {
        this.chunkCache.insert(chunk.hash, {
          text: chunk.text,
          fullHash: fullHash,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          timestamp: Date.now()
        });
      });
      
      this.stats.totalCached++;
      
      return {
        success: true,
        fullHash: fullHash,
        chunksCount: chunks.length
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

  findSimilarChunks(text, threshold = 0.8) {
    try {
      const chunks = TextHasher.createChunkHashes(text, 50);
      const similarChunks = [];
      
      chunks.forEach(chunk => {
        const exactMatch = this.chunkCache.search(chunk.hash);
        if (exactMatch) {
          similarChunks.push({
            type: 'exact',
            originalChunk: chunk,
            matchedChunk: exactMatch.data,
            similarity: 100
          });
        }
      });
      
      return similarChunks;
      
    } catch (error) {
      console.error('Error finding similar chunks:', error);
      return [];
    }
  }

  getCacheStats() {
    return {
      ...this.stats,
      textCacheSize: this.textCache.getSize(),
      chunkCacheSize: this.chunkCache.getSize(),
      hitRate: this.stats.cacheHits + this.stats.cacheMisses > 0 
        ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  clearAllCache() {
    this.textCache.clear();
    this.chunkCache.clear();
    this.stats = {
      totalCached: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    return { success: true, message: 'All cache cleared' };
  }
}

const plagiarismCacheService = new PlagiarismCacheService();
module.exports = plagiarismCacheService;