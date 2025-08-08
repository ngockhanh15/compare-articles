const { TreeAVL, TextHasher } = require("../utils/TreeAVL");
const Document = require("../models/Document");
const vietnameseStopwordService = require("./VietnameseStopwordService");

class DocumentAVLService {
  constructor() {
    this.documentTree = new TreeAVL();
    this.initialized = false;
  this.docInfo = new Map(); // docId -> metadata incl. sentenceCount
  }

  // Initialize tree with existing documents
  async initialize() {
    if (this.initialized) return;

    try {
      console.log("Initializing Document AVL Tree...");

      // Initialize Vietnamese stopword service first
      if (!vietnameseStopwordService.initialized) {
        console.log("Initializing Vietnamese Stopword Service...");
        await vietnameseStopwordService.initialize();
      }

      // Load all processed documents from database
      const documents = await Document.find({
        status: "processed",
        extractedText: { $exists: true, $ne: "" },
      }).select("_id title fileType extractedText createdAt uploadedBy");

      console.log(`Loading ${documents.length} documents into AVL tree...`);

      if (documents.length === 0) {
        console.log("⚠️  No processed documents found in database!");
        this.initialized = true;
        return;
      }

      for (const doc of documents) {
        await this.addDocumentToTreeOnly(doc);
      }

      this.initialized = true;
      console.log(
        `Document AVL Tree initialized with ${this.documentTree.getSize()} entries`
      );
    } catch (error) {
      console.error("Error initializing Document AVL Tree:", error);
      throw error;
    }
  }

  // Add document to AVL tree
  async addDocumentToTree(document) {
    try {
      if (
        !document.extractedText ||
        document.extractedText.trim().length === 0
      ) {
        return;
      }

      // Create composite key for sorting: fileType + createdAt + _id
      const sortKey = this.createSortKey(document);

      // Index document into global AVL (word -> docs/sentences)
      const { sentenceCount, uniqueTokenCount } = this.indexDocument(document);

      console.log(
        `Added document "${document.title}" to AVL index: ${sentenceCount} sentences, ${uniqueTokenCount} unique tokens`
      );

      // Also generate per-doc hash vector data for DB if needed
      const wordHashes = TextHasher.createWordHashes(document.extractedText);
      return this.generateAVLTreeData(document, sortKey, wordHashes);
    } catch (error) {
      console.error(`Error adding document ${document._id} to tree:`, error);
      return null;
    }
  }

  // Add document to AVL tree only (for initialization)
  async addDocumentToTreeOnly(document) {
    try {
      if (
        !document.extractedText ||
        document.extractedText.trim().length === 0
      ) {
        return;
      }

      // Create composite key for sorting: fileType + createdAt + _id
      const sortKey = this.createSortKey(document);

      // Index document into global AVL
      const { sentenceCount, uniqueTokenCount } = this.indexDocument(document);
      console.log(
        `Added document "${document.title}" to AVL index: ${sentenceCount} sentences, ${uniqueTokenCount} unique tokens`
      );
    } catch (error) {
      console.error(`Error adding document ${document._id} to tree:`, error);
    }
  }

  // Index a single document into the global AVL: tokens -> documents/sentences
  indexDocument(document) {
    const sentences = TextHasher.extractSentences(document.extractedText);
    let uniqueTokenCount = 0;
    for (let i = 0; i < sentences.length; i++) {
      const tokens = vietnameseStopwordService.tokenizeAndFilterUnique(sentences[i]);
      uniqueTokenCount += tokens.length;
      for (const token of tokens) {
        const hash = TextHasher.createMurmurHash(token);
        this.documentTree.insertOccurrence(hash, document._id, `${document._id}:${i}`);
      }
    }

    // Save doc metadata
    this.docInfo.set(String(document._id), {
      documentId: document._id,
      title: document.title,
      fileType: document.fileType,
      createdAt: document.createdAt,
      uploadedBy: document.uploadedBy,
      sentenceCount: sentences.length,
      wordCount: document.extractedText.split(/\s+/).filter(Boolean).length,
    });

    return { sentenceCount: sentences.length, uniqueTokenCount };
  }

  // Generate AVL tree data as hash vector for database storage
  generateAVLTreeData(document, sortKey, wordHashes) {
    try {
      // Create hash vector representation of the document's position in AVL tree
      const avlTreeData = {
        sortKey: sortKey,
        hashVector: wordHashes.map((wordHash) => ({
          hash: wordHash.hash,
          word: wordHash.word,
          index: wordHash.index,
          method: wordHash.method,
        })),
        treeMetadata: {
          documentId: document._id,
          insertedAt: new Date(),
          textLength: document.extractedText.length,
          wordCount: wordHashes.length,
          fileTypeWeight: this.getFileTypeWeight(document.fileType),
        },
      };

      return avlTreeData;
    } catch (error) {
      console.error("Error generating AVL tree data:", error);
      return null;
    }
  }

  // Create composite sort key: fileType + timestamp + id
  createSortKey(document) {
    const fileTypeWeight = this.getFileTypeWeight(document.fileType);
    const timestamp = new Date(document.createdAt).getTime();
    const idHash = document._id.toString().slice(-8); // Last 8 chars of ID

    // Format: fileTypeWeight-timestamp-idHash
    return `${fileTypeWeight
      .toString()
      .padStart(2, "0")}-${timestamp}-${idHash}`;
  }

  // Assign weights to file types for sorting
  getFileTypeWeight(fileType) {
    const weights = {
      pdf: 1,
      docx: 2,
      doc: 3,
      txt: 4,
      xlsx: 5,
      xls: 6,
      pptx: 7,
      ppt: 8,
    };
    return weights[fileType] || 9;
  }

  // Kiểm tra nội dung trùng lặp sử dụng cây AVL - phiên bản đơn giản
  async checkDuplicateContent(text, options = {}) {
    // Khởi tạo các service cần thiết
    if (!this.initialized) await this.initialize();
    if (!vietnameseStopwordService.initialized) {
      await vietnameseStopwordService.initialize();
    }

  const { minSimilarity = 50, maxResults = null } = options;

    try {
      console.log(`🔍 Bắt đầu kiểm tra trùng lặp...`);
      
      // Bước 1: Tách câu từ văn bản đầu vào
      const inputSentences = TextHasher.extractSentences(text);
      const totalInputSentences = inputSentences.length;

      // Bước 2: Với mỗi câu, tokenize + lọc + dedupe, sau đó tìm matches trong AVL
      const docMatches = new Map(); // docId -> { matchedSentenceCount, details: [] }
      let totalDuplicatedSentences = 0; // sentences in A that are duplicate with any doc

      for (let i = 0; i < inputSentences.length; i++) {
        const sentence = inputSentences[i];
        const tokens = vietnameseStopwordService.tokenizeAndFilterUnique(sentence);
        const tokenCount = tokens.length;
        if (tokenCount === 0) continue;

        // Đếm số token trùng theo từng tài liệu
        const perDocTokenMatches = new Map(); // docId -> count

        for (const token of tokens) {
          const hash = TextHasher.createMurmurHash(token);
          const node = this.documentTree.search(hash);
          if (!node) continue;
          for (const docId of node.documents) {
            perDocTokenMatches.set(docId, (perDocTokenMatches.get(docId) || 0) + 1);
          }
        }

        // Xét ngưỡng cho từng doc
        let sentenceMarkedDuplicate = false;
        for (const [docId, matchedCount] of perDocTokenMatches) {
          const percent = (matchedCount / tokenCount) * 100;
          if (percent >= 50) {
            sentenceMarkedDuplicate = true;
            if (!docMatches.has(docId)) {
              docMatches.set(docId, { matchedSentenceCount: 0, details: [] });
            }
            const entry = docMatches.get(docId);
            entry.matchedSentenceCount += 1;
            entry.details.push({
              inputSentenceIndex: i,
              inputSentence: sentence,
              matchedTokens: matchedCount,
              totalTokens: tokenCount,
              similarity: Math.round(percent),
            });
          }
        }

        if (sentenceMarkedDuplicate) totalDuplicatedSentences += 1;
      }

      // Bước 3: Tính toán kết quả cho từng tài liệu
      const matches = [];
      for (const [docId, data] of docMatches) {
        const meta = this.docInfo.get(String(docId)) || {};
        const totalSentencesInB = meta.sentenceCount || 1;
        const dabPercent = Math.round((data.matchedSentenceCount / totalSentencesInB) * 100);
        const similarityForSorting = dabPercent; // dùng Da/b làm similarity
        if (similarityForSorting >= minSimilarity) {
          matches.push({
            documentId: meta.documentId || docId,
            title: meta.title || "Document",
            fileType: meta.fileType,
            createdAt: meta.createdAt,
            similarity: similarityForSorting,
            matchedHashes: undefined,
            matchedWords: undefined,
            duplicateSentences: data.matchedSentenceCount,
            duplicateSentencesDetails: data.details,
            method: "global-avl-word-index",
            dabPercent,
            totalSentencesInSource: totalSentencesInB,
          });
        }
      }

      // Bước 4: Sắp xếp và giới hạn kết quả
      matches.sort((a, b) => b.similarity - a.similarity);
      const limitedMatches = maxResults ? matches.slice(0, maxResults) : matches;

      // Bước 5: Dtotal (phần trăm câu trùng trong A)
      const dtotalPercent = totalInputSentences > 0 ? Math.round((totalDuplicatedSentences / totalInputSentences) * 100) : 0;

      // Xây dựng kết quả cuối
      const result = this.buildFinalResult(limitedMatches, dtotalPercent, totalInputSentences);
      console.log(`📊 Kết quả: Dtotal=${result.dtotal}% với ${result.totalMatches} tài liệu phù hợp`);
      return result;

    } catch (error) {
      console.error("Lỗi khi kiểm tra trùng lặp:", error);
      throw error;
    }
  }

  // Tạo kết quả cuối cùng
  buildFinalResult(matches, dtotalPercent, totalInputSentences) {
    const duplicatePercentage = dtotalPercent;
    const { dab, mostSimilarDocument } = this.calculateDtotalAndDAB(matches);

    return {
      duplicatePercentage,
      matches,
      totalMatches: matches.length,
      checkedDocuments: this.docInfo.size,
      totalDocumentsInSystem: this.docInfo.size,
      sources: matches.map((m) => m.title),
      confidence: duplicatePercentage >= 70 ? "high" : duplicatePercentage >= 30 ? "medium" : "low",
      mostSimilarDocument,
      dtotal: duplicatePercentage,
      dab,
      totalInputHashes: totalInputSentences,
      searchMethod: "global-avl-tree",
      totalDuplicateSentences: duplicatePercentage,
    };
  }

  // Tính tỷ lệ trùng lặp tổng thể
  calculatePlagiarismRatio(totalInputHashes, matches) {
    if (matches.length === 0 || totalInputHashes === 0) return 0;
    
    // Lấy độ tương đồng cao nhất
    const highestSimilarity = matches[0]?.similarity || 0;
    console.log(`🎯 Tỷ lệ trùng lặp tổng thể: ${highestSimilarity}%`);
    return highestSimilarity;
  }

  // Tính toán Dtotal và DA/B đơn giản
  calculateDtotalAndDAB(matches) {
    if (matches.length === 0) {
      return { dab: 0, mostSimilarDocument: null };
    }
    const mostSimilarMatch = matches[0];
    const dab = mostSimilarMatch.dabPercent || mostSimilarMatch.similarity || 0;
    const mostSimilarDocument = {
      id: mostSimilarMatch.documentId,
      name: mostSimilarMatch.title,
      similarity: mostSimilarMatch.similarity,
    };
    return { dab, mostSimilarDocument };
  }

  // Tính độ tương đồng giữa hai văn bản
  calculateTextSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const words2 = text2.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

    if (words1.length === 0 || words2.length === 0) return 0;

    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter((x) => set2.has(x)));

    // Công thức: (số từ chung / tổng số từ của văn bản ngắn hơn) * 100%
    const minSize = Math.min(set1.size, set2.size);
    return Math.round((intersection.size / minSize) * 100);
  }



  // Get tree statistics
  getTreeStats() {
    if (!this.initialized) {
      return {
        totalDocuments: 0,
        totalSentences: 0,
        totalNodes: 0,
        treeSize: 0,
        initialized: false,
      };
    }

    // Aggregate from docInfo
    let totalSentences = 0;
    const fileTypeStats = {};
    for (const meta of this.docInfo.values()) {
      totalSentences += meta.sentenceCount || 0;
      if (meta.fileType) fileTypeStats[meta.fileType] = (fileTypeStats[meta.fileType] || 0) + 1;
    }

    return {
      totalDocuments: this.docInfo.size,
      totalSentences,
      totalNodes: this.documentTree.getSize(),
      treeSize: this.documentTree.getSize(),
      initialized: this.initialized,
      fileTypeDistribution: fileTypeStats,
      treeHeight: this.getTreeHeight(),
    };
  }

  // Get tree height
  getTreeHeight() {
    if (!this.documentTree.root) return 0;
    return this.documentTree.getHeight(this.documentTree.root);
  }

  // Remove document from tree (when document is deleted)
  async removeDocumentFromTree(documentId) {
    try {
  // Theo yêu cầu: có thể rebuild lại từ database để loại bỏ dữ liệu đã xóa
  console.log(`Rebuilding AVL index to remove document ${documentId}...`);
  await this.refreshTree();
    } catch (error) {
      console.error(`Error removing document ${documentId} from tree:`, error);
    }
  }

  // Refresh tree (reload from database)
  async refreshTree() {
  this.documentTree.clear();
  this.docInfo.clear();
  this.initialized = false;
  await this.initialize();
  }
}

// Create singleton instance
const documentAVLService = new DocumentAVLService();

module.exports = documentAVLService;
