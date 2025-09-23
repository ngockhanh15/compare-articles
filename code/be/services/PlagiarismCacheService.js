const { TextHasher } = require('../utils/TreeAVL');

class PlagiarismCacheService {
  constructor() {
    // Sử dụng DocumentAVLService thống nhất thay vì tạo cây riêng
    this.documentAVLService = null; // Sẽ được inject
    this.stats = {
      totalCached: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    this.cache = new Map(); // Simple in-memory cache cho kết quả
  }

  // Inject DocumentAVLService để sử dụng cây AVL chung
  setDocumentAVLService(service) {
    this.documentAVLService = service;
  }

  cacheResult(text, result) {
    try {
      const fullHash = TextHasher.createMeaningfulHash(text);
      
      const cacheData = {
        text: text,
        result: result,
        timestamp: Date.now(),
        wordCount: text.trim().split(/\s+/).length,
      };
      
      // Lưu vào cache đơn giản
      this.cache.set(fullHash, cacheData);
      this.stats.totalCached++;
      
      return {
        success: true,
        fullHash: fullHash,
      };
      
    } catch (error) {
      console.error('Error caching plagiarism result:', error);
      return { success: false, error: error.message };
    }
  }

  findCachedResult(text) {
    try {
      const fullHash = TextHasher.createMeaningfulHash(text);
      const cachedData = this.cache.get(fullHash);
      
      if (cachedData) {
        this.stats.cacheHits++;
        return {
          type: 'exact',
          data: cachedData,
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

  async findSimilarWords(text, threshold = 0.5) {
    try {
      // Sử dụng DocumentAVLService để tìm similar words thay vì cache riêng
      if (!this.documentAVLService) {
        console.warn('DocumentAVLService not injected, returning empty results');
        return [];
      }

      // Sử dụng checkDuplicateContent để tìm similar
      // Không truyền minSimilarity để sử dụng sentenceThreshold từ database
      try {
        const result = await this.documentAVLService.checkDuplicateContent(text, {
          maxResults: 10
        });
        
        return result.matches.map(match => ({
          similarity: match.similarity,
          matchedText: match.matchedText || match.title,
          fullHash: match.documentId,
          matchedWords: [] // Simplified
        }));
      } catch (avlError) {
        console.warn('Error using DocumentAVLService, returning empty:', avlError.message);
        return [];
      }
      
    } catch (error) {
      console.error('Error finding similar words:', error);
      return [];
    }
  }

  getCacheStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      hitRate: this.stats.cacheHits + this.stats.cacheMisses > 0 
        ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  clearAllCache() {
    this.cache.clear();
    this.stats = {
      totalCached: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    return { success: true, message: 'All cache cleared' };
  }

  // Tương thích ngược
  async findSimilarChunks(text, threshold = 0.5) {
    console.warn('findSimilarChunks is deprecated, use findSimilarWords instead');
    return await this.findSimilarWords(text, threshold);
  }
}

const plagiarismCacheService = new PlagiarismCacheService();
module.exports = plagiarismCacheService;