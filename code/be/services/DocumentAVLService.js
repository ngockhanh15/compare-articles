const { TreeAVL, TextHasher } = require('../utils/TreeAVL');
const Document = require('../models/Document');
const vietnameseStopwordService = require('./VietnameseStopwordService');

class DocumentAVLService {
  constructor() {
    this.documentTree = new TreeAVL();
    this.initialized = false;
  }

  // Initialize tree with existing documents
  async initialize() {
    if (this.initialized) return;

    try {
      console.log('Initializing Document AVL Tree...');
      
      // Initialize Vietnamese stopword service first
      if (!vietnameseStopwordService.initialized) {
        console.log('Initializing Vietnamese Stopword Service...');
        await vietnameseStopwordService.initialize();
      }
      
      // Load all processed documents from database
      const documents = await Document.find({ 
        status: 'processed',
        extractedText: { $exists: true, $ne: '' }
      }).select('_id title fileType extractedText createdAt uploadedBy');

      console.log(`Loading ${documents.length} documents into AVL tree...`);

      for (const doc of documents) {
        // Only add to tree, don't regenerate AVL tree data if it already exists
        await this.addDocumentToTreeOnly(doc);
      }

      this.initialized = true;
      console.log(`Document AVL Tree initialized with ${this.documentTree.getSize()} entries`);
      
    } catch (error) {
      console.error('Error initializing Document AVL Tree:', error);
      throw error;
    }
  }

  // Add document to AVL tree
  async addDocumentToTree(document) {
    try {
      if (!document.extractedText || document.extractedText.trim().length === 0) {
        return;
      }

      // Create composite key for sorting: fileType + createdAt + _id
      const sortKey = this.createSortKey(document);
      
      // Create word hashes from document text (using new method)
      const wordHashes = TextHasher.createWordHashes(document.extractedText, true);
      
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
        sortKey: sortKey
      };

      // Insert each word hash into tree (not the sortKey!)
      for (const wordHash of wordHashes) {
        this.documentTree.insert(wordHash.hash, documentData);
      }
      
      console.log(`Added document "${document.title}" to AVL tree with ${wordHashes.length} word hashes`);
      
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
      if (!document.extractedText || document.extractedText.trim().length === 0) {
        return;
      }

      // Create composite key for sorting: fileType + createdAt + _id
      const sortKey = this.createSortKey(document);
      
      // Create word hashes from document text (using new method)
      const wordHashes = TextHasher.createWordHashes(document.extractedText, true);
      
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
        sortKey: sortKey
      };

      // Insert each word hash into tree (not the sortKey!)
      for (const wordHash of wordHashes) {
        this.documentTree.insert(wordHash.hash, documentData);
      }
      
      console.log(`Added document "${document.title}" to AVL tree with ${wordHashes.length} word hashes`);
      
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
        hashVector: wordHashes.map(wordHash => ({
          hash: wordHash.hash,
          word: wordHash.word,
          index: wordHash.index,
          method: wordHash.method
        })),
        treeMetadata: {
          documentId: document._id,
          insertedAt: new Date(),
          textLength: document.extractedText.length,
          wordCount: wordHashes.length,
          fileTypeWeight: this.getFileTypeWeight(document.fileType)
        }
      };

      return avlTreeData;
    } catch (error) {
      console.error('Error generating AVL tree data:', error);
      return null;
    }
  }

  // Create composite sort key: fileType + timestamp + id
  createSortKey(document) {
    const fileTypeWeight = this.getFileTypeWeight(document.fileType);
    const timestamp = new Date(document.createdAt).getTime();
    const idHash = document._id.toString().slice(-8); // Last 8 chars of ID
    
    // Format: fileTypeWeight-timestamp-idHash
    return `${fileTypeWeight.toString().padStart(2, '0')}-${timestamp}-${idHash}`;
  }

  // Assign weights to file types for sorting
  getFileTypeWeight(fileType) {
    const weights = {
      'pdf': 1,
      'docx': 2,
      'doc': 3,
      'txt': 4,
      'xlsx': 5,
      'xls': 6,
      'pptx': 7,
      'ppt': 8
    };
    return weights[fileType] || 9;
  }

  // Check for duplicate content using AVL tree with hash-based plagiarism detection
  async checkDuplicateContent(text, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    // Ensure Vietnamese stopword service is initialized
    if (!vietnameseStopwordService.initialized) {
      await vietnameseStopwordService.initialize();
    }

    const {
      minSimilarity = 50,
      chunkSize = 2,
      maxResults = 10
    } = options;

    try {
      console.log(`🔍 Starting plagiarism check using AVL tree...`);
      console.log(`📝 Input text length: ${text.length} characters`);

      // Bước 1: Mã hóa văn bản input thành word hashes
      const inputHashes = TextHasher.createWordHashes(text, true);
      console.log(`🔢 Generated ${inputHashes.length} word hashes from input text`);

      // Bước 2: Tìm kiếm các hash trong cây AVL
      const documentMatches = new Map(); // documentId -> {matches, totalHashes}
      let totalSearches = 0;

      for (const wordHash of inputHashes) {
        totalSearches++;
        const foundNode = this.documentTree.search(wordHash.hash);
        
        if (foundNode) {
          const docData = foundNode.data;
          console.log(`✅ Word hash match found: "${wordHash.word}" in document: ${docData.title}`);
          
          if (!documentMatches.has(docData.documentId)) {
            documentMatches.set(docData.documentId, {
              documentData: docData,
              matchedHashes: 0,
              totalInputHashes: inputHashes.length,
              matchedWords: []
            });
          }
          
          const matchData = documentMatches.get(docData.documentId);
          matchData.matchedHashes++;
          matchData.matchedWords.push(wordHash.word);
        }
      }

      console.log(`🔍 Searched ${totalSearches} hashes, found matches in ${documentMatches.size} documents`);

      // Bước 3: Tính plagiarism ratio cho từng document
      const matches = [];
      
      for (const [documentId, matchData] of documentMatches) {
        const { documentData, matchedHashes, totalInputHashes, matchedWords } = matchData;
        
        // Tính plagiarism ratio = (số hash trùng / tổng số hash input) * 100
        const plagiarismRatio = Math.round((matchedHashes / totalInputHashes) * 100);
        
        console.log(`📊 Document "${documentData.title}": ${matchedHashes}/${totalInputHashes} word hashes matched = ${plagiarismRatio}%`);
        console.log(`🔤 Matched words: ${matchedWords.slice(0, 10).join(', ')}${matchedWords.length > 10 ? '...' : ''}`);
        
        if (plagiarismRatio >= minSimilarity) {
          console.log(`✅ Document "${documentData.title}" exceeds threshold (${plagiarismRatio}% >= ${minSimilarity}%)`);
          
          matches.push({
            documentId: documentData.documentId,
            title: documentData.title,
            fileType: documentData.fileType,
            createdAt: documentData.createdAt,
            similarity: plagiarismRatio,
            matchedHashes: matchedHashes,
            totalHashes: totalInputHashes,
            matchedWords: matchedWords,
            matchedText: documentData.fullText.substring(0, 500) + '...', // Preview
            inputText: text.substring(0, 500) + '...', // Preview
            method: 'avl-word-hash-based',
            source: 'document-avl-tree'
          });
        }
      }

      // Sort by plagiarism ratio (similarity)
      matches.sort((a, b) => b.similarity - a.similarity);
      
      console.log(`📋 Final results: ${matches.length} documents with similarity >= ${minSimilarity}%`);

      // Calculate overall duplicate percentage
      const duplicatePercentage = this.calculatePlagiarismRatio(inputHashes.length, matches);

      // Tính toán Dtotal và DA/B dựa trên hash matches
      const { dtotal, dab, mostSimilarDocument } = this.calculateDtotalAndDABFromHashes(inputHashes, matches);

      return {
        duplicatePercentage,
        matches: matches,
        totalMatches: matches.length,
        checkedDocuments: this.documentTree.getSize(),
        totalDocumentsInSystem: this.documentTree.getSize(),
        sources: [...new Set(matches.map(m => m.title))],
        confidence: duplicatePercentage > 70 ? 'high' : duplicatePercentage > 30 ? 'medium' : 'low',
        // Thêm các thông số mới
        dtotal,
        dab,
        mostSimilarDocument,
        // Thông tin về quá trình mã hóa
        totalInputHashes: inputHashes.length,
        searchMethod: 'avl-tree-word-hash-based'
      };

    } catch (error) {
      console.error('Error checking duplicate content:', error);
      throw error;
    }
  }

  // Calculate plagiarism ratio based on hash matches
  calculatePlagiarismRatio(totalInputHashes, matches) {
    if (matches.length === 0 || totalInputHashes === 0) return 0;

    // Trả về tỷ lệ của document có similarity cao nhất (đảm bảo nhất quán)
    const highestMatch = matches[0]; // matches đã được sort theo similarity desc
    const result = highestMatch ? highestMatch.similarity : 0;
    
    console.log(`🎯 Overall duplicate percentage: ${result}% (based on highest match: ${highestMatch?.title})`);
    return result;
  }

  // Calculate Dtotal and DA/B from hash matches
  calculateDtotalAndDABFromHashes(inputHashes, matches) {
    if (matches.length === 0) {
      return {
        dtotal: 0,
        dab: 0,
        mostSimilarDocument: null
      };
    }

    // Dtotal: tổng số hash unique trùng với toàn bộ documents
    const uniqueMatchedHashes = new Set();
    
    matches.forEach(match => {
      // Giả sử mỗi match có số hash trùng
      for (let i = 0; i < match.matchedHashes; i++) {
        uniqueMatchedHashes.add(`${match.documentId}_${i}`); // Tạo unique identifier
      }
    });

    // DA/B: số hash trùng với document giống nhất
    const mostSimilarMatch = matches[0]; // Document có similarity cao nhất
    const dab = mostSimilarMatch ? mostSimilarMatch.matchedHashes : 0;

    const mostSimilarDocument = mostSimilarMatch ? {
      id: mostSimilarMatch.documentId,
      name: mostSimilarMatch.title,
      similarity: mostSimilarMatch.similarity
    } : null;

    return {
      dtotal: uniqueMatchedHashes.size,
      dab: dab,
      mostSimilarDocument: mostSimilarDocument
    };
  }

  // Calculate text similarity using simple word matching
  calculateTextSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;

    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return Math.round((intersection.size / union.size) * 100);
  }

  // Calculate overall duplicate percentage
  calculateOverallDuplicatePercentage(originalText, matches) {
    if (matches.length === 0) return 0;

    // Nếu có match với similarity 100%, trả về 100%
    const perfectMatch = matches.find(match => match.similarity >= 100);
    if (perfectMatch) return 100;

    // Nếu không có match hoàn hảo, lấy similarity cao nhất
    const highestSimilarity = Math.max(...matches.map(match => match.similarity));
    return highestSimilarity;
  }

  // Tính toán Dtotal và DA/B
  calculateDtotalAndDAB(originalText, matches) {
    if (matches.length === 0) {
      return {
        dtotal: 0,
        dab: 0,
        mostSimilarDocument: null
      };
    }

    // Tách câu từ văn bản gốc
    const originalSentences = originalText.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);

    // Tính Dtotal: số câu duy nhất trùng với toàn bộ CSDL
    const uniqueMatchedSentences = new Set();
    
    // Tìm document có similarity cao nhất
    let mostSimilarMatch = null;
    let highestSimilarity = 0;

    matches.forEach(match => {
      // Thêm câu vào set để tính Dtotal (tránh trùng lặp)
      const matchSentences = match.matchedText.split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 10);

      // So sánh từng câu trong văn bản gốc với câu trong match
      originalSentences.forEach(origSentence => {
        matchSentences.forEach(matchSentence => {
          const similarity = this.calculateTextSimilarity(origSentence, matchSentence);
          if (similarity >= 50) { // Threshold 50% để coi là trùng
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
      const mostSimilarSentences = mostSimilarMatch.matchedText.split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 10);

      // Đếm số câu trong văn bản gốc trùng với document giống nhất
      const matchedWithMostSimilar = new Set();
      
      originalSentences.forEach(origSentence => {
        mostSimilarSentences.forEach(simSentence => {
          const similarity = this.calculateTextSimilarity(origSentence, simSentence);
          if (similarity >= 50) { // Threshold 50%
            matchedWithMostSimilar.add(origSentence.toLowerCase());
          }
        });
      });

      dab = matchedWithMostSimilar.size;

      mostSimilarDocument = {
        id: mostSimilarMatch.documentId,
        name: mostSimilarMatch.title,
        similarity: mostSimilarMatch.similarity
      };
    }

    return {
      dtotal: uniqueMatchedSentences.size,
      dab: dab,
      mostSimilarDocument: mostSimilarDocument
    };
  }

  // Get tree statistics
  getTreeStats() {
    if (!this.initialized) {
      return {
        totalDocuments: 0,
        treeSize: 0,
        initialized: false
      };
    }

    const allNodes = this.documentTree.getAllNodes();
    const fileTypeStats = {};
    
    allNodes.forEach(node => {
      const fileType = node.data.fileType;
      fileTypeStats[fileType] = (fileTypeStats[fileType] || 0) + 1;
    });

    return {
      totalDocuments: this.documentTree.getSize(),
      treeSize: this.documentTree.getSize(),
      initialized: this.initialized,
      fileTypeDistribution: fileTypeStats
    };
  }

  // Remove document from tree (when document is deleted)
  async removeDocumentFromTree(documentId) {
    try {
      // Since AVL tree doesn't have direct delete by value,
      // we need to rebuild the tree without this document
      const allNodes = this.documentTree.getAllNodes();
      const filteredNodes = allNodes.filter(node => 
        node.data.documentId.toString() !== documentId.toString()
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