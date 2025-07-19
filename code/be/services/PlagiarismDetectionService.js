const { TreeAVL, TextHasher } = require('../utils/TreeAVL');
const PlagiarismCheck = require('../models/PlagiarismCheck');
const vietnameseStopwordService = require('./VietnameseStopwordService');

class PlagiarismDetectionService {
  constructor() {
    this.documentTree = new TreeAVL();
    this.wordTree = new TreeAVL();
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
      console.log(`Plagiarism detection service initialized with ${this.documentTree.getSize()} documents and ${this.wordTree.getSize()} words`);
      console.log(`Vietnamese stopwords: ${vietnameseStopwordService.getStats().totalStopwords} words loaded`);
      
    } catch (error) {
      console.error('Error initializing plagiarism detection service:', error);
      throw error;
    }
  }

  // Thêm document mới vào cây AVL (chỉ sử dụng word-based hashing)
  addDocumentToTree(text, metadata = {}) {
    try {
      // Tạo unique document ID thay vì hash toàn bộ text
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Thêm document vào cây chính với document ID
      this.documentTree.insert(documentId, {
        text: text,
        metadata: metadata,
        timestamp: Date.now(),
        wordCount: text.trim().split(/\s+/).length
      });

      // Tách thành từng từ có nghĩa và thêm vào cây words (sử dụng stopwords)
      const words = TextHasher.createWordHashes(text, true);
      
      words.forEach(wordData => {
        this.wordTree.insert(wordData.hash, {
          word: wordData.word,
          parentDocumentId: documentId,
          index: wordData.index,
          method: wordData.method,
          metadata: metadata
        });
      });

      return documentId;
    } catch (error) {
      console.error('Error adding document to tree:', error);
      return null;
    }
  }

  // Kiểm tra plagiarism chỉ dựa trên word-based matching
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
        totalWordsChecked: this.wordTree.getSize(),
        // Thêm các thông số mới
        dtotal: 0, // Tổng số câu trùng không lặp lại với tất cả câu/csdl mẫu
        dab: 0, // Tổng câu trùng không lặp lại so với Document B nào đó
        mostSimilarDocument: null // Thông tin document giống nhất
      };

      // Chỉ kiểm tra word-based matches (bỏ exact match toàn bộ văn bản)
      const wordMatches = this.findWordMatches(inputText, options.sensitivity || 'medium');
      
      if (wordMatches.length > 0) {
        // Tính toán duplicate percentage dựa trên matches
        const inputWordCount = inputText.trim().split(/\s+/).length;
        let totalMatchedWords = 0;
        const uniqueSources = new Set();
        
        // Tính toán Dtotal và DA/B
        const uniqueMatchedSentences = new Set(); // Để tránh đếm trùng câu
        let mostSimilarMatch = null;
        let highestSimilarity = 0;

        wordMatches.forEach(match => {
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
        if (result.duplicatePercentage >= 50) {
          result.confidence = 'high';
        } else if (result.duplicatePercentage >= 25) {
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



  // Tìm word matches thông qua từng từ (sử dụng stopwords)
  findWordMatches(text, sensitivity = 'medium') {
    const words = TextHasher.createWordHashes(text, true); // Sử dụng stopwords
    const matches = [];
    const foundSources = new Map(); // Để tránh duplicate từ cùng một source
    const wordMatchCounts = new Map(); // Đếm số từ trùng cho mỗi document

    // Thiết lập threshold dựa trên sensitivity
    const thresholds = {
      'low': 0.3,   // 30% từ trùng
      'medium': 0.5, // 50% từ trùng
      'high': 0.7   // 70% từ trùng
    };
    const threshold = thresholds[sensitivity] || 0.5;

    words.forEach((wordData, index) => {
      // Tìm exact word match
      const exactWordMatch = this.wordTree.search(wordData.hash);
      
      if (exactWordMatch) {
        const sourceKey = exactWordMatch.data.parentDocumentId;
        
        // Đếm số từ trùng cho mỗi document
        if (!wordMatchCounts.has(sourceKey)) {
          wordMatchCounts.set(sourceKey, {
            count: 0,
            matchedWords: [],
            metadata: exactWordMatch.data.metadata,
            parentDocument: null
          });
        }
        
        const matchInfo = wordMatchCounts.get(sourceKey);
        matchInfo.count++;
        matchInfo.matchedWords.push(wordData.word);
      }
    });

    // Tính toán similarity cho mỗi document và tạo matches
    wordMatchCounts.forEach((matchInfo, sourceKey) => {
      const similarity = (matchInfo.count / words.length) * 100;
      
      if (similarity >= threshold * 100) {
        // Lấy thông tin document gốc
        const parentDoc = this.documentTree.search(sourceKey);
        
        if (parentDoc) {
          matches.push({
            text: parentDoc.data.text.substring(0, 200) + '...',
            source: 'internal-database',
            similarity: Math.round(similarity),
            matchedWords: matchInfo.count,
            totalWords: words.length,
            metadata: matchInfo.metadata,
            wordMatches: matchInfo.matchedWords.slice(0, 10), // Giới hạn 10 từ đầu tiên
            method: 'word-based'
          });
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
      const documentId = this.addDocumentToTree(text, {
        duplicatePercentage: checkResult.duplicatePercentage,
        matches: checkResult.matches,
        sources: checkResult.sources,
        addedAt: Date.now()
      });
      
      console.log(`Added new document to plagiarism detection tree. Total documents: ${this.documentTree.getSize()}`);
      return documentId;
    } catch (error) {
      console.error('Error adding new document:', error);
      return null;
    }
  }

  // Lấy thống kê
  getStats() {
    return {
      totalDocuments: this.documentTree.getSize(),
      totalWords: this.wordTree.getSize(),
      initialized: this.initialized,
      stopwordService: vietnameseStopwordService.getStats(),
      memoryUsage: process.memoryUsage()
    };
  }

  // Reset service
  async reset() {
    this.documentTree.clear();
    this.wordTree.clear();
    this.initialized = false;
    console.log('Plagiarism detection service reset');
  }
}

// Tạo singleton instance
const plagiarismDetectionService = new PlagiarismDetectionService();

module.exports = plagiarismDetectionService;