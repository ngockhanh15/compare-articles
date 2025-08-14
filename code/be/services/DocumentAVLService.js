const { TreeAVL, TextHasher } = require("../utils/TreeAVL");
const Document = require("../models/Document");
const GlobalAVLTreeUnified = require("../models/GlobalAVLTreeUnified");
const vietnameseStopwordService = require("./VietnameseStopwordService");

class DocumentAVLService {
  constructor() {
    this.documentTree = new TreeAVL();
    this.initialized = false;
    this.docInfo = new Map(); // docId -> metadata incl. sentenceCount
    this.tokenizationSamples = []; // Lưu trữ tokenization samples
    this.autoSave = true; // Tự động save vào database
    this.saveInterval = 5 * 60 * 1000; // Save mỗi 5 phút
    this.lastSaved = null;
    
    // Inject this service into cache service để thống nhất cây AVL
    this.setupCacheService();
    
    // Auto-save timer
    this.setupAutoSave();
  }

  setupCacheService() {
    try {
      const plagiarismCacheService = require('./PlagiarismCacheService');
      plagiarismCacheService.setDocumentAVLService(this);
    } catch (error) {
      console.warn('Could not setup cache service integration:', error.message);
    }
  }

  setupAutoSave() {
    if (this.autoSave) {
      setInterval(async () => {
        if (this.initialized) {
          try {
            await this.saveToDatabase();
          } catch (error) {
            console.error('Auto-save failed:', error.message);
          }
        }
      }, this.saveInterval);
    }
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

      // Try to load from database first
      const loadedFromDB = await this.loadFromDatabase();
      
      if (loadedFromDB) {
        console.log("✅ Loaded Global AVL Tree from database");
        this.initialized = true;
        return;
      }

      // If no database backup, rebuild from documents
      console.log("No database backup found, rebuilding from documents...");
      await this.rebuildFromDocuments();

      // Save initial tree to database
      await this.saveToDatabase();
      
      this.initialized = true;
      console.log(
        `Document AVL Tree initialized with ${this.documentTree.getSize()} entries`
      );
    } catch (error) {
      console.error("Error initializing Document AVL Tree:", error);
      throw error;
    }
  }

  // Rebuild tree from documents in database
  async rebuildFromDocuments() {
    // Load all processed documents from database
    const documents = await Document.find({
      status: "processed",
      extractedText: { $exists: true, $ne: "" },
    }).select("_id title fileType extractedText createdAt uploadedBy");

    console.log(`Loading ${documents.length} documents into AVL tree...`);

    if (documents.length === 0) {
      console.log("⚠️  No processed documents found in database!");
      return;
    }

    for (const doc of documents) {
      await this.addDocumentToTreeOnly(doc);
    }
  }

  // Add document to Global AVL tree only
  async addDocumentToTree(document) {
    try {
      if (
        !document.extractedText ||
        document.extractedText.trim().length === 0
      ) {
        return { success: false, message: "No text content" };
      }

      // Index document into global AVL (word -> docs/sentences)
      const { sentenceCount, uniqueTokenCount } = await this.indexDocument(document);

      console.log(
        `Added document "${document.title}" to Global AVL Tree: ${sentenceCount} sentences, ${uniqueTokenCount} unique tokens`
      );

      return { 
        success: true, 
        sentenceCount, 
        uniqueTokenCount,
        message: "Document added to Global AVL Tree successfully"
      };
    } catch (error) {
      console.error(`Error adding document ${document._id} to tree:`, error);
      return { success: false, error: error.message };
    }
  }

  // Add document to Global AVL tree only (for initialization)
  async addDocumentToTreeOnly(document) {
    try {
      if (
        !document.extractedText ||
        document.extractedText.trim().length === 0
      ) {
        return;
      }

      // Index document into global AVL only
      const { sentenceCount, uniqueTokenCount } = await this.indexDocument(document);
      console.log(
        `Added document "${document.title}" to Global AVL Tree: ${sentenceCount} sentences, ${uniqueTokenCount} unique tokens`
      );
    } catch (error) {
      console.error(`Error adding document ${document._id} to tree:`, error);
    }
  }

  // Index a single document into the global AVL: tokens -> documents/sentences
  async indexDocument(document) {
    const sentences = TextHasher.extractSentences(document.extractedText);
    let uniqueTokenCount = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const tokens = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(sentences[i]);
      uniqueTokenCount += tokens.length;
      
      // Lưu tokenization sample vào memory để sau này save vào database
      const tokenizationSample = {
        documentId: String(document._id),
        sentenceIndex: i,
        originalText: sentences[i],
        tokenizedWords: tokens.map((token, idx) => ({
          word: token,
          hash: TextHasher.createMurmurHash(token),
          position: idx,
          method: 'wordTokenizer', // Method được sử dụng
          isPreservedPhrase: token.includes(' '), // Nếu có space thì là phrase
          frequency: 1
        })),
        createdAt: new Date()
      };
      
      // Lưu sample để sau này add vào database
      if (!this.tokenizationSamples) {
        this.tokenizationSamples = [];
      }
      this.tokenizationSamples.push(tokenizationSample);
      
      for (const token of tokens) {
        const hash = TextHasher.createMurmurHash(token);
        const tokenInfo = {
          method: 'wordTokenizer',
          isPreservedPhrase: token.includes(' '),
          totalFrequency: 1
        };
        
        this.documentTree.insertOccurrence(
          hash, 
          document._id, 
          `${document._id}:${i}`,
          token, // originalWord
          tokenInfo
        );
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

  // Lưu tokenized words vào database
  async saveTokenizedWords(document, originalSentence, tokens, sentenceIndex) {
    try {
      // Tạo detailed token info
      const tokenizedWords = [];
      let preservedPhrasesCount = 0;
      let filteredStopwordsCount = 0;
      
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const hash = TextHasher.createMurmurHash(token);
        const isPreservedPhrase = vietnameseStopwordService.preservedPhrases.has(token.toLowerCase());
        const isStopword = vietnameseStopwordService.stopwords.has(token.toLowerCase());
        
        if (isPreservedPhrase) preservedPhrasesCount++;
        if (isStopword) filteredStopwordsCount++;
        
        tokenizedWords.push({
          word: token,
          hash: hash,
          position: i,
          method: 'wordTokenizer', // Default method used
          isPreservedPhrase: isPreservedPhrase,
          isStopword: isStopword
        });
      }

      // Metadata cho sentence này
      const metadata = {
        totalWords: originalSentence.split(/\s+/).filter(Boolean).length,
        uniqueWords: tokens.length,
        preservedPhrases: preservedPhrasesCount,
        filteredStopwords: filteredStopwordsCount,
        tokenizerUsed: 'wordTokenizer'
      };

      // Tạo record trong database
      const tokenRecord = new TokenizedWord({
        originalText: originalSentence,
        tokenizedWords: tokenizedWords,
        documentId: String(document._id),
        sentenceId: `${document._id}:${sentenceIndex}`,
        sentenceIndex: sentenceIndex,
        metadata: metadata
      });

      await tokenRecord.save();
      
      console.log(`💾 Saved ${tokens.length} tokenized words for sentence ${sentenceIndex} of document "${document.title}"`);
      
    } catch (error) {
      console.error('Error saving tokenized words:', error);
    }
  }

  // DEPRECATED: generateAVLTreeData - No longer needed with Global AVL Tree approach
  // generateAVLTreeData(document, sortKey, wordHashes) {
  //   try {
  //     // Create hash vector representation of the document's position in AVL tree
  //     const avlTreeData = {
  //       sortKey: sortKey,
  //       hashVector: wordHashes.map((wordHash) => ({
  //         hash: wordHash.hash,
  //         word: wordHash.word,
  //         index: wordHash.index,
  //         method: wordHash.method,
  //       })),
  //       treeMetadata: {
  //         documentId: document._id,
  //         insertedAt: new Date(),
  //         textLength: document.extractedText.length,
  //         wordCount: wordHashes.length,
  //         fileTypeWeight: this.getFileTypeWeight(document.fileType),
  //       },
  //     };
  //
  //     return avlTreeData;
  //   } catch (error) {
  //     console.error("Error generating AVL tree data:", error);
  //     return null;
  //   }
  // }

  // DEPRECATED: createSortKey - No longer needed with Global AVL Tree approach  
  // createSortKey(document) {
  //   const fileTypeWeight = this.getFileTypeWeight(document.fileType);
  //   const timestamp = new Date(document.createdAt).getTime();
  //   const idHash = document._id.toString().slice(-8); // Last 8 chars of ID
  //
  //   // Format: fileTypeWeight-timestamp-idHash
  //   return `${fileTypeWeight
  //     .toString()
  //     .padStart(2, "0")}-${timestamp}-${idHash}`;
  // }

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
        const tokens = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(sentence);
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

      // Bước 3: Tính toán kết quả cho từng tài liệu và lấy nội dung câu trùng lặp
      const matches = [];
      for (const [docId, data] of docMatches) {
        const meta = this.docInfo.get(String(docId)) || {};
        const totalSentencesInB = meta.sentenceCount || 1;
        const dabPercent = Math.round((data.matchedSentenceCount / totalSentencesInB) * 100);
        const similarityForSorting = dabPercent; // dùng Da/b làm similarity
        
        if (similarityForSorting >= minSimilarity) {
          // Lấy nội dung document để tìm câu trùng lặp
          const sourceDocument = await Document.findById(docId).select('extractedText title');
          let sourceSentences = [];
          if (sourceDocument && sourceDocument.extractedText) {
            sourceSentences = TextHasher.extractSentences(sourceDocument.extractedText);
          }
          
          // Tìm câu trùng lặp tốt nhất cho mỗi detail
          const enrichedDetails = await Promise.all(data.details.map(async (detail) => {
            let bestMatchSentence = "";
            let bestMatchSimilarity = 0;
            
            // Tìm câu tương tự nhất trong source document
            for (let i = 0; i < sourceSentences.length; i++) {
              const sourceSentence = sourceSentences[i];
              const sourceTokens = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(sourceSentence);
              const inputTokens = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(detail.inputSentence);
              
              // Tính độ tương tự giữa 2 câu
              const commonTokens = inputTokens.filter(token => 
                sourceTokens.some(srcToken => srcToken.toLowerCase() === token.toLowerCase())
              ).length;
              
              const similarity = sourceTokens.length > 0 ? (commonTokens / Math.max(inputTokens.length, sourceTokens.length)) * 100 : 0;
              
              if (similarity > bestMatchSimilarity) {
                bestMatchSimilarity = similarity;
                bestMatchSentence = sourceSentence;
              }
            }
            
            return {
              ...detail,
              sourceSentence: bestMatchSentence || detail.inputSentence, // Fallback to input sentence if no match found
              docSentence: bestMatchSentence || detail.inputSentence, // Add docSentence field for frontend
              matched: bestMatchSentence || detail.inputSentence, // Add matched field for frontend
              text: bestMatchSentence || detail.inputSentence, // Add text field for frontend
              similarity: Math.round(bestMatchSimilarity),
              matchedSentence: bestMatchSentence || detail.inputSentence, // Giữ cả hai để backward compatibility
              matchedSentenceSimilarity: Math.round(bestMatchSimilarity)
            };
          }));
          
          matches.push({
            documentId: meta.documentId || docId,
            title: meta.title || sourceDocument?.title || "Document",
            fileType: meta.fileType,
            createdAt: meta.createdAt,
            similarity: similarityForSorting,
            matchedHashes: undefined,
            matchedWords: undefined,
            duplicateSentences: data.matchedSentenceCount,
            duplicateSentencesDetails: enrichedDetails,
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
  const result = this.buildFinalResult(limitedMatches, dtotalPercent, totalInputSentences, totalDuplicatedSentences);
      console.log(`📊 Kết quả: Dtotal=${result.dtotal}% với ${result.totalMatches} tài liệu phù hợp`);
      return result;

    } catch (error) {
      console.error("Lỗi khi kiểm tra trùng lặp:", error);
      throw error;
    }
  }

  // Tạo kết quả cuối cùng
  buildFinalResult(matches, dtotalPercent, totalInputSentences, totalDuplicatedSentences) {
    const duplicatePercentage = dtotalPercent;
    const { dab, mostSimilarDocument } = this.calculateDtotalAndDAB(matches);

    return {
      duplicatePercentage,
      overallSimilarity: duplicatePercentage, // Add this field for compatibility
      matches,
      totalMatches: matches.length,
      checkedDocuments: this.docInfo.size,
      totalDocumentsInSystem: this.docInfo.size,
      sources: matches.map((m) => m.title),
      confidence: duplicatePercentage >= 70 ? "high" : duplicatePercentage >= 30 ? "medium" : "low",
      mostSimilarDocument,
      dtotal: duplicatePercentage,
      dab,
      totalInputSentences,
      totalDuplicatedSentences,
      searchMethod: "global-avl-tree",
      totalDuplicateSentences: totalDuplicatedSentences,
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
    this.tokenizationSamples = [];
    this.initialized = false;
    await this.initialize();
  }

  // Save Global AVL Tree to database
  async saveToDatabase() {
    try {
      if (!this.initialized) {
        console.warn('Tree not initialized, skipping save');
        return false;
      }

      console.log('Saving Global AVL Tree to database...');
      
      // Serialize tree
      const serializedTree = this.documentTree.serialize();
      
      // Calculate token statistics
      const tokenStats = this.calculateTokenStats();
      
      // Prepare document info với tokenization stats
      const documentInfo = Array.from(this.docInfo.entries()).map(([docId, info]) => {
        const docSamples = this.tokenizationSamples.filter(s => s.documentId === docId);
        const docTokenStats = this.calculateDocumentTokenStats(docSamples);
        
        return {
          documentId: docId,
          title: info.title,
          fileType: info.fileType,
          createdAt: info.createdAt,
          uploadedBy: info.uploadedBy ? String(info.uploadedBy) : null,
          sentenceCount: info.sentenceCount,
          wordCount: info.wordCount,
          tokenizationStats: docTokenStats
        };
      });

      // Prepare metadata
      const metadata = {
        totalNodes: serializedTree.metadata.totalNodes,
        totalDocuments: this.docInfo.size,
        totalSentences: Array.from(this.docInfo.values()).reduce((sum, info) => sum + (info.sentenceCount || 0), 0),
        treeHeight: serializedTree.metadata.treeHeight,
        tokenStats: tokenStats
      };

      const treeData = {
        metadata,
        nodes: serializedTree.nodes,
        rootHash: serializedTree.rootHash,
        documentInfo,
        tokenizationSamples: this.tokenizationSamples
      };

      // Check if tree exists
      const existingTree = await GlobalAVLTreeUnified.getLatest();
      
      if (existingTree) {
        await existingTree.updateTree(treeData);
        console.log('✅ Global AVL Tree updated in database');
      } else {
        await GlobalAVLTreeUnified.createNew(treeData);
        console.log('✅ Global AVL Tree created in database');
      }

      this.lastSaved = new Date();
      return true;
    } catch (error) {
      console.error('Error saving Global AVL Tree to database:', error);
      return false;
    }
  }

  // Load Global AVL Tree from database
  async loadFromDatabase() {
    try {
      console.log('Loading Global AVL Tree from database...');
      
      const savedTree = await GlobalAVLTreeUnified.getLatest();
      if (!savedTree) {
        console.log('No saved tree found in database');
        return false;
      }

      // Deserialize tree
      const serializedData = {
        nodes: savedTree.nodes,
        rootHash: savedTree.rootHash,
        metadata: savedTree.metadata
      };

      this.documentTree = TreeAVL.deserialize(serializedData);
      
      // Restore document info
      this.docInfo.clear();
      if (savedTree.documentInfo) {
        savedTree.documentInfo.forEach(info => {
          this.docInfo.set(info.documentId, {
            documentId: info.documentId,
            title: info.title,
            fileType: info.fileType,
            createdAt: info.createdAt,
            uploadedBy: info.uploadedBy,
            sentenceCount: info.sentenceCount,
            wordCount: info.wordCount
          });
        });
      }

      // Restore tokenization samples
      this.tokenizationSamples = savedTree.tokenizationSamples || [];

      console.log(`✅ Loaded tree with ${this.documentTree.getSize()} nodes, ${this.docInfo.size} documents`);
      this.lastSaved = savedTree.lastUpdated;
      return true;
    } catch (error) {
      console.error('Error loading Global AVL Tree from database:', error);
      return false;
    }
  }

  // Calculate token statistics
  calculateTokenStats() {
    const stats = {
      totalTokens: this.tokenizationSamples.reduce((sum, sample) => sum + sample.tokenizedWords.length, 0),
      preservedPhrases: 0,
      methodDistribution: {
        wordTokenizer: 0,
        tokenizer: 0,
        fallback: 0
      }
    };

    this.tokenizationSamples.forEach(sample => {
      sample.tokenizedWords.forEach(token => {
        if (token.isPreservedPhrase) {
          stats.preservedPhrases++;
        }
        stats.methodDistribution[token.method]++;
      });
    });

    return stats;
  }

  // Calculate document-specific token statistics
  calculateDocumentTokenStats(docSamples) {
    if (!docSamples || docSamples.length === 0) {
      return {
        totalTokens: 0,
        preservedPhrases: 0,
        uniqueTokens: 0
      };
    }

    const uniqueTokens = new Set();
    let preservedPhrases = 0;
    let totalTokens = 0;

    docSamples.forEach(sample => {
      sample.tokenizedWords.forEach(token => {
        totalTokens++;
        uniqueTokens.add(token.word);
        if (token.isPreservedPhrase) {
          preservedPhrases++;
        }
      });
    });

    return {
      totalTokens,
      preservedPhrases,
      uniqueTokens: uniqueTokens.size
    };
  }

  // Force save tree to database
  async forceSave() {
    return await this.saveToDatabase();
  }

  // Get save status
  getSaveStatus() {
    return {
      autoSave: this.autoSave,
      lastSaved: this.lastSaved,
      saveInterval: this.saveInterval
    };
  }
}

// Create singleton instance
const documentAVLService = new DocumentAVLService();

module.exports = documentAVLService;
