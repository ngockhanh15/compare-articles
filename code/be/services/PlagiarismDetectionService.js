const documentAVLService = require("./DocumentAVLService");
const PlagiarismCheck = require("../models/PlagiarismCheck");

class PlagiarismDetectionService {
  constructor() {
    this.documentAVLService = documentAVLService;
    this.initialized = false;
  }

  // Khởi tạo service
  async initialize() {
    try {
      console.log("Initializing plagiarism detection service...");
      
      // Khởi tạo DocumentAVLService
      await this.documentAVLService.initialize();
      
      this.initialized = true;
      console.log("Plagiarism detection service initialized successfully");
    } catch (error) {
      console.error("Error initializing plagiarism detection service:", error);
      throw error;
    }
  }

  // Kiểm tra plagiarism sử dụng DocumentAVLService
  async checkPlagiarism(inputText, options = {}) {
    const startTime = Date.now();

    try {
      // Đảm bảo service đã được khởi tạo
      if (!this.initialized) {
        await this.initialize();
      }

      // Sử dụng hàm checkDuplicateContent từ DocumentAVLService
      const duplicateResult = await this.documentAVLService.checkDuplicateContent(inputText, {
        minSimilarity: options.minSimilarity || 50,
        maxResults: options.maxResults || null
      });

      // Chuyển đổi kết quả để phù hợp với format cũ
      const result = {
        duplicatePercentage: duplicateResult.duplicatePercentage,
        matches: duplicateResult.matches.map(match => ({
          text: match.title || "Document",
          source: "internal-database", 
          similarity: match.similarity,
          url: `internal://document/${match.documentId}`,
          matchedWords: match.matchedHashes,
          duplicateSentences: match.duplicateSentences,
          duplicateSentencesDetails: match.duplicateSentencesDetails,
          method: match.method,
          fromCache: false
        })),
        sources: duplicateResult.sources,
        confidence: duplicateResult.confidence,
        processingTime: Date.now() - startTime,
        fromCache: false,
        totalDocumentsChecked: duplicateResult.checkedDocuments,
        totalWordsChecked: duplicateResult.totalInputHashes,
        totalSentencesChecked: duplicateResult.totalDuplicateSentences,
        dtotal: duplicateResult.dtotal,
        dab: duplicateResult.dab,
        mostSimilarDocument: duplicateResult.mostSimilarDocument,
        sentenceDuplicatePercentage: duplicateResult.duplicatePercentage,
        sentenceMatches: duplicateResult.matches.map(match => ({
          sentence: match.duplicateSentencesDetails?.[0]?.inputSentence || "",
          source: "internal-database",
          similarity: match.similarity,
          url: `internal://document/${match.documentId}`,
          method: "sentence-based"
        })),
        totalInputSentences: duplicateResult.totalInputHashes,
        totalMatches: duplicateResult.totalMatches,
        searchMethod: duplicateResult.searchMethod
      };

      return result;
    } catch (error) {
      console.error("Error in plagiarism check:", error);
      throw error;
    }
  }


  // Lấy thống kê
  getStats() {
    return {
      initialized: this.initialized,
      documentAVLService: this.documentAVLService.getStats ? this.documentAVLService.getStats() : null,
      memoryUsage: process.memoryUsage(),
    };
  }

  // Reset service
  async reset() {
    this.initialized = false;
    console.log("Plagiarism detection service reset");
  }
}

// Tạo singleton instance
const plagiarismDetectionService = new PlagiarismDetectionService();

module.exports = plagiarismDetectionService;