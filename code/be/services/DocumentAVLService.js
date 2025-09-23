const { TreeAVL, TextHasher } = require("../utils/TreeAVL");
const Document = require("../models/Document");
const GlobalAVLTreeUnified = require("../models/GlobalAVLTreeUnified");
const TokenizedWord = require("../models/TokenizedWord");
const Threshold = require("../models/Threshold");
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

  // Get current sentence threshold from database
  async getCurrentSentenceThreshold() {
    try {
      const thresholds = await Threshold.getThresholdValues();
      console.log(`🚀 Current sentence threshold: ${thresholds.sentenceThreshold}%`);
      return thresholds;
    } catch (error) {
      console.error("Error getting sentence threshold, using default:", error);
      return 50; // Fallback to default
    }
  }

  // Kiểm tra nội dung trùng lặp sử dụng cây AVL - phiên bản tối ưu performance
  async checkDuplicateContent(text, options = {}) {
    // Khởi tạo các service cần thiết
    if (!this.initialized) await this.initialize();
    if (!vietnameseStopwordService.initialized) {
      await vietnameseStopwordService.initialize();
    }

    // Lấy ngưỡng câu từ database, fallback về options hoặc default
    const threhold = await this.getCurrentSentenceThreshold();
    const sentenceThreshold = threhold.sentenceThreshold;
    const { minSimilarity = sentenceThreshold, maxResults = null } = options;
    
    console.log(`🎯 Using sentence threshold: ${sentenceThreshold}% (from database)`);
    console.log(`📊 Using minSimilarity: ${minSimilarity}% (for result filtering)`);
    
    // Sử dụng sentenceThreshold cho việc đánh dấu câu trùng lặp
    const duplicateThreshold = sentenceThreshold;

    try {
      // Bước 1: Tách câu và tokenize trước - tránh tokenize lại nhiều lần
      const inputSentences = TextHasher.extractSentences(text);
      const totalInputSentences = inputSentences.length;
      
      // Early return nếu không có câu nào để xử lý
      if (totalInputSentences === 0) {
        return this.buildFinalResult([], 0, 0, 0);
      }
      
      // Cache tokenization kết quả để tái sử dụng
      const sentenceTokenCache = new Map(); // sentenceIndex -> tokens
      const tokenHashCache = new Map(); // token -> hash
      
      // Pre-tokenize tất cả câu input và cache kết quả
      for (let i = 0; i < inputSentences.length; i++) {
        const sentence = inputSentences[i];
        const tokens = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(sentence);
        sentenceTokenCache.set(i, tokens);
        
        // Cache hash cho các token để tránh tính lại
        for (const token of tokens) {
          if (!tokenHashCache.has(token)) {
            tokenHashCache.set(token, TextHasher.createMurmurHash(token));
          }
        }
      }

      // Bước 2: Tìm matches trong AVL với tokenization đã cache
      const docMatches = new Map(); // docId -> { matchedSentenceCount, details: [] }
      let totalDuplicatedSentences = 0;

      for (let i = 0; i < inputSentences.length; i++) {
        const sentence = inputSentences[i];
        const tokens = sentenceTokenCache.get(i);
        const tokenCount = tokens.length;
        if (tokenCount === 0) continue;

        // Sử dụng Set để tối ưu việc đếm token matches
        const perDocTokenMatches = new Map(); // docId -> Set of matched tokens

        for (const token of tokens) {
          const hash = tokenHashCache.get(token); // Sử dụng cached hash
          const node = this.documentTree.search(hash);
          if (!node) continue;
          
          for (const docId of node.documents) {
            if (!perDocTokenMatches.has(docId)) {
              perDocTokenMatches.set(docId, new Set());
            }
            perDocTokenMatches.get(docId).add(token);
          }
        }

        // Xét ngưỡng cho từng doc - chỉ tính trùng khi similarity >= duplicateThreshold
        let sentenceMarkedDuplicate = false;
        for (const [docId, matchedTokenSet] of perDocTokenMatches) {
          const matchedCount = matchedTokenSet.size;
          const percent = (matchedCount / tokenCount) * 100;
          if (percent >= duplicateThreshold) {
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

      // Bước 3: Tối ưu database queries - load tất cả documents cần thiết trong một lần
      const docIds = Array.from(docMatches.keys());
      const sourceDocuments = new Map(); // docId -> document
      
      if (docIds.length > 0) {
        // Tải tất cả documents cần thiết trong một truy vấn duy nhất
        const docs = await Document.find({
          _id: { $in: docIds }
        }).select('_id extractedText title');
        
        // Cache documents và pre-process sentences
        const documentSentenceCache = new Map(); // docId -> sentences
        const documentTokenCache = new Map(); // docId -> Map(sentenceIndex -> tokens)
        
        for (const doc of docs) {
          sourceDocuments.set(String(doc._id), doc);
          if (doc.extractedText) {
            const sentences = TextHasher.extractSentences(doc.extractedText);
            documentSentenceCache.set(String(doc._id), sentences);
            
            // Pre-tokenize tất cả câu trong document để tối ưu so sánh
            const sentenceTokens = new Map();
            for (let i = 0; i < sentences.length; i++) {
              const tokens = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(sentences[i]);
              sentenceTokens.set(i, tokens);
            }
            documentTokenCache.set(String(doc._id), sentenceTokens);
          }
        }

        // Bước 4: Xử lý song song với batch processing
        const matches = [];
        const actualDuplicatedSentenceIndices = new Set();
        
        // Chia docMatches thành batches để xử lý song song hiệu quả hơn
        const batchSize = Math.min(5, docMatches.size); // Giới hạn batch size để tránh overload
        const docMatchEntries = Array.from(docMatches.entries());
        const batches = [];
        
        for (let i = 0; i < docMatchEntries.length; i += batchSize) {
          batches.push(docMatchEntries.slice(i, i + batchSize));
        }

        // Xử lý từng batch song song
        const batchResults = await Promise.all(batches.map(async (batch) => {
          const batchMatches = [];
          
          for (const [docId, data] of batch) {
            const meta = this.docInfo.get(String(docId)) || {};
            const totalSentencesInB = meta.sentenceCount || 1;
            
            const dabPercent = Math.round((data.matchedSentenceCount / totalInputSentences) * 100);
            const totalMatchedTokens = data.details.reduce((sum, detail) => sum + detail.matchedTokens, 0);
            const totalInputTokens = data.details.reduce((sum, detail) => sum + detail.totalTokens, 0);
            const similarityForSorting = totalInputTokens > 0 ? Math.round((totalMatchedTokens / totalInputTokens) * 100) : 0;

            if (similarityForSorting >= minSimilarity && dabPercent > 0) {
              const sourceDocument = sourceDocuments.get(String(docId));
              const sourceSentences = documentSentenceCache.get(String(docId)) || [];
              const sourceTokenCache = documentTokenCache.get(String(docId)) || new Map();

              // Tối ưu việc tìm câu trùng lặp tốt nhất
              const enrichedDetails = data.details.map((detail) => {
                let bestMatchSentence = "";
                let bestMatchSimilarity = 0;
                
                // Sử dụng cached tokens của input sentence
                const inputTokens = sentenceTokenCache.get(detail.inputSentenceIndex);
                if (!inputTokens || inputTokens.length === 0) {
                  return {
                    ...detail,
                    sourceSentence: detail.inputSentence,
                    docSentence: detail.inputSentence,
                    matched: detail.inputSentence,
                    text: detail.inputSentence,
                    similarity: 0,
                    matchedSentence: detail.inputSentence,
                    matchedSentenceSimilarity: 0,
                  };
                }

                // Tạo Set từ input tokens để tối ưu việc so sánh
                const inputTokenSet = new Set(inputTokens.map(t => t.toLowerCase()));

                // Tìm câu tương tự nhất trong source document
                for (let i = 0; i < sourceSentences.length; i++) {
                  const sourceSentence = sourceSentences[i];
                  const sourceTokens = sourceTokenCache.get(i);
                  
                  if (!sourceTokens || sourceTokens.length === 0) continue;

                  // Tối ưu việc tính common tokens bằng Set intersection hiệu quả hơn
                  const sourceTokenSet = new Set(sourceTokens.map(t => t.toLowerCase()));
                  
                  // Sử dụng vòng lặp thay vì filter để tối ưu performance
                  let commonTokensCount = 0;
                  for (const token of inputTokenSet) {
                    if (sourceTokenSet.has(token)) {
                      commonTokensCount++;
                    }
                  }

                  const similarity = (commonTokensCount / inputTokens.length) * 100;

                  if (similarity > bestMatchSimilarity) {
                    bestMatchSimilarity = similarity;
                    bestMatchSentence = sourceSentence;
                  }
                }

                return {
                  ...detail,
                  sourceSentence: bestMatchSentence || detail.inputSentence,
                  docSentence: bestMatchSentence || detail.inputSentence,
                  matched: bestMatchSentence || detail.inputSentence,
                  text: bestMatchSentence || detail.inputSentence,
                  similarity: Math.round(bestMatchSimilarity),
                  matchedSentence: bestMatchSentence || detail.inputSentence,
                  matchedSentenceSimilarity: Math.round(bestMatchSimilarity),
                };
              });

              // Lọc bỏ các câu có độ tương tự < 50% và tính toán trong một lần duyệt
              const filteredDetails = [];
              const duplicatedIndices = [];
              let filteredTotalMatchedTokens = 0;
              let filteredTotalInputTokens = 0;

              for (const detail of enrichedDetails) {
                if (detail.matchedSentenceSimilarity >= threhold.documentComparisonThreshold) {
                  filteredDetails.push(detail);
                  duplicatedIndices.push(detail.inputSentenceIndex);
                  filteredTotalMatchedTokens += detail.matchedTokens;
                  filteredTotalInputTokens += detail.totalTokens;
                }
              }

              if (filteredDetails.length > 0) {
                const filteredSimilarityForSorting = filteredTotalInputTokens > 0 ? Math.round((filteredTotalMatchedTokens / filteredTotalInputTokens) * 100) : 0;
                const filteredDabPercent = Math.round((filteredDetails.length / totalInputSentences) * 100);

                if (filteredDabPercent > 0) {
                  
                  batchMatches.push({
                    match: {
                      documentId: meta.documentId || docId,
                      title: meta.title || sourceDocument?.title || "Document",
                      fileType: meta.fileType,
                      createdAt: meta.createdAt,
                      similarity: filteredSimilarityForSorting,
                      matchedHashes: undefined,
                      matchedWords: undefined,
                      duplicateSentences: filteredDetails.length,
                      totalInputSentences: totalInputSentences,
                      duplicateSentencesDetails: filteredDetails,
                      method: "global-avl-word-index",
                      dabPercent: filteredDabPercent,
                      totalSentencesInSource: totalSentencesInB,
                    },
                    duplicatedIndices
                  });
                }
              }
            }
          }
          
          return batchMatches;
        }));

        // Gộp kết quả từ các batches
        for (const batchResult of batchResults) {
          for (const { match, duplicatedIndices } of batchResult) {
            matches.push(match);
            duplicatedIndices.forEach(index => actualDuplicatedSentenceIndices.add(index));
          }
        }

        // Bước 5: Sắp xếp và giới hạn kết quả (tối ưu cho trường hợp ít kết quả)
        if (matches.length > 1) {
          matches.sort((a, b) => b.similarity - a.similarity);
        }
        const limitedMatches = maxResults ? matches.slice(0, maxResults) : matches;

        // Bước 6: Tính toán kết quả cuối
        const actualTotalDuplicatedSentences = actualDuplicatedSentenceIndices.size;
        const dtotalPercent = totalInputSentences > 0 ? Math.round((actualTotalDuplicatedSentences / totalInputSentences) * 100) : 0;

        const result = this.buildFinalResult(limitedMatches, dtotalPercent, totalInputSentences, actualTotalDuplicatedSentences);
        console.log(`📊 Kết quả tối ưu: Dtotal=${result.dtotal}% với ${result.totalMatches} tài liệu có câu trùng lặp >= ${duplicateThreshold}%`);
        return result;
      }

      // Trường hợp không có matches
      const result = this.buildFinalResult([], 0, totalInputSentences, 0);
      console.log(`📊 Không tìm thấy tài liệu trùng lặp nào`);
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
      confidence: duplicatePercentage >= 70 ? "high" : duplicatePercentage >= 50 ? "medium" : "low", // Thay đổi từ 30% lên 50%
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
      if (!this.initialized) {
        console.warn('AVL tree not initialized, skipping document removal');
        return;
      }

      console.log(`Removing document ${documentId} from AVL tree...`);

      // Remove document from all nodes and clean up empty nodes
      const removedCount = this.documentTree.removeDocumentAndCleanup(documentId);

      // Remove document info from memory
      this.docInfo.delete(String(documentId));

      // Remove tokenization samples for this document
      this.tokenizationSamples = this.tokenizationSamples.filter(
        sample => sample.documentId !== String(documentId)
      );

      // Remove tokenized words from database
      try {
        const deletedTokens = await TokenizedWord.deleteMany({
          documentId: String(documentId)
        });
        console.log(`Removed ${deletedTokens.deletedCount} tokenized word records for document ${documentId}`);
      } catch (tokenError) {
        console.warn(`Failed to remove tokenized words for document ${documentId}:`, tokenError.message);
      }

      console.log(`Removed document ${documentId} from ${removedCount} nodes in AVL tree`);

      // Report tree statistics after removal
      const emptyNodes = this.documentTree.getEmptyNodesCount();
      const totalNodes = this.documentTree.getSize();
      if (emptyNodes > 0) {
        console.log(`⚠️ Tree now has ${emptyNodes} empty nodes out of ${totalNodes} total nodes`);

        // Note: We don't auto-rebuild here because the document might still exist in database
        // Auto-rebuild should be done manually or during maintenance
        const emptyRatio = emptyNodes / totalNodes;
        if (emptyRatio > 0.5) { // Only warn if more than 50% empty nodes
          console.log(`⚠️ High ratio of empty nodes (${(emptyRatio * 100).toFixed(1)}%). Consider manual tree optimization.`);
        }
      }

      // Lưu cây đã cập nhật vào database
      const saveResult = await this.saveToDatabase();
      if (saveResult) {
        console.log(`✅ AVL tree updated and saved after removing document ${documentId}`);
      } else {
        console.warn(`⚠️ Failed to save AVL tree after removing document ${documentId}`);
      }
    } catch (error) {
      console.error(`Error removing document ${documentId} from tree:`, error);

      // Fallback: rebuild tree if direct removal fails
      console.log('Falling back to full tree rebuild...');
      try {
        await this.refreshTree();
        await this.saveToDatabase();
        console.log('✅ Tree rebuilt successfully as fallback');
      } catch (rebuildError) {
        console.error('Failed to rebuild tree as fallback:', rebuildError);
      }
    }
  }

  // Refresh tree (reload from database)
  async refreshTree() {
    console.log('🔄 Refreshing AVL tree from database...');
    this.documentTree.clear();
    this.docInfo.clear();
    this.tokenizationSamples = [];
    this.initialized = false;
    await this.initialize();
    console.log(`✅ AVL tree refreshed with ${this.documentTree.getSize()} entries`);
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
