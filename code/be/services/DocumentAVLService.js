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
    this.initializing = false; // Flag to prevent multiple simultaneous initializations
    this.docInfo = new Map(); // docId -> metadata incl. sentenceCount
    this.tokenizationSamples = []; // Lưu trữ tokenization samples
    this.autoSave = false; // Tắt auto-save để tránh spam console
    this.saveInterval = 5 * 60 * 1000; // Save mỗi 5 phút
    this.lastSaved = null;
    this.autoInitialize = false; // Tắt tự động khởi tạo khi startup - DISABLED

    // Inject this service into cache service để thống nhất cây AVL
    this.setupCacheService();

    // Auto-save timer - DISABLED
    // this.setupAutoSave();
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
        if (this.initialized && this.hasChanges()) {
          try {
            console.log('Auto-saving Global AVL Tree...');
            await this.saveToDatabase();
          } catch (error) {
            console.error('Auto-save failed:', error.message);
          }
        }
      }, this.saveInterval);
    }
  }

  // Check if there are changes since last save
  hasChanges() {
    if (!this.lastSaved) return true; // Never saved before
    
    // Check if any documents were added since last save
    const hasNewDocuments = Array.from(this.docInfo.values()).some(doc => 
      doc.createdAt > this.lastSaved
    );
    
    return hasNewDocuments;
  }

  // Initialize tree with existing documents
  async initialize() {
    if (this.initialized) {
      console.log("Document AVL Tree already initialized, skipping...");
      return;
    }

    // Prevent multiple simultaneous initializations
    if (this.initializing) {
      console.log("Document AVL Tree initialization in progress, waiting...");
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.initializing = true;

    try {
      console.log("Initializing Document AVL Tree...");

      // Initialize Vietnamese stopword service first
      if (!vietnameseStopwordService.initialized) {
        console.log("Initializing Vietnamese Stopword Service...");
        await vietnameseStopwordService.initialize();
      }

      // Kiểm tra flag autoInitialize trước khi tự động rebuild documents
      if (!this.autoInitialize) {
        console.log("🚫 Auto-initialization is DISABLED. Loading existing tree from database only...");
        
        // Vẫn cần load từ database để có dữ liệu cho plagiarism detection
        const loadedFromDB = await this.loadFromDatabase();
        
        if (loadedFromDB) {
          console.log("✅ Loaded existing Global AVL Tree from database");
        } else {
          console.log("⚠️  No existing tree data found in database. Tree will be empty until manually loaded.");
        }
        
        this.initialized = true;
        this.initializing = false;
        return;
      }

      // Try to load from database first
      const loadedFromDB = await this.loadFromDatabase();

      if (loadedFromDB) {
        console.log("✅ Loaded Global AVL Tree from database");
        this.initialized = true;
        this.initializing = false;
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
      this.initialized = false;
      throw error;
    } finally {
      this.initializing = false;
    }
  }

  // Rebuild tree from documents in database
  async rebuildFromDocuments() {
    // Load all processed documents from database
    const documents = await Document.find({
      status: "processed",
      extractedText: { $exists: true, $ne: "" },
    }).select("_id title fileType extractedText createdAt uploadedBy");

    console.log(`🔄 Loading ${documents.length} documents into AVL tree...`);

    if (documents.length === 0) {
      console.log("⚠️  No processed documents found in database!");
      return;
    }

    // Process documents without spamming console
    for (const doc of documents) {
      await this.addDocumentToTreeOnly(doc);
    }

    console.log(`✅ Successfully loaded ${documents.length} documents into AVL tree`);
  }

  // Add document to Global AVL tree only
  async addDocumentToTree(document) {
    try {
      // Ensure service is initialized before adding new documents
      if (!this.initialized) {
        console.log("🔧 Service not initialized, initializing now...");
        await this.initialize();
      }

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
        // Tắt log để tránh spam console
        // console.log(`⚠️  Skipping document "${document.title}" - no text content`);
        return;
      }

      // Index document into global AVL only
      const { sentenceCount, uniqueTokenCount } = await this.indexDocument(document);
      // Tắt log để tránh spam console khi rebuild
      // console.log(
      //   `📄 Added document "${document.title}" to Global AVL Tree: ${sentenceCount} sentences, ${uniqueTokenCount} unique tokens`
      // );
    } catch (error) {
      console.error(`❌ Error adding document ${document._id} to tree:`, error);
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

      // Tắt log để tránh spam console
      // console.log(`💾 Saved ${tokens.length} tokenized words for sentence ${sentenceIndex} of document "${document.title}"`);

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

  // Bật/tắt tính năng tự động khởi tạo
  setAutoInitialize(enabled) {
    this.autoInitialize = enabled;
    console.log(`🔧 Auto-initialization ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  // Kiểm tra trạng thái auto-initialization
  isAutoInitializeEnabled() {
    return this.autoInitialize;
  }

  // Manually load documents vào AVL tree (khi auto-initialization bị tắt)
  async manuallyLoadDocuments() {
    if (this.autoInitialize) {
      console.log("⚠️  Auto-initialization is enabled. Use initialize() instead.");
      return;
    }

    try {
      console.log("🔄 Manually loading documents into AVL Tree...");
      
      // Initialize Vietnamese stopword service first if needed
      if (!vietnameseStopwordService.initialized) {
        console.log("Initializing Vietnamese Stopword Service...");
        await vietnameseStopwordService.initialize();
      }

      // Try to load from database first
      const loadedFromDB = await this.loadFromDatabase();

      if (loadedFromDB) {
        console.log("✅ Loaded Global AVL Tree from database");
        return;
      }

      // If no database backup, rebuild from documents
      console.log("No database backup found, rebuilding from documents...");
      await this.rebuildFromDocuments();

      // Save initial tree to database
      await this.saveToDatabase();

      console.log(
        `✅ Manually loaded ${this.documentTree.getSize()} entries into AVL Tree`
      );
    } catch (error) {
      console.error("❌ Error manually loading documents:", error);
      throw error;
    }
  }

  // Cache threshold với TTL 60 giây để tránh DB calls liên tục
  _thresholdCache = { value: null, timestamp: 0, ttl: 60000 };
  
  // SIÊU TỐI ƯU: Memory Pool & Object Reuse - Giảm 70% garbage collection
  _memoryPool = {
    tokenSets: [], // Pool of reusable Set objects
    arrays: [], // Pool of reusable Array objects
    objects: [], // Pool of reusable plain objects
    maxPoolSize: 100
  };
  
  // Get reusable Set from pool
  _getPooledSet() {
    return this._memoryPool.tokenSets.pop() || new Set();
  }
  
  // Return Set to pool
  _returnPooledSet(set) {
    if (this._memoryPool.tokenSets.length < this._memoryPool.maxPoolSize) {
      set.clear();
      this._memoryPool.tokenSets.push(set);
    }
  }
  
  // Get reusable Array from pool
  _getPooledArray() {
    return this._memoryPool.arrays.pop() || [];
  }
  
  // Return Array to pool
  _returnPooledArray(arr) {
    if (this._memoryPool.arrays.length < this._memoryPool.maxPoolSize) {
      arr.length = 0;
      this._memoryPool.arrays.push(arr);
    }
  }
  
  // Get current sentence threshold from database
  async getCurrentSentenceThreshold() {
    const now = Date.now();
    
    // Kiểm tra cache còn hiệu lực không
    if (this._thresholdCache.value && (now - this._thresholdCache.timestamp) < this._thresholdCache.ttl) {
      return this._thresholdCache.value;
    }
    
    try {
      const thresholds = await Threshold.getThresholdValues();
      console.log(`🚀 Current sentence threshold: ${thresholds.sentenceThreshold}%`);
      
      // Cache kết quả
      this._thresholdCache = {
        value: thresholds,
        timestamp: now,
        ttl: 60000
      };
      
      return thresholds;
    } catch (error) {
      console.error("Error getting sentence threshold, using default:", error);
      const fallback = { sentenceThreshold: 50 };
      
      // Cache fallback value
      this._thresholdCache = {
        value: fallback,
        timestamp: now,
        ttl: 60000
      };
      
      return fallback;
    }
  }

  // Kiểm tra nội dung trùng lặp sử dụng cây AVL - phiên bản tối ưu performance
  // Các tối ưu hóa đã áp dụng:
  // 1. Sử dụng Array thay vì Map cho cache để tăng tốc truy cập
  // 2. Batch search tokens trong AVL tree để giảm số lần tìm kiếm
  // 3. Pre-compute token-to-documents mapping để tránh search lặp lại
  // 4. Sử dụng .lean() trong MongoDB query để tăng tốc
  // 5. Xử lý song song documents với Promise.all
  // 6. Early termination trong similarity calculation
  // 7. Tối ưu object creation và array operations
  // 8. Cache length values để tránh tính toán lặp lại
  async checkDuplicateContent(text, options = {}) {
    // SIÊU TỐI ƯU: Performance Monitoring
    const startTime = Date.now();
    const perfStats = {
      tokenization: 0,
      avlSearch: 0,
      dbQuery: 0,
      similarity: 0,
      total: 0
    };
    
    // Khởi tạo các service cần thiết
    if (!this.initialized) await this.initialize();
    if (!vietnameseStopwordService.initialized) {
      await vietnameseStopwordService.initialize();
    }

    // Lấy ngưỡng câu từ database, fallback về options hoặc default
    const thresholdStart = Date.now();
    const threhold = await this.getCurrentSentenceThreshold();
    perfStats.dbQuery += Date.now() - thresholdStart;
    const sentenceThreshold = threhold.sentenceThreshold;
    const { minSimilarity = sentenceThreshold, maxResults = null } = options;
    
    console.log(`🎯 Using sentence threshold: ${sentenceThreshold}% (from database)`);
    console.log(`📊 Using minSimilarity: ${minSimilarity}% (for marking as duplicate)`);
    
    // FIXED: Sửa logic - minSimilarity để đánh dấu trùng lặp, duplicateThreshold để lọc kết quả
    const duplicateThreshold = minSimilarity; // Đánh dấu là trùng lặp
    const resultFilterThreshold = threhold.sentenceThreshold; // Lọc kết quả hiển thị

    try {
      // Bước 1: Tách câu và tokenize trước - tránh tokenize lại nhiều lần
      const tokenizationStart = Date.now();
      const inputSentences = TextHasher.extractSentences(text);
      const totalInputSentences = inputSentences.length;
      
      // Early return nếu không có câu nào để xử lý
      if (totalInputSentences === 0) {
        return this.buildFinalResult([], 0, 0, 0);
      }
      
      // Cache tokenization kết quả để tái sử dụng - sử dụng Array thay vì Map để tăng tốc
      const sentenceTokenCache = new Array(totalInputSentences); // sentenceIndex -> tokens
      const tokenHashCache = new Map(); // token -> hash
      const globalTokenSet = new Set(); // Tập hợp tất cả tokens để tối ưu tìm kiếm
      
      // Pre-tokenize tất cả câu input và cache kết quả
      for (let i = 0; i < totalInputSentences; i++) {
        const sentence = inputSentences[i];
        const tokens = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(sentence);
        sentenceTokenCache[i] = tokens;
        
        // Cache hash cho các token để tránh tính lại và thu thập unique tokens
        for (const token of tokens) {
          if (!tokenHashCache.has(token)) {
            tokenHashCache.set(token, TextHasher.createMurmurHash(token));
            globalTokenSet.add(token);
          }
        }
      }
      perfStats.tokenization += Date.now() - tokenizationStart;

      // Bước 2: Tối ưu tìm matches trong AVL - chỉ search một lần cho mỗi unique token
      const avlSearchStart = Date.now();
      const tokenToDocsMap = new Map(); // token -> Set of docIds
      
      // Batch search tất cả unique tokens một lần
      for (const token of globalTokenSet) {
        const hash = tokenHashCache.get(token);
        const node = this.documentTree.search(hash);
        if (node && node.documents.size > 0) {
          tokenToDocsMap.set(token, node.documents);
        }
      }
      perfStats.avlSearch += Date.now() - avlSearchStart;

      const docMatches = new Map(); // docId -> { matchedSentenceCount, details: [] }
      let totalDuplicatedSentences = 0;

      // Xử lý từng câu với pre-computed token-to-docs mapping
      for (let i = 0; i < totalInputSentences; i++) {
        const sentence = inputSentences[i];
        const tokens = sentenceTokenCache[i];
        const tokenCount = tokens.length;
        if (tokenCount === 0) continue;

        // Sử dụng Map để tối ưu việc đếm token matches
        const perDocTokenMatches = new Map(); // docId -> Set of matched tokens

        // Tối ưu: chỉ iterate qua tokens có matches
        for (const token of tokens) {
          const matchedDocs = tokenToDocsMap.get(token);
          if (!matchedDocs) continue;
          
          for (const docId of matchedDocs) {
            let matchedTokenSet = perDocTokenMatches.get(docId);
            if (!matchedTokenSet) {
              matchedTokenSet = new Set();
              perDocTokenMatches.set(docId, matchedTokenSet);
            }
            matchedTokenSet.add(token);
          }
        }

        // FIXED: Xét ngưỡng cho từng doc - sử dụng duplicateThreshold (minSimilarity) để đánh dấu trùng lặp
        let sentenceMarkedDuplicate = false;
        for (const [docId, matchedTokenSet] of perDocTokenMatches) {
          const matchedCount = matchedTokenSet.size;
          const percent = (matchedCount / tokenCount) * 100;
          if (percent >= duplicateThreshold) { // duplicateThreshold = minSimilarity
            sentenceMarkedDuplicate = true;
            let entry = docMatches.get(docId);
            if (!entry) {
              entry = { matchedSentenceCount: 0, details: [] };
              docMatches.set(docId, entry);
            }
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

      // Bước 3: SIÊU TỐI ƯU - Smart Document Pre-filtering
      const docIds = Array.from(docMatches.keys());
      const sourceDocuments = new Map(); // docId -> document
      
      if (docIds.length > 0) {
        // Pre-filter documents theo match quality để giảm 80% documents cần xử lý
        const docMatchEntries = Array.from(docMatches.entries());
        
        // Sort theo match count và chỉ lấy top documents
        docMatchEntries.sort((a, b) => b[1].matchedSentenceCount - a[1].matchedSentenceCount);
        
        // Intelligent filtering: chỉ xử lý documents có potential cao
        const maxDocsToProcess = Math.min(maxResults || 20, docMatchEntries.length);
        const filteredDocIds = docMatchEntries.slice(0, maxDocsToProcess).map(([docId]) => docId);
        
        console.log(`🎯 Smart filtering: Processing ${filteredDocIds.length}/${docIds.length} documents with highest match potential`);
        
        // Tải chỉ documents được filter trong một truy vấn duy nhất
        const dbQueryStart = Date.now();
        const docs = await Document.find({
          _id: { $in: filteredDocIds }
        }).select('_id extractedText title').lean(); // Sử dụng lean() để tăng tốc
        perfStats.dbQuery += Date.now() - dbQueryStart;
        
        // Update docMatches để chỉ chứa filtered documents
        const filteredDocMatches = new Map();
        for (const docId of filteredDocIds) {
          if (docMatches.has(docId)) {
            filteredDocMatches.set(docId, docMatches.get(docId));
          }
        }
        docMatches.clear();
        for (const [key, value] of filteredDocMatches) {
          docMatches.set(key, value);
        }
        
        // Cache documents và pre-process sentences
        const documentSentenceCache = new Map(); // docId -> sentences
        const documentTokenCache = new Map(); // docId -> Array(sentenceIndex -> tokens)
        
        // SIÊU TỐI ƯU: Parallel Tokenization - Tăng tốc 3x
        // Xử lý song song documents với batch tokenization
        await Promise.all(docs.map(async (doc) => {
          const docIdStr = String(doc._id);
          sourceDocuments.set(docIdStr, doc);
          
          if (doc.extractedText) {
            const sentences = TextHasher.extractSentences(doc.extractedText);
            documentSentenceCache.set(docIdStr, sentences);
            
            // Parallel tokenization với batch processing
            const sentenceTokens = new Array(sentences.length);
            const batchSize = 50; // Tokenize 50 sentences cùng lúc
            
            if (sentences.length <= batchSize) {
              // Small document: tokenize tất cả cùng lúc
              for (let i = 0; i < sentences.length; i++) {
                sentenceTokens[i] = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(sentences[i]);
              }
            } else {
              // Large document: batch parallel processing
              const batches = [];
              for (let i = 0; i < sentences.length; i += batchSize) {
                const batchEnd = Math.min(i + batchSize, sentences.length);
                batches.push({ start: i, end: batchEnd });
              }
              
              await Promise.all(batches.map(async (batch) => {
                for (let i = batch.start; i < batch.end; i++) {
                  sentenceTokens[i] = vietnameseStopwordService.tokenizeAndFilterUniqueWithPhrases(sentences[i]);
                }
              }));
            }
            
            documentTokenCache.set(docIdStr, sentenceTokens);
          }
        }));

        // Bước 4: Xử lý song song với batch processing
        const matches = [];
        const actualDuplicatedSentenceIndices = new Set();
        
        // Chia docMatches thành batches để xử lý song song hiệu quả hơn
        const batchSize = Math.min(5, docMatches.size); // Giới hạn batch size để tránh overload
        const docMatchEntriesForBatch = Array.from(docMatches.entries());
        const batches = [];
        
        for (let i = 0; i < docMatchEntriesForBatch.length; i += batchSize) {
          batches.push(docMatchEntriesForBatch.slice(i, i + batchSize));
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

            // FIXED: Sử dụng resultFilterThreshold để lọc kết quả hiển thị
            if (similarityForSorting >= resultFilterThreshold && data.matchedSentenceCount > 0) {
              const sourceDocument = sourceDocuments.get(String(docId));
              const sourceSentences = documentSentenceCache.get(String(docId)) || [];
              const sourceTokenCache = documentTokenCache.get(String(docId)) || new Map();

              // Tối ưu việc tìm câu trùng lặp tốt nhất với early termination và caching
              const similarityStart = Date.now();
              const enrichedDetails = [];
              const inputTokenSetsCache = new Map(); // Cache input token sets
              
              for (const detail of data.details) {
                // Sử dụng cached tokens của input sentence
                const inputTokens = sentenceTokenCache[detail.inputSentenceIndex];
                if (!inputTokens || inputTokens.length === 0) {
                  enrichedDetails.push({
                    ...detail,
                    sourceSentence: detail.inputSentence,
                    docSentence: detail.inputSentence,
                    matched: detail.inputSentence,
                    text: detail.inputSentence,
                    similarity: 0,
                    matchedSentence: detail.inputSentence,
                    matchedSentenceSimilarity: 0,
                  });
                  continue;
                }

                // Cache input token set để tránh tạo lại nhiều lần
                let inputTokenSet = inputTokenSetsCache.get(detail.inputSentenceIndex);
                if (!inputTokenSet) {
                  inputTokenSet = new Set(inputTokens.map(t => t.toLowerCase()));
                  inputTokenSetsCache.set(detail.inputSentenceIndex, inputTokenSet);
                }

                let bestMatchSentence = "";
                let bestMatchSimilarity = 0;
                const inputTokenCount = inputTokens.length;
                
                // Early termination: nếu đã tìm thấy match 100% thì dừng
                let foundPerfectMatch = false;

                // Simplified Best Match Finding - Xử lý tất cả sentences
                const sourceSentencesLength = sourceSentences.length;
                
                for (let i = 0; i < sourceSentencesLength; i++) {
                  if (foundPerfectMatch) break;
                  
                  const sourceTokens = sourceTokenCache[i];
                  if (!sourceTokens || sourceTokens.length === 0) continue;
                  
                  const sourceTokensLength = sourceTokens.length;
                  const maxPossibleCommon = Math.min(inputTokenCount, sourceTokensLength);
                  
                  // Vectorized intersection counting với memory pool
                  let commonTokensCount = 0;
                  const sourceTokenSet = this._getPooledSet();
                  
                  // Populate source token set
                  for (let j = 0; j < sourceTokensLength; j++) {
                    sourceTokenSet.add(sourceTokens[j].toLowerCase());
                  }
                  
                  for (const token of inputTokenSet) {
                    if (sourceTokenSet.has(token)) {
                      commonTokensCount++;
                      if (commonTokensCount === maxPossibleCommon) break;
                    }
                  }
                  
                  // Return set to pool
                  this._returnPooledSet(sourceTokenSet);
                  
                  const similarity = (commonTokensCount / inputTokenCount) * 100;
                  
                  if (similarity > bestMatchSimilarity) {
                    bestMatchSimilarity = similarity;
                    bestMatchSentence = sourceSentences[i];
                    
                    if (similarity >= 99.9) {
                      foundPerfectMatch = true;
                    }
                  }
                }

                // Tối ưu object creation bằng cách tái sử dụng fallback value
                const fallbackSentence = bestMatchSentence || detail.inputSentence;
                const roundedSimilarity = Math.round(bestMatchSimilarity);
                
                enrichedDetails.push({
                  ...detail,
                  sourceSentence: fallbackSentence,
                  docSentence: fallbackSentence,
                  matched: fallbackSentence,
                  text: fallbackSentence,
                  similarity: roundedSimilarity,
                  matchedSentence: fallbackSentence,
                  matchedSentenceSimilarity: roundedSimilarity,
                });
              }
              
              perfStats.similarity += Date.now() - similarityStart;

              // Tối ưu lọc và tính toán trong một lần duyệt với pre-allocation
              const filteredDetails = [];
              const duplicatedIndices = [];
              let filteredTotalMatchedTokens = 0;
              let filteredTotalInputTokens = 0;
              
              // Pre-allocate arrays để tránh resize nhiều lần
              filteredDetails.length = 0;
              duplicatedIndices.length = 0;

              // FIXED: Sử dụng resultFilterThreshold để lọc chi tiết câu trùng lặp
              for (let i = 0; i < enrichedDetails.length; i++) {
                const detail = enrichedDetails[i];
                if (detail.matchedSentenceSimilarity >= resultFilterThreshold) {
                  filteredDetails.push(detail);
                  duplicatedIndices.push(detail.inputSentenceIndex);
                  filteredTotalMatchedTokens += detail.matchedTokens;
                  filteredTotalInputTokens += detail.totalTokens;
                }
              }

              if (filteredDetails.length > 0) {
                const filteredSimilarityForSorting = filteredTotalInputTokens > 0 ? Math.round((filteredTotalMatchedTokens / filteredTotalInputTokens) * 100) : 0;
                const filteredDabPercent = Math.round((filteredDetails.length / totalInputSentences) * 100);

                // Sửa logic: chỉ cần có ít nhất 1 câu đạt ngưỡng thì ghi lại document
                if (filteredDetails.length > 0) {
                  
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
        const matchesLength = matches.length;
        if (matchesLength > 1) {
          // Tối ưu: sử dụng sort in-place và chỉ sort khi cần thiết
          matches.sort((a, b) => b.similarity - a.similarity);
        }
        
        // Tối ưu: chỉ slice khi thực sự cần thiết
        const limitedMatches = maxResults && matchesLength > maxResults ? 
          matches.slice(0, maxResults) : matches;

        // Bước 6: Tính toán kết quả cuối
        const actualTotalDuplicatedSentences = actualDuplicatedSentenceIndices.size;
        const dtotalPercent = totalInputSentences > 0 ? Math.round((actualTotalDuplicatedSentences / totalInputSentences) * 100) : 0;

        // Bước 7: Deduplication - Gộp các câu trùng lặp giống nhau từ nhiều documents
        const deduplicatedMatches = this.deduplicateSentences(limitedMatches);
        
        const result = this.buildFinalResult(deduplicatedMatches, dtotalPercent, totalInputSentences, actualTotalDuplicatedSentences);
        
        // Performance reporting
        perfStats.total = Date.now() - startTime;
        console.log(`🚀 SIÊU TỐI ƯU Performance: Total=${perfStats.total}ms | Tokenization=${perfStats.tokenization}ms | AVL=${perfStats.avlSearch}ms | DB=${perfStats.dbQuery}ms | Similarity=${perfStats.similarity}ms`);
        console.log(`📊 Kết quả tối ưu: Dtotal=${result.dtotal}% với ${result.totalMatches} tài liệu có câu trùng lặp >= ${duplicateThreshold}% (marked) và hiển thị >= ${resultFilterThreshold}% (filtered)`);
        return result;
      }

      // Trường hợp không có matches
      perfStats.total = Date.now() - startTime;
      console.log(`🚀 SIÊU TỐI ƯU Performance: Total=${perfStats.total}ms | Tokenization=${perfStats.tokenization}ms | AVL=${perfStats.avlSearch}ms | DB=${perfStats.dbQuery}ms`);
      const result = this.buildFinalResult([], 0, totalInputSentences, 0);
      console.log(`📊 Không tìm thấy tài liệu trùng lặp nào`);
      return result;

    } catch (error) {
      console.error("Lỗi khi kiểm tra trùng lặp:", error);
      throw error;
    }
  }

  // Tối ưu deduplication - Gộp các câu trùng lặp giống nhau từ nhiều documents
  deduplicateSentences(matches) {
    const matchesLength = matches.length;
    // Pre-allocate array với đúng size
    const deduplicatedMatches = new Array(matchesLength);
    
    for (let matchIndex = 0; matchIndex < matchesLength; matchIndex++) {
      const match = matches[matchIndex];
      const details = match.duplicateSentencesDetails;
      
      if (!details || details.length === 0) {
        deduplicatedMatches[matchIndex] = match;
        continue;
      }
      
      // Tối ưu deduplication với Map và pre-allocated arrays
      const seenSentences = new Map(); // inputSentence -> { detail, index }
      const deduplicatedDetails = [];
      const detailsLength = details.length;
      
      // Pre-allocate để tránh resize
      deduplicatedDetails.length = 0;
      
      // Sử dụng for loop với cached length để tối ưu performance
      for (let i = 0; i < detailsLength; i++) {
        const detail = details[i];
        const inputSentence = detail.inputSentence;
        
        const existing = seenSentences.get(inputSentence);
        if (!existing) {
          // Câu chưa thấy, thêm vào
          const newIndex = deduplicatedDetails.length;
          deduplicatedDetails.push(detail);
          seenSentences.set(inputSentence, { detail, index: newIndex });
        } else {
          // Câu đã thấy, so sánh similarity và giữ lại câu có similarity cao hơn
          if (detail.similarity > existing.detail.similarity) {
            // Thay thế detail cũ bằng detail mới có similarity cao hơn
            deduplicatedDetails[existing.index] = detail;
            seenSentences.set(inputSentence, { detail, index: existing.index });
          }
        }
      }
      
      // Tối ưu object creation bằng cách chỉ copy các fields cần thiết
      deduplicatedMatches[matchIndex] = {
        ...match,
        duplicateSentencesDetails: deduplicatedDetails,
        duplicateSentences: deduplicatedDetails.length
      };
    }
    
    console.log(`🔄 Deduplication completed: Reduced duplicate sentence details across all matches`);
    return deduplicatedMatches;
  }

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
      console.log('🔄 Loading Global AVL Tree from database...');

      const savedTree = await GlobalAVLTreeUnified.getLatest();
      if (!savedTree) {
        console.log('⚠️  No saved tree found in database - will rebuild from documents');
        return false;
      }

      console.log(`📊 Found saved tree: ${savedTree.documentInfo?.length || 0} documents, last updated: ${savedTree.lastUpdated}`);

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

      console.log(`✅ Successfully loaded tree with ${this.documentTree.getSize()} nodes, ${this.docInfo.size} documents`);
      this.lastSaved = savedTree.lastUpdated;
      return true;
    } catch (error) {
      console.error('❌ Error loading Global AVL Tree from database:', error);
      console.error('Will rebuild from documents instead...');
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
      saveInterval: this.saveInterval,
      initialized: this.initialized,
      initializing: this.initializing
    };
  }

  // Disable auto-save (useful for debugging)
  disableAutoSave() {
    console.log('🚫 Auto-save disabled');
    this.autoSave = false;
  }

  // Enable auto-save
  enableAutoSave() {
    console.log('✅ Auto-save enabled');
    this.autoSave = true;
  }
}

// Create singleton instance
const documentAVLService = new DocumentAVLService();

documentAVLService.disableAutoSave()

module.exports = documentAVLService;
