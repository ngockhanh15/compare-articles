const { TreeAVL, TextHasher } = require('../utils/TreeAVL');
const PlagiarismCheck = require('../models/PlagiarismCheck');
const vietnameseStopwordService = require('./VietnameseStopwordService');

class PlagiarismDetectionService {
  constructor() {
    this.documentTree = new TreeAVL();
    this.chunkTree = new TreeAVL();
    this.initialized = false;
  }

  // Khởi tạo cây AVL với dữ liệu từ database
  async initialize() {
    try {
      console.log('Initializing plagiarism detection service...');
      
      // Khởi tạo Vietnamese stopword service trước
      if (!vietnameseStopwordService.initialized) {
        await vietnameseStopwordService.initialize();
      }
      
      // Lấy tất cả các document đã kiểm tra từ database
      const existingChecks = await PlagiarismCheck.find({})
        .select('originalText duplicatePercentage matches sources')
        .lean();

      console.log(`Loading ${existingChecks.length} documents into AVL tree...`);

      // Thêm từng document vào cây AVL
      for (const check of existingChecks) {
        this.addDocumentToTree(check.originalText, {
          id: check._id,
          duplicatePercentage: check.duplicatePercentage,
          matches: check.matches,
          sources: check.sources
        });
      }

      this.initialized = true;
      console.log(`Plagiarism detection service initialized with ${this.documentTree.getSize()} documents and ${this.chunkTree.getSize()} chunks`);
      console.log(`Vietnamese stopwords: ${vietnameseStopwordService.getStats().totalStopwords} words loaded`);
      
    } catch (error) {
      console.error('Error initializing plagiarism detection service:', error);
      throw error;
    }
  }

  // Thêm document mới vào cây AVL
  addDocumentToTree(text, metadata = {}) {
    try {
      // Tạo hash cho toàn bộ document
      const fullHash = TextHasher.createMD5Hash(text);
      
      // Thêm document vào cây chính
      this.documentTree.insert(fullHash, {
        text: text,
        metadata: metadata,
        timestamp: Date.now(),
        wordCount: text.trim().split(/\s+/).length
      });

      // Chia thành chunks và thêm vào cây chunks (sử dụng stopwords)
      const chunks = TextHasher.createChunkHashes(text, 50, true); // 50 từ mỗi chunk, sử dụng stopwords
      
      chunks.forEach(chunk => {
        this.chunkTree.insert(chunk.hash, {
          text: chunk.text,
          parentHash: fullHash,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          metadata: metadata
        });
      });

    } catch (error) {
      console.error('Error adding document to tree:', error);
    }
  }

  // Kiểm tra plagiarism thực sự
  async checkPlagiarism(inputText, options = {}) {
    const startTime = Date.now();

    try {
      // Đảm bảo service đã được khởi tạo
      if (!this.initialized) {
        await this.initialize();
      }

      const result = {
        duplicatePercentage: 0,
        matches: [],
        sources: [],
        confidence: 'low',
        processingTime: 0,
        fromCache: false,
        totalDocumentsChecked: this.documentTree.getSize(),
        totalChunksChecked: this.chunkTree.getSize(),
        // Thêm các thông số mới
        dtotal: 0, // Tổng số câu trùng không lặp lại với tất cả câu/csdl mẫu
        dab: 0, // Tổng câu trùng không lặp lại so với Document B nào đó
        mostSimilarDocument: null // Thông tin document giống nhất
      };

      // 1. Kiểm tra exact match với toàn bộ document
      const exactMatch = this.findExactMatch(inputText);
      if (exactMatch) {
        result.duplicatePercentage = 100;
        result.matches.push({
          text: exactMatch.text.substring(0, 200) + '...',
          source: 'internal-database',
          similarity: 100,
          url: `internal://document/${exactMatch.metadata.id}`,
          matchedWords: exactMatch.wordCount,
          fromCache: false
        });
        result.sources.push('internal-database');
        result.confidence = 'high';
        result.processingTime = Date.now() - startTime;
        return result;
      }

      // 2. Kiểm tra partial matches thông qua chunks (sử dụng stopwords)
      const partialMatches = this.findPartialMatches(inputText, options.sensitivity || 'medium');
      
      if (partialMatches.length > 0) {
        // Tính toán duplicate percentage dựa trên matches
        const inputWordCount = inputText.trim().split(/\s+/).length;
        let totalMatchedWords = 0;
        const uniqueSources = new Set();
        
        // Tính toán Dtotal và DA/B
        const uniqueMatchedSentences = new Set(); // Để tránh đếm trùng câu
        let mostSimilarMatch = null;
        let highestSimilarity = 0;

        partialMatches.forEach(match => {
          result.matches.push({
            text: match.text.substring(0, 200) + '...',
            source: match.source || 'internal-database',
            similarity: match.similarity,
            url: match.url || `internal://document/${match.metadata?.id}`,
            matchedWords: match.matchedWords,
            fromCache: false
          });

          totalMatchedWords += match.matchedWords;
          uniqueSources.add(match.source || 'internal-database');
          
          // Thêm câu vào set để tính Dtotal (tránh trùng lặp)
          const sentences = match.text.split(/[.!?]+/).filter(s => s.trim().length > 10);
          sentences.forEach(sentence => {
            if (sentence.trim().length > 10) {
              uniqueMatchedSentences.add(sentence.trim().toLowerCase());
            }
          });
          
          // Tìm document có similarity cao nhất cho DA/B
          if (match.similarity > highestSimilarity) {
            highestSimilarity = match.similarity;
            mostSimilarMatch = match;
          }
        });

        // Tính Dtotal: số câu duy nhất trùng với toàn bộ CSDL
        result.dtotal = uniqueMatchedSentences.size;
        
        // Tính DA/B: số câu trùng với document giống nhất
        if (mostSimilarMatch) {
          const mostSimilarSentences = mostSimilarMatch.text.split(/[.!?]+/)
            .filter(s => s.trim().length > 10);
          result.dab = mostSimilarSentences.length;
          
          // Thông tin document giống nhất
          result.mostSimilarDocument = {
            id: mostSimilarMatch.metadata?.id || 'unknown',
            name: `Document-${mostSimilarMatch.metadata?.id?.toString().substring(0, 8) || 'unknown'}`,
            similarity: mostSimilarMatch.similarity
          };
        }

        result.duplicatePercentage = Math.min(
          Math.round((totalMatchedWords / inputWordCount) * 100), 
          95
        );
        result.sources = Array.from(uniqueSources);
        
        // Xác định confidence level
        if (result.duplicatePercentage > 30) {
          result.confidence = 'high';
        } else if (result.duplicatePercentage > 15) {
          result.confidence = 'medium';
        } else {
          result.confidence = 'low';
        }
      }

      result.processingTime = Date.now() - startTime;
      return result;

    } catch (error) {
      console.error('Error in plagiarism check:', error);
      throw error;
    }
  }

  // Tìm exact match
  findExactMatch(text) {
    const hash = TextHasher.createMD5Hash(text);
    const node = this.documentTree.search(hash);
    return node ? node.data : null;
  }

  // Tìm partial matches thông qua chunks (sử dụng stopwords)
  findPartialMatches(text, sensitivity = 'medium') {
    const chunks = TextHasher.createChunkHashes(text, 50, true); // Sử dụng stopwords
    const matches = [];
    const foundSources = new Map(); // Để tránh duplicate từ cùng một source

    // Thiết lập threshold dựa trên sensitivity
    const thresholds = {
      'low': 0.6,
      'medium': 0.7,
      'high': 0.8
    };
    const threshold = thresholds[sensitivity] || 0.7;

    chunks.forEach((chunk, index) => {
      // Tìm exact chunk match
      const exactChunkMatch = this.chunkTree.search(chunk.hash);
      
      if (exactChunkMatch) {
        const sourceKey = exactChunkMatch.data.parentHash;
        
        // Tránh duplicate matches từ cùng một document
        if (!foundSources.has(sourceKey)) {
          // Sử dụng meaningful similarity để so sánh chính xác hơn
          const similarity = TextHasher.calculateMeaningfulSimilarity(chunk.text, exactChunkMatch.data.text);
          
          if (similarity >= threshold * 100) {
            matches.push({
              text: exactChunkMatch.data.text,
              source: 'internal-database',
              similarity: Math.round(similarity),
              matchedWords: chunk.meaningfulWordCount || chunk.text.split(/\s+/).length,
              metadata: exactChunkMatch.data.metadata,
              chunkIndex: index,
              chunkMethod: chunk.chunkMethod || 'unknown'
            });
            
            foundSources.set(sourceKey, true);
          }
        }
      }
    });

    // Sắp xếp matches theo similarity giảm dần
    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 5); // Giới hạn 5 matches
  }

  // Tính toán độ tương tự giữa hai đoạn text (sử dụng meaningful similarity)
  calculateSimilarity(text1, text2) {
    return TextHasher.calculateMeaningfulSimilarity(text1, text2);
  }

  // Thêm document mới sau khi kiểm tra
  async addNewDocument(text, checkResult) {
    try {
      this.addDocumentToTree(text, {
        duplicatePercentage: checkResult.duplicatePercentage,
        matches: checkResult.matches,
        sources: checkResult.sources,
        addedAt: Date.now()
      });
      
      console.log(`Added new document to plagiarism detection tree. Total documents: ${this.documentTree.getSize()}`);
    } catch (error) {
      console.error('Error adding new document:', error);
    }
  }

  // Lấy thống kê
  getStats() {
    return {
      totalDocuments: this.documentTree.getSize(),
      totalChunks: this.chunkTree.getSize(),
      initialized: this.initialized,
      stopwordService: vietnameseStopwordService.getStats(),
      memoryUsage: process.memoryUsage()
    };
  }

  // Reset service
  async reset() {
    this.documentTree.clear();
    this.chunkTree.clear();
    this.initialized = false;
    console.log('Plagiarism detection service reset');
  }
}

// Tạo singleton instance
const plagiarismDetectionService = new PlagiarismDetectionService();

module.exports = plagiarismDetectionService;