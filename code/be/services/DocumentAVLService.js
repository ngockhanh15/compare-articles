const { TreeAVL, TextHasher } = require("../utils/TreeAVL");
const Document = require("../models/Document");
const vietnameseStopwordService = require("./VietnameseStopwordService");

class DocumentAVLService {
  constructor() {
    this.documentTree = new TreeAVL();
    this.initialized = false;
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
        // Only add to tree, don't regenerate AVL tree data if it already exists
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

      // Create word hashes from document text (using new method)
      const wordHashes = TextHasher.createWordHashes(
        document.extractedText,
        true
      );

      // Store document metadata with word hashes
      const documentData = {
        documentId: document._id,
        title: document.title,
        fileType: document.fileType,
        createdAt: document.createdAt,
        uploadedBy: document.uploadedBy,
        textLength: document.extractedText.length,
        wordCount: document.extractedText.split(/\s+/).length,
        wordHashes: wordHashes,
        fullText: document.extractedText,
        sortKey: sortKey,
      };

      // Insert each word hash into tree (not the sortKey!)
      for (const wordHash of wordHashes) {
        this.documentTree.insert(wordHash.hash, documentData);
      }

      console.log(
        `Added document "${document.title}" to AVL tree with ${wordHashes.length} word hashes`
      );

      // Return AVL tree data for saving to database
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

      // Create word hashes from document text (using new method)
      const wordHashes = TextHasher.createWordHashes(
        document.extractedText,
        true
      );

      // Store document metadata with word hashes
      const documentData = {
        documentId: document._id,
        title: document.title,
        fileType: document.fileType,
        createdAt: document.createdAt,
        uploadedBy: document.uploadedBy,
        textLength: document.extractedText.length,
        wordCount: document.extractedText.split(/\s+/).length,
        wordHashes: wordHashes,
        fullText: document.extractedText,
        sortKey: sortKey,
      };

      // Insert each word hash into tree (not the sortKey!)
      for (const wordHash of wordHashes) {
        this.documentTree.insert(wordHash.hash, documentData);
      }

      console.log(
        `Added document "${document.title}" to AVL tree with ${wordHashes.length} word hashes`
      );
    } catch (error) {
      console.error(`Error adding document ${document._id} to tree:`, error);
    }
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

    const { minSimilarity = 50, maxResults = 10 } = options;

    try {
      console.log(`🔍 Bắt đầu kiểm tra trùng lặp...`);
      
      // Bước 1: Tạo hash từ văn bản đầu vào
      const inputHashes = TextHasher.createWordHashes(text, true);
      const meaningfulWords = vietnameseStopwordService.extractMeaningfulWords(text);
      const uniqueInputWords = new Set(meaningfulWords);

      console.log(`📊 Văn bản có ${uniqueInputWords.size} từ có nghĩa và ${inputHashes.length} hash`);

      // Bước 2: Tìm kiếm trong cây AVL
      const documentMatches = this.searchInAVLTree(inputHashes, uniqueInputWords);

      console.log(`🔍 Tìm thấy ${documentMatches.size} tài liệu có từ trùng lặp`);

      // Bước 3: Tính toán độ tương đồng cho từng tài liệu
      const matches = this.calculateSimilarityScores(documentMatches, text, minSimilarity);

      // Bước 4: Sắp xếp và giới hạn kết quả
      matches.sort((a, b) => b.similarity - a.similarity);
      const limitedMatches = matches.slice(0, maxResults);

      // Bước 5: Tạo kết quả cuối cùng
      const result = this.buildFinalResult(limitedMatches, inputHashes, text);

      console.log(`📊 Kết quả: ${result.duplicatePercentage}% trùng lặp với ${result.totalMatches} tài liệu`);
      return result;

    } catch (error) {
      console.error("Lỗi khi kiểm tra trùng lặp:", error);
      throw error;
    }
  }

  // Tìm kiếm các từ trong cây AVL
  searchInAVLTree(inputHashes, uniqueInputWords) {
    const documentMatches = new Map();

    for (const wordHash of inputHashes) {
      const foundNode = this.documentTree.search(wordHash.hash);
      
      if (foundNode) {
        const docData = foundNode.data;
        const documentId = docData.documentId.toString();

        if (!documentMatches.has(documentId)) {
          documentMatches.set(documentId, {
            documentData: docData,
            matchedWords: new Set(),
            matchedHashes: 0
          });
        }

        const matchData = documentMatches.get(documentId);
        if (!matchData.matchedWords.has(wordHash.word)) {
          matchData.matchedWords.add(wordHash.word);
          matchData.matchedHashes++;
        }
      }
    }

    return documentMatches;
  }

  // Tính toán điểm tương đồng cho từng tài liệu
  calculateSimilarityScores(documentMatches, inputText, minSimilarity) {
    const matches = [];
    const inputSentences = TextHasher.extractSentences(inputText);

    for (const [documentId, matchData] of documentMatches.entries()) {
      const { documentData, matchedWords, matchedHashes } = matchData;
      
      // Tính độ tương đồng dựa trên câu
      const duplicateSentences = this.findDuplicateSentences(
        inputSentences, 
        documentData.fullText, 
        matchedWords
      );

      // Tính tỷ lệ trùng lặp
      const similarity = duplicateSentences.length > 0 
        ? Math.round(duplicateSentences.reduce((sum, s) => sum + s.similarity, 0) / duplicateSentences.length)
        : 0;

      // Chỉ thêm vào kết quả nếu vượt ngưỡng
      if (similarity >= minSimilarity) {
        matches.push({
          documentId: documentData.documentId,
          title: documentData.title,
          fileType: documentData.fileType,
          createdAt: documentData.createdAt,
          similarity: similarity,
          matchedHashes: matchedHashes,
          matchedWords: Array.from(matchedWords),
          duplicateSentences: duplicateSentences.length,
          duplicateSentencesDetails: duplicateSentences.slice(0, 3),
          method: "simplified-avl-search"
        });
      }
    }

    return matches;
  }

  // Tìm các câu trùng lặp giữa hai văn bản
  findDuplicateSentences(inputSentences, documentText, matchedWords) {
    const docSentences = TextHasher.extractSentences(documentText);
    const duplicateSentences = [];

    for (const inputSentence of inputSentences) {
      const inputWords = vietnameseStopwordService.extractMeaningfulWords(inputSentence);
      
      for (const docSentence of docSentences) {
        const docWords = vietnameseStopwordService.extractMeaningfulWords(docSentence);
        
        // Tính số từ chung
        const commonWords = inputWords.filter(word => docWords.includes(word));
        const similarity = inputWords.length > 0 
          ? (commonWords.length / inputWords.length) * 100 
          : 0;

        // Nếu độ tương đồng >= 50%, coi là câu trùng lặp
        if (similarity >= 50) {
          duplicateSentences.push({
            inputSentence,
            docSentence,
            similarity: Math.round(similarity),
            commonWords: commonWords.length
          });
          break; // Chỉ lấy câu trùng lặp đầu tiên
        }
      }
    }

    return duplicateSentences;
  }

  // Tạo kết quả cuối cùng
  buildFinalResult(matches, inputHashes, inputText) {
    const duplicatePercentage = matches.length > 0 ? matches[0].similarity : 0;
    const { dtotal, dab, mostSimilarDocument } = this.calculateDtotalAndDAB(matches);

    return {
      duplicatePercentage,
      matches,
      totalMatches: matches.length,
      checkedDocuments: this.documentTree.getSize(),
      totalDocumentsInSystem: this.documentTree.getSize(),
      sources: matches.map(m => m.title),
      confidence: duplicatePercentage > 70 ? "high" : duplicatePercentage > 30 ? "medium" : "low",
      mostSimilarDocument,
      dtotal,
      dab,
      totalInputHashes: inputHashes.length,
      searchMethod: "simplified-avl-tree",
      totalDuplicateSentences: dtotal
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
      return { dtotal: 0, dab: 0, mostSimilarDocument: null };
    }

    // Tổng số câu trùng lặp từ tất cả tài liệu
    const dtotal = matches.reduce((sum, match) => sum + match.duplicateSentences, 0);
    
    // Tài liệu có độ tương đồng cao nhất
    const mostSimilarMatch = matches[0]; // matches đã được sắp xếp theo similarity
    const dab = mostSimilarMatch.matchedHashes;

    const mostSimilarDocument = {
      id: mostSimilarMatch.documentId,
      name: mostSimilarMatch.title,
      similarity: mostSimilarMatch.similarity,
    };

    console.log(`📊 Dtotal: ${dtotal}, DA/B: ${dab}`);
    return { dtotal, dab, mostSimilarDocument };
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
        uniqueSentences: 0,
        uniquePercentage: 0,
        duplicateSentences: 0,
        duplicatePercentage: 0,
      };
    }

    const allNodes = this.documentTree.getAllNodes();
    const uniqueDocuments = new Set();
    const fileTypeStats = {};
    let totalSentences = 0;

    // Đếm số câu duy nhất (không trùng lặp)
    const hashCounts = new Map();

    allNodes.forEach((node) => {
      const documentId = node.data.documentId;
      const fileType = node.data.fileType;
      const hash = node.key; // Giả sử key là hash của câu

      // Count unique documents
      uniqueDocuments.add(documentId.toString());

      // Count file types (based on nodes, not documents)
      fileTypeStats[fileType] = (fileTypeStats[fileType] || 0) + 1;

      // Count sentences/word hashes
      totalSentences++;

      // Đếm số lần xuất hiện của mỗi hash
      hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);
    });

    // Đếm số câu duy nhất (hash chỉ xuất hiện một lần)
    let uniqueSentences = 0;
    hashCounts.forEach((count) => {
      if (count === 1) {
        uniqueSentences++;
      }
    });

    // Tính phần trăm câu duy nhất
    const uniquePercentage =
      totalSentences > 0 ? (uniqueSentences / totalSentences) * 100 : 0;
    const duplicateSentences = totalSentences - uniqueSentences;
    const duplicatePercentage = 100 - uniquePercentage;

    return {
      totalDocuments: uniqueDocuments.size, // Số lượng documents duy nhất
      totalSentences: totalSentences, // Tổng số word hashes/sentences
      totalNodes: this.documentTree.getSize(), // Tổng số nodes trong tree
      treeSize: this.documentTree.getSize(),
      initialized: this.initialized,
      fileTypeDistribution: fileTypeStats,
      treeHeight: this.getTreeHeight(),
      uniqueSentences: uniqueSentences, // Số câu duy nhất (không trùng lặp)
      uniquePercentage: uniquePercentage.toFixed(2), // Phần trăm câu duy nhất
      duplicateSentences: duplicateSentences, // Số câu trùng lặp
      duplicatePercentage: duplicatePercentage.toFixed(2), // Phần trăm câu trùng lặp
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
      // Since AVL tree doesn't have direct delete by value,
      // we need to rebuild the tree without this document
      const allNodes = this.documentTree.getAllNodes();
      const filteredNodes = allNodes.filter(
        (node) => node.data.documentId.toString() !== documentId.toString()
      );

      // Clear and rebuild tree
      this.documentTree.clear();

      for (const node of filteredNodes) {
        this.documentTree.insert(node.hash, node.data);
      }

      console.log(`Removed document ${documentId} from AVL tree`);
    } catch (error) {
      console.error(`Error removing document ${documentId} from tree:`, error);
    }
  }

  // Refresh tree (reload from database)
  async refreshTree() {
    this.documentTree.clear();
    this.initialized = false;
    await this.initialize();
  }
}

// Create singleton instance
const documentAVLService = new DocumentAVLService();

module.exports = documentAVLService;
