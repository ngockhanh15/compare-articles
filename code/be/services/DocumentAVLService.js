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

  // Check for duplicate content using AVL tree with hash-based plagiarism detection
  // Trong phương thức checkDuplicateContent của DocumentAVLService
async checkDuplicateContent(text, options = {}) {
  if (!this.initialized) {
    await this.initialize();
  }

  // Ensure Vietnamese stopword service is initialized
  if (!vietnameseStopwordService.initialized) {
    await vietnameseStopwordService.initialize();
  }

  const { minSimilarity = 50, chunkSize = 2, maxResults = 10 } = options;

  try {
    console.log(`🔍 Starting plagiarism check using AVL tree...`);
    console.log(`📝 Input text length: ${text.length} characters`);

    // Bước 1: Mã hóa văn bản input thành word hashes
    const inputHashes = TextHasher.createWordHashes(text, true);

    // Tạo danh sách các từ có nghĩa (không lặp lại) từ văn bản đầu vào
    const meaningfulWords = vietnameseStopwordService.extractMeaningfulWords(text);
    const uniqueInputWords = new Set(meaningfulWords);
    
    // Tạo danh sách các cặp từ từ văn bản đầu vào
    const wordPairs = [];
    for (let i = 0; i < meaningfulWords.length - 1; i++) {
      wordPairs.push(`${meaningfulWords[i]}_${meaningfulWords[i+1]}`);
    }
    const uniqueWordPairs = new Set(wordPairs);
    
    console.log(`📊 Input text has ${uniqueInputWords.size} unique words and ${uniqueWordPairs.size} unique word pairs`);

    // Bước 2: Tách văn bản thành các câu
    const inputSentences = TextHasher.extractSentences(text);
    console.log(`📝 Input text has ${inputSentences.length} sentences`);

    // Bước 3: Tìm kiếm các hash trong cây AVL
    const documentMatches = new Map(); // documentId -> {matches, totalHashes}
    let totalSearches = 0;

    for (const wordHash of inputHashes) {
      totalSearches++;
      const foundNode = this.documentTree.search(wordHash.hash);

      if (foundNode) {
        const docData = foundNode.data;
        const documentId = docData.documentId.toString(); // Ensure string for consistent key

        if (!documentMatches.has(documentId)) {
          documentMatches.set(documentId, {
            documentData: docData,
            matchedHashes: 0,
            totalInputHashes: inputHashes.length,
            matchedWords: [],
            matchedWordSet: new Set(), // Track unique words to avoid duplicates
            matchedSentences: [], // Lưu các câu trùng lặp
          });
        }

        const matchData = documentMatches.get(documentId);

        // Only count unique words to avoid inflating the match count
        if (!matchData.matchedWordSet.has(wordHash.word)) {
          matchData.matchedHashes++;
          matchData.matchedWords.push(wordHash.word);
          matchData.matchedWordSet.add(wordHash.word);
        }
      }
    }

    console.log(`🔍 Searched ${totalSearches} hashes, found matches in ${documentMatches.size} documents`);
    console.log(`🌳 AVL Tree size: ${this.documentTree.getSize()} documents`);

    // Bước 4: Phân tích từng câu trong mỗi tài liệu để tìm câu trùng lặp
    let totalDuplicateSentences = 0;
    let totalSentencesWithInputWords = 0;
    
    for (const [documentId, matchData] of documentMatches.entries()) {
      const docData = matchData.documentData;
      
      // Tách tài liệu thành các câu
      const docSentences = TextHasher.extractSentences(docData.fullText);
      
      // Phân tích từng câu
      for (const sentence of docSentences) {
        // Tách câu thành các từ có nghĩa
        const sentenceWords = vietnameseStopwordService.extractMeaningfulWords(sentence);
        const uniqueSentenceWords = new Set(sentenceWords);
        
        // Tạo các cặp từ trong câu
        const sentenceWordPairs = [];
        for (let i = 0; i < sentenceWords.length - 1; i++) {
          sentenceWordPairs.push(`${sentenceWords[i]}_${sentenceWords[i+1]}`);
        }
        const uniqueSentenceWordPairs = new Set(sentenceWordPairs);
        
        // Tìm các cặp từ trùng lặp (đồng nhất với plagiarismController.js)
        const matchedWordPairs = [...uniqueSentenceWordPairs].filter((pair) =>
          uniqueWordPairs.has(pair)
        );
        
        // Tính tỷ lệ trùng lặp theo công thức: (số cặp từ trùng / số cặp từ trong câu) * 100 (đồng nhất với plagiarismController.js)
        let duplicateRatio = 0;
        if (uniqueSentenceWordPairs.size > 0) {
          duplicateRatio = (matchedWordPairs.length / uniqueSentenceWordPairs.size) * 100;
        }
        
        // Kiểm tra xem câu có trùng lặp không theo tiêu chí mới
        const isDuplicate = duplicateRatio > 50;
        
        // Đếm số từ trùng lặp (để tương thích với logic cũ)
        const matchedWords = [...uniqueSentenceWords].filter(word => uniqueInputWords.has(word));
        
        // Nếu câu trùng lặp, thêm vào danh sách
        if (isDuplicate) {
          matchData.matchedSentences.push({
            sentence,
            duplicateRatio,
            matchedWordPairs, // Sử dụng matchedWordPairs thay vì matchedWords
            matchedWords, // Giữ lại để tương thích
            totalWordPairs: uniqueSentenceWordPairs.size,
            matchedWordPairsCount: matchedWordPairs.length
          });
          totalDuplicateSentences++;
        }
        
        // Nếu câu có chứa từ từ văn bản đầu vào
        if (matchedWords.length > 0) {
          totalSentencesWithInputWords++;
        }
      }
    }

    // Bước 5: Tính plagiarism ratio cho từng document
    const matches = [];
    const allMatches = []; // Lưu tất cả matches để tính Dtotal
    const processedDocuments = new Set(); // Track processed document IDs

    for (const [documentId, matchData] of documentMatches.entries()) {
      const { documentData, matchedHashes, totalInputHashes, matchedWords, matchedSentences } = matchData;

      // Skip if document already processed (additional safety check)
      if (processedDocuments.has(documentId)) {
        console.log(`⚠️ Skipping duplicate document: ${documentData.title} (ID: ${documentId})`);
        continue;
      }

      // Tính sentence-level similarity = trung bình similarity của các câu trùng lặp
      let plagiarismRatio = 0;
      if (matchedSentences.length > 0) {
        const totalSimilarity = matchedSentences.reduce((sum, sentence) => sum + sentence.duplicateRatio, 0);
        plagiarismRatio = Math.round(totalSimilarity / matchedSentences.length);
      }

      console.log(`📊 Document "${documentData.title}": ${matchedSentences.length} duplicate sentences with average similarity = ${plagiarismRatio}%`);
      console.log(`🔤 Matched words: ${matchedWords.slice(0, 10).join(", ")}${matchedWords.length > 10 ? "..." : ""}`);
      console.log(`📝 Duplicate sentences: ${matchedSentences.length}`);

      // Tạo match object cho tất cả documents có matches
      const matchObject = {
        documentId: documentData.documentId,
        title: documentData.title,
        fileType: documentData.fileType,
        createdAt: documentData.createdAt,
        similarity: plagiarismRatio,
        matchedHashes: matchedHashes,
        totalHashes: totalInputHashes,
        matchedWords: matchedWords,
        matchedText: documentData.fullText.substring(0, 500) + "...", // Preview
        inputText: text.substring(0, 500) + "...", // Preview
        method: "sentence-level-similarity",
        source: "document-avl-tree",
        duplicateSentences: matchedSentences.length, // Số câu trùng lặp
        duplicateSentencesDetails: matchedSentences.slice(0, 5) // Chi tiết 5 câu trùng đầu tiên
      };

      // Chỉ xử lý documents có câu trùng lặp (sentence-level similarity > 0)
      if (matchedSentences.length > 0) {
        // Thêm vào allMatches để tính Dtotal
        allMatches.push(matchObject);

        // Chỉ thêm vào matches chính nếu vượt threshold
        if (plagiarismRatio >= minSimilarity) {
          console.log(`✅ Document "${documentData.title}" exceeds threshold (${plagiarismRatio}% >= ${minSimilarity}%)`);
          matches.push(matchObject);
        }
      } else {
        console.log(`⚠️ Document "${documentData.title}" has no duplicate sentences, skipping...`);
      }

      processedDocuments.add(documentId);
    }

    // Sort by plagiarism ratio (similarity)
    matches.sort((a, b) => b.similarity - a.similarity);

    // Tìm tài liệu có số lượng câu trùng lặp nhiều nhất
    let maxDuplicateSentences = 0;
    let documentWithMostDuplicates = null;

    for (const match of allMatches) {
      if (match.duplicateSentences > maxDuplicateSentences) {
        maxDuplicateSentences = match.duplicateSentences;
        documentWithMostDuplicates = {
          id: match.documentId,
          name: match.title,
          title: match.title,
          fileName: match.title, // Fallback
          duplicateSentences: match.duplicateSentences
        };
      }
    }

    // Calculate overall duplicate percentage
    const duplicatePercentage = this.calculatePlagiarismRatio(inputHashes.length, matches);

    // Tính toán Dtotal và DA/B dựa trên hash matches
    const { dtotal, dab, mostSimilarDocument } = this.calculateDtotalAndDABFromHashes(inputHashes, allMatches);

    const result = {
      duplicatePercentage,
      matches: matches,
      totalMatches: matches.length,
      checkedDocuments: this.documentTree.getSize(),
      totalDocumentsInSystem: this.documentTree.getSize(),
      sources: [...new Set(matches.map((m) => m.title))],
      confidence: duplicatePercentage > 70 ? "high" : duplicatePercentage > 30 ? "medium" : "low",
      // Thêm các thông số mới
      dtotal,
      dab,
      mostSimilarDocument,
      // Thông tin về quá trình mã hóa
      totalInputHashes: inputHashes.length,
      searchMethod: "avl-tree-word-hash-based",
      // Thêm 2 thông số theo yêu cầu
      totalSentencesWithInputWords: totalSentencesWithInputWords,
      maxDuplicateSentences: maxDuplicateSentences,
      documentWithMostDuplicates: documentWithMostDuplicates,
      // Thông tin về cặp từ
      totalUniqueWordPairs: uniqueWordPairs.size,
      totalUniqueWords: uniqueInputWords.size,
      totalDuplicateSentences: totalDuplicateSentences
    };

    console.log(`📊 Final result summary:`, {
      duplicatePercentage: result.duplicatePercentage,
      totalMatches: result.totalMatches,
      checkedDocuments: result.checkedDocuments,
      totalSentencesWithInputWords: result.totalSentencesWithInputWords,
      maxDuplicateSentences: result.maxDuplicateSentences,
      totalDuplicateSentences: result.totalDuplicateSentences
    });

    return result;
  } catch (error) {
    console.error("Error checking duplicate content:", error);
    throw error;
  }
}


  // Calculate plagiarism ratio based on hash matches
  calculatePlagiarismRatio(totalInputHashes, matches) {
    if (matches.length === 0 || totalInputHashes === 0) return 0;

    // Trả về tỷ lệ của document có similarity cao nhất (đảm bảo nhất quán)
    const highestMatch = matches[0]; // matches đã được sort theo similarity desc
    const result = highestMatch ? highestMatch.similarity : 0;

    console.log(
      `🎯 Overall duplicate percentage: ${result}% (based on highest match: ${highestMatch?.title})`
    );
    return result;
  }

  // Calculate Dtotal and DA/B from hash matches
  // Calculate Dtotal and DA/B from hash matches
  calculateDtotalAndDABFromHashes(inputHashes, matches) {
    console.log(
      `🔍 calculateDtotalAndDABFromHashes called with ${matches.length} matches`
    );

    if (matches.length === 0) {
      console.log(`⚠️ No matches found, returning dtotal=0`);
      return {
        dtotal: 0,
        dab: 0,
        mostSimilarDocument: null,
      };
    }

    // Lấy văn bản đầu vào từ match đầu tiên (tất cả matches đều có cùng inputText)
    const inputText = matches[0].inputText.replace(/\.\.\.$/, ""); // Loại bỏ dấu "..." ở cuối

    // Chia văn bản thành các câu
    const sentences = inputText
      .split(/[.!?]+/)
      .filter((sentence) => sentence.trim().length > 0);

    console.log(`📝 Input text has ${sentences.length} sentences`);

    // Tập hợp các câu trùng lặp (sử dụng Set để tránh trùng lặp)
    const duplicateSentences = new Set();

    // Tạo map từ hash đến từ để dễ dàng kiểm tra
    const hashToWordMap = new Map();
    inputHashes.forEach((hash) => {
      hashToWordMap.set(hash.hash, hash.word);
    });

    // Kiểm tra mỗi câu với các từ đã tìm thấy trong cây AVL
    sentences.forEach((sentence, sentenceIndex) => {
      // Tạo danh sách các từ trong câu
      const sentenceWords = TextHasher.createWordHashes(sentence, true);

      // Đếm số từ trong câu này đã được tìm thấy trong cây AVL
      let matchedWordsInSentence = 0;
      let totalWordsInSentence = sentenceWords.length;

      // Kiểm tra từng từ trong câu
      sentenceWords.forEach((wordHash) => {
        // Nếu từ này đã được tìm thấy trong bất kỳ document nào
        if (
          matches.some(
            (match) =>
              match.matchedWords && match.matchedWords.includes(wordHash.word)
          )
        ) {
          matchedWordsInSentence++;
        }
      });

      // Nếu tỷ lệ từ trùng lặp trong câu vượt ngưỡng (ví dụ: 50%)
      if (
        totalWordsInSentence > 0 &&
        matchedWordsInSentence / totalWordsInSentence >= 0.5
      ) {
        duplicateSentences.add(sentenceIndex);
      }
    });

    console.log(
      `🔤 Total duplicate sentences: ${duplicateSentences.size} out of ${sentences.length}`
    );

    // Sort matches by similarity để tìm document giống nhất
    const sortedMatches = [...matches].sort(
      (a, b) => b.similarity - a.similarity
    );

    // DA/B: số hash trùng với document giống nhất (document có similarity cao nhất)
    const mostSimilarMatch = sortedMatches[0];
    const dab = mostSimilarMatch ? mostSimilarMatch.matchedHashes : 0;

    const mostSimilarDocument = mostSimilarMatch
      ? {
          id: mostSimilarMatch.documentId,
          name: mostSimilarMatch.title,
          similarity: mostSimilarMatch.similarity,
        }
      : null;

    console.log(
      `🎯 Most similar document: "${mostSimilarMatch?.title}" with ${dab} matched hashes`
    );

    return {
      dtotal: duplicateSentences.size, // Số câu trùng với toàn bộ documents
      dab: dab, // Số từ trùng với document giống nhất
      mostSimilarDocument: mostSimilarDocument,
    };
  }

  // Calculate text similarity using Plagiarism Ratio formula
  calculateTextSimilarity(text1, text2) {
    const words1 = text1
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    const words2 = text2
      .toLowerCase()
      .split(/\s+/)
    // Sử dụng công thức Plagiarism Ratio: (intersection.length / set1.size) * 100%  .filter((w) => w.length > 2);

    if (words1.length === 0 || words2.length === 0) return 0;

    const set1 = new Set(words1);

    t(words2);

    const intersection = new Set([...set1].filter((x) => set2.has(x)));

    // Sử dụng công thức Plagiarism Ratio: (intersection.length / set1.size) * 100%
    return Math.round((intersection.size / set1.size) * 100);
  }

  // Calculate overall duplicate percentage
  calculateOverallDuplicatePercentage(originalText, matches) {
    if (matches.length === 0) return 0;

    // Nếu có match với similarity 100%, trả về 100%
    const perfectMatch = matches.find((match) => match.similarity >= 100);
    if (perfectMatch) return 100;

    // Nếu không có match hoàn hảo, lấy similarity cao nhất
    const highestSimilarity = Math.max(
      ...matches.map((match) => match.similarity)
    );
    return highestSimilarity;
  }

  // Tính toán Dtotal và DA/B
  calculateDtotalAndDAB(originalText, matches) {
    if (matches.length === 0) {
      return {
        dtotal: 0,
        dab: 0,
        mostSimilarDocument: null,
      };
    }

    // Tách câu từ văn bản gốc
    const originalSentences = originalText
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    // Tính Dtotal: số câu duy nhất trùng với toàn bộ CSDL
    const uniqueMatchedSentences = new Set();

    // Tìm document có similarity cao nhất
    let mostSimilarMatch = null;
    let highestSimilarity = 0;

    matches.forEach((match) => {
      // Thêm câu vào set để tính Dtotal (tránh trùng lặp)
      const matchSentences = match.matchedText
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10);

      // So sánh từng câu trong văn bản gốc với câu trong match
      originalSentences.forEach((origSentence) => {
        matchSentences.forEach((matchSentence) => {
          const similarity = this.calculateTextSimilarity(
            origSentence,
            matchSentence
          );
          if (similarity >= 50) {
            // Threshold 50% để coi là trùng
            uniqueMatchedSentences.add(origSentence.toLowerCase());
          }
        });
      });

      // Tìm document có similarity cao nh  ất cho DA/B
      if (match.similarity > highestSimilarity) {
        highestSimilarity = match.similarity;
        mostSimilarMatch = match;
      }
    });

    // Tính DA/B: số câu trùng với document giống nhất
    let dab = 0;
    let mostSimilarDocument = null;

    if (mostSimilarMatch) {
      const mostSimilarSentences = mostSimilarMatch.matchedText
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 10);

      // Đếm số câu trong văn bản gốc trùng với document giống nhất
      const matchedWithMostSimilar = new Set();

      originalSentences.forEach((origSentence) => {
        mostSimilarSentences.forEach((simSentence) => {
          const similarity = this.calculateTextSimilarity(
            origSentence,
            simSentence
          );
          if (similarity >= 50) {
            // Threshold 50%
            matchedWithMostSimilar.add(origSentence.toLowerCase());
          }
        });
      });

      dab = matchedWithMostSimilar.size;

      mostSimilarDocument = {
        id: mostSimilarMatch.documentId,
        name: mostSimilarMatch.title,
        similarity: mostSimilarMatch.similarity,
      };
    }

    return {
      dtotal: uniqueMatchedSentences.size,
      dab: dab,
      mostSimilarDocument: mostSimilarDocument,
    };
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
