const { TreeAVL, TextHasher } = require('../utils/TreeAVL');
const PlagiarismCheck = require('../models/PlagiarismCheck');
const vietnameseStopwordService = require('./VietnameseStopwordService');

class PlagiarismDetectionService {
  constructor() {
    this.documentTree = new TreeAVL();
    this.wordTree = new TreeAVL();
    this.sentenceTree = new TreeAVL(); // Thêm cây AVL cho câu
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
      console.log(`Plagiarism detection service initialized with ${this.documentTree.getSize()} documents, ${this.wordTree.getSize()} words, and ${this.sentenceTree.getSize()} sentences`);
      console.log(`Vietnamese stopwords: ${vietnameseStopwordService.getStats().totalStopwords} words loaded`);
      
    } catch (error) {
      console.error('Error initializing plagiarism detection service:', error);
      throw error;
    }
  }

  // Thêm document mới vào cây AVL (chỉ sử dụng word-based hashing)
  addDocumentToTree(text, metadata = {}) {
    try {
      // Normalize text để đảm bảo consistency
      const normalizedText = text.trim();
      
      // Tạo unique document ID thay vì hash toàn bộ text
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Thêm document vào cây chính với document ID
      this.documentTree.insert(documentId, {
        text: normalizedText,
        metadata: metadata,
        timestamp: Date.now(),
        wordCount: normalizedText.split(/\s+/).length
      });

      // Tách thành từng từ có nghĩa và thêm vào cây words (sử dụng stopwords)
      const words = TextHasher.createWordHashes(normalizedText, true);
      
      words.forEach(wordData => {
        this.wordTree.insert(wordData.hash, {
          word: wordData.word,
          parentDocumentId: documentId,
          index: wordData.index,
          method: wordData.method,
          metadata: metadata
        });
      });

      // Tách thành từng câu và thêm vào cây sentences
      const sentences = TextHasher.createSentenceHashes(normalizedText, true);
      
      sentences.forEach(sentenceData => {
        this.sentenceTree.insert(sentenceData.hash, {
          sentence: sentenceData.sentence,
          originalHash: sentenceData.originalHash,
          parentDocumentId: documentId,
          index: sentenceData.index,
          wordCount: sentenceData.wordCount,
          method: sentenceData.method,
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
      // Normalize input text để đảm bảo consistency
      const normalizedInputText = inputText.trim();
      
      // Đảm bảo service đã được khởi tạo
      if (!this.initialized) {
        await this.initialize();
      }

      // Debug: Kiểm tra số lượng documents trong cây
      console.log(`🔍 DEBUG - Tree stats before check:`);
      console.log(`- Documents: ${this.documentTree.getSize()}`);
      console.log(`- Words: ${this.wordTree.getSize()}`);
      console.log(`- Sentences: ${this.sentenceTree.getSize()}`);

      const result = {
        duplicatePercentage: 0,
        matches: [],
        sources: [],
        confidence: 'low',
        processingTime: 0,
        fromCache: false,
        totalDocumentsChecked: this.documentTree.getSize(),
        totalWordsChecked: this.wordTree.getSize(),
        totalSentencesChecked: this.sentenceTree.getSize(),
        // Thêm các thông số mới
        dtotal: 0, // Tổng số câu trùng không lặp lại với tất cả câu/csdl mẫu
        dab: 0, // Tổng câu trùng không lặp lại so với Document B nào đó
        mostSimilarDocument: null, // Thông tin document giống nhất
        // Thêm thông số cho sentence-based detection
        sentenceDuplicatePercentage: 0, // Tỷ lệ trùng lặp dựa trên câu
        sentenceMatches: [], // Danh sách câu trùng lặp
        totalInputSentences: 0 // Tổng số câu trong văn bản đầu vào
      };

      // Kiểm tra phrase-based matches (sử dụng thuật toán mới)
      const phraseMatches = this.findPhraseMatches(normalizedInputText, options.sensitivity || 'medium');
      console.log(`🔍 DEBUG - Phrase matches found: ${phraseMatches.length}`);
      
      // Kiểm tra sentence-based matches
      const sentenceMatches = this.findSentenceMatches(normalizedInputText, options.sensitivity || 'medium');
      console.log(`🔍 DEBUG - Sentence matches found: ${sentenceMatches.length}`);
      
      // Kiểm tra word-based matches (fallback)
      const wordMatches = this.findWordMatches(normalizedInputText, options.sensitivity || 'medium');
      console.log(`🔍 DEBUG - Word matches found: ${wordMatches.length}`);
      
      // Xử lý sentence matches
      const inputSentences = TextHasher.extractSentences(normalizedInputText);
      result.totalInputSentences = inputSentences.length;
      
      if (sentenceMatches.length > 0) {
        result.sentenceMatches = sentenceMatches.map(match => ({
          sentence: match.sentence,
          source: match.source || 'internal-database',
          similarity: match.similarity,
          url: match.url || `internal://document/${match.metadata?.id}`,
          method: 'sentence-based'
        }));
        
        // Tính tỷ lệ trùng lặp dựa trên câu: số câu trùng / tổng số câu trong văn bản gốc
        result.sentenceDuplicatePercentage = Math.round((sentenceMatches.length / inputSentences.length) * 100);
      }

      // Xử lý phrase matches trước (ưu tiên cao nhất)
      if (phraseMatches.length > 0) {
        phraseMatches.forEach(match => {
          result.matches.push({
            text: match.text,
            source: match.source,
            similarity: match.similarity,
            url: match.url || `internal://document/${match.metadata?.id}`,
            matchedPhrases: match.matchedPhrases,
            totalPhrases: match.totalPhrases,
            details: match.details,
            method: 'phrase-based',
            fromCache: false
          });
        });

        // Tính duplicate percentage dựa trên phrase matches
        // Tìm match có similarity cao nhất
        const bestMatch = phraseMatches.reduce((best, current) => 
          current.similarity > best.similarity ? current : best
        );
        result.duplicatePercentage = Math.round(bestMatch.similarity);
        
        // Cập nhật sources
        phraseMatches.forEach(match => {
          if (!result.sources.includes(match.source)) {
            result.sources.push(match.source);
          }
        });
        
        // Xác định confidence level dựa trên duplicatePercentage
        if (result.duplicatePercentage > 70) {
          result.confidence = 'high';
        } else if (result.duplicatePercentage > 30) {
          result.confidence = 'medium';
        } else {
          result.confidence = 'low';
        }
      }

      // Chỉ tính word-based percentage nếu KHÔNG có phrase matches
      if ((wordMatches.length > 0 || sentenceMatches.length > 0) && phraseMatches.length === 0) {
        // Tính toán duplicate percentage dựa trên matches
        const inputWordCount = normalizedInputText.split(/\s+/).length;
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

        result.duplicatePercentage = Math.round((totalMatchedWords / inputWordCount) * 100);
        result.sources = Array.from(uniqueSources);
        
        // Xác định confidence level dựa trên duplicatePercentage
        if (result.duplicatePercentage > 70) {
          result.confidence = 'high';
        } else if (result.duplicatePercentage > 30) {
          result.confidence = 'medium';
        } else {
          result.confidence = 'low';
        }
      }

      // THÊM DOCUMENT VÀO CÂY SAU KHI KIỂM TRA (để lần sau có thể tìm thấy)
      // Chỉ thêm nếu văn bản đủ dài và có ý nghĩa
      if (normalizedInputText.length > 20) {
        const newDocId = this.addDocumentToTree(normalizedInputText, {
          id: `check_${Date.now()}`,
          duplicatePercentage: result.duplicatePercentage,
          addedAt: Date.now(),
          source: 'user-check'
        });
        console.log(`🔍 DEBUG - Added document to tree: ${newDocId}`);
        console.log(`🔍 DEBUG - Tree size after adding: ${this.documentTree.getSize()} documents`);
      }

      result.processingTime = Date.now() - startTime;
      
      // Debug logging cho kết quả cuối cùng
      console.log(`🔍 DEBUG - Final result:`);
      console.log(`- duplicatePercentage: ${result.duplicatePercentage}%`);
      console.log(`- confidence: ${result.confidence}`);
      console.log(`- total matches: ${result.matches.length}`);
      console.log(`- processing time: ${result.processingTime}ms`);
      
      return result;

    } catch (error) {
      console.error('Error in plagiarism check:', error);
      throw error;
    }
  }



  // Tìm sentence matches thông qua từng câu (sử dụng stopwords)
  findSentenceMatches(text, sensitivity = 'medium') {
    const sentences = TextHasher.createSentenceHashes(text, true);
    const matches = [];
    const foundSources = new Map();

    // Điều chỉnh threshold dựa trên sensitivity
    let threshold;
    switch (sensitivity) {
      case 'high':
        threshold = 0.3; // Nhạy cảm cao - phát hiện nhiều hơn
        break;
      case 'low':
        threshold = 0.7; // Nhạy cảm thấp - chỉ phát hiện trùng lặp rõ ràng
        break;
      default: // medium
        threshold = 0.5;
        break;
    }

    sentences.forEach((sentenceData, index) => {
      // Tìm exact sentence match trước
      const exactSentenceMatch = this.sentenceTree.search(sentenceData.hash);
      
      if (exactSentenceMatch) {
        const sourceKey = exactSentenceMatch.data.parentDocumentId;
        
        if (!foundSources.has(sourceKey)) {
          matches.push({
            sentence: sentenceData.sentence,
            source: 'internal-database',
            similarity: 100, // Exact match
            metadata: exactSentenceMatch.data.metadata,
            method: 'exact-sentence-match'
          });
          foundSources.set(sourceKey, true);
        }
      } else {
        // Tìm similar sentences bằng cách so sánh với tất cả sentences trong cây
        const allSentences = this.sentenceTree.getAllNodes();
        
        for (const node of allSentences) {
          const storedSentenceData = node.data;
          const similarity = TextHasher.calculateSentenceSimilarity(
            sentenceData.sentence, 
            storedSentenceData.sentence, 
            true
          );
          
          if (similarity > threshold * 100) {
            const sourceKey = storedSentenceData.parentDocumentId;
            
            if (!foundSources.has(sourceKey)) {
              matches.push({
                sentence: sentenceData.sentence,
                matchedSentence: storedSentenceData.sentence,
                source: 'internal-database',
                similarity: Math.round(similarity),
                metadata: storedSentenceData.metadata,
                method: 'similarity-sentence-match'
              });
              foundSources.set(sourceKey, true);
            }
          }
        }
      }
    });

    // Sắp xếp matches theo similarity giảm dần và giới hạn
    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
  }

  // Tìm word matches thông qua từng từ (sử dụng stopwords)
  findWordMatches(text, sensitivity = 'medium') {
    const words = TextHasher.createWordHashes(text, true); // Sử dụng stopwords
    const matches = [];
    const foundSources = new Map(); // Để tránh duplicate từ cùng một source
    const wordMatchCounts = new Map(); // Đếm số từ trùng cho mỗi document

    // Điều chỉnh threshold dựa trên sensitivity
    let threshold;
    switch (sensitivity) {
      case 'high':
        threshold = 0.3; // Nhạy cảm cao - phát hiện nhiều hơn
        break;
      case 'low':
        threshold = 0.7; // Nhạy cảm thấp - chỉ phát hiện trùng lặp rõ ràng
        break;
      default: // medium
        threshold = 0.5;
        break;
    }

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
      
      if (similarity > threshold * 100) {
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

  // Tìm phrase matches sử dụng thuật toán mới (non-overlapping phrases)
  findPhraseMatches(text, sensitivity = 'medium') {
    const matches = [];
    const foundSources = new Map();
    
    // Điều chỉnh threshold dựa trên sensitivity
    let threshold;
    switch (sensitivity) {
      case 'high':
        threshold = 30; // Nhạy cảm cao - phát hiện nhiều hơn
        break;
      case 'low':
        threshold = 70; // Nhạy cảm thấp - chỉ phát hiện trùng lặp rõ ràng
        break;
      default: // medium
        threshold = 50;
        break;
    }

    // Lấy tất cả documents từ tree để so sánh
    const allDocuments = this.documentTree.getAllNodes();
    
    allDocuments.forEach(docNode => {
      try {
        // Tính plagiarism ratio sử dụng thuật toán mới
        const plagiarismResult = TextHasher.calculatePlagiarismRatio(text, docNode.data.text, true);
        
        if (plagiarismResult.ratio > threshold) {
          const sourceKey = docNode.hash;
          
          if (!foundSources.has(sourceKey)) {
            matches.push({
              text: docNode.data.text.substring(0, 200) + '...',
              source: 'internal-database',
              similarity: Math.round(plagiarismResult.ratio),
              matchedPhrases: plagiarismResult.matchedPhrasesList,
              totalPhrases: plagiarismResult.totalPhrases,
              sourcePhrases: plagiarismResult.sourcePhrases,
              details: plagiarismResult.details,
              metadata: docNode.data.metadata,
              method: 'phrase-based',
              meaningfulWords1: plagiarismResult.meaningfulWords1,
              meaningfulWords2: plagiarismResult.meaningfulWords2
            });
            
            foundSources.set(sourceKey, true);
          }
        }
      } catch (error) {
        console.error('Error calculating phrase similarity:', error);
      }
    });

    // Sắp xếp matches theo similarity giảm dần
    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
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
      totalSentences: this.sentenceTree.getSize(),
      initialized: this.initialized,
      stopwordService: vietnameseStopwordService.getStats(),
      memoryUsage: process.memoryUsage()
    };
  }

  // Xóa document khỏi cây (nếu cần)
  removeDocumentFromTree(documentId) {
    try {
      // Tìm và xóa document từ documentTree
      // Note: AVL tree hiện tại không có delete method, nên chỉ log
      console.log(`Attempting to remove document: ${documentId}`);
      // TODO: Implement delete method in TreeAVL if needed
      return true;
    } catch (error) {
      console.error('Error removing document from tree:', error);
      return false;
    }
  }

  // Reset service
  async reset() {
    this.documentTree.clear();
    this.wordTree.clear();
    this.sentenceTree.clear();
    this.initialized = false;
    console.log('Plagiarism detection service reset');
  }
}

// Tạo singleton instance
const plagiarismDetectionService = new PlagiarismDetectionService();

module.exports = plagiarismDetectionService;