const { TreeAVL, TextHasher } = require('../utils/TreeAVL');
const Document = require('../models/Document');

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
      
      // Create chunks from document text
      const chunks = TextHasher.createChunkHashes(document.extractedText, 50);
      
      // Store document metadata with chunks
      const documentData = {
        documentId: document._id,
        title: document.title,
        fileType: document.fileType,
        createdAt: document.createdAt,
        uploadedBy: document.uploadedBy,
        textLength: document.extractedText.length,
        wordCount: document.extractedText.split(/\s+/).length,
        chunks: chunks,
        fullText: document.extractedText
      };

      // Insert into tree using composite sort key
      this.documentTree.insert(sortKey, documentData);
      
      console.log(`Added document "${document.title}" to AVL tree`);
      
      // Return AVL tree data for saving to database
      return this.generateAVLTreeData(document, sortKey, chunks);
      
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
      
      // Create chunks from document text
      const chunks = TextHasher.createChunkHashes(document.extractedText, 50);
      
      // Store document metadata with chunks
      const documentData = {
        documentId: document._id,
        title: document.title,
        fileType: document.fileType,
        createdAt: document.createdAt,
        uploadedBy: document.uploadedBy,
        textLength: document.extractedText.length,
        wordCount: document.extractedText.split(/\s+/).length,
        chunks: chunks,
        fullText: document.extractedText
      };

      // Insert into tree using composite sort key
      this.documentTree.insert(sortKey, documentData);
      
      console.log(`Added document "${document.title}" to AVL tree`);
      
    } catch (error) {
      console.error(`Error adding document ${document._id} to tree:`, error);
    }
  }

  // Generate AVL tree data as hash vector for database storage
  generateAVLTreeData(document, sortKey, chunks) {
    try {
      // Create hash vector representation of the document's position in AVL tree
      const avlTreeData = {
        sortKey: sortKey,
        hashVector: chunks.map(chunk => ({
          hash: chunk.hash,
          position: chunk.startIndex,
          length: chunk.endIndex - chunk.startIndex + 1
        })),
        treeMetadata: {
          documentId: document._id,
          insertedAt: new Date(),
          textLength: document.extractedText.length,
          chunkCount: chunks.length,
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

  // Check for duplicate content
  async checkDuplicateContent(text, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      minSimilarity = 70,
      chunkSize = 50,
      maxResults = 10
    } = options;

    try {
      // Create chunks from input text
      const inputChunks = TextHasher.createChunkHashes(text, chunkSize);
      const matches = [];
      const processedDocs = new Set();

      // Search for each chunk in the tree
      for (const inputChunk of inputChunks) {
        const allNodes = this.documentTree.getAllNodes();
        
        for (const node of allNodes) {
          const docData = node.data;
          
          // Skip if already processed this document
          if (processedDocs.has(docData.documentId.toString())) {
            continue;
          }

          // Check chunks for similarity
          for (const docChunk of docData.chunks) {
            const similarity = this.calculateTextSimilarity(inputChunk.text, docChunk.text);
            
            if (similarity >= minSimilarity) {
              matches.push({
                documentId: docData.documentId,
                title: docData.title,
                fileType: docData.fileType,
                createdAt: docData.createdAt,
                similarity: similarity,
                matchedText: docChunk.text,
                inputText: inputChunk.text,
                matchPosition: {
                  start: docChunk.startIndex,
                  end: docChunk.endIndex
                }
              });

              processedDocs.add(docData.documentId.toString());
              break; // Found match in this document, move to next
            }
          }
        }
      }

      // Sort by similarity and limit results
      matches.sort((a, b) => b.similarity - a.similarity);
      const topMatches = matches.slice(0, maxResults);

      // Calculate overall duplicate percentage
      const duplicatePercentage = this.calculateOverallDuplicatePercentage(text, topMatches);

      // Tính toán Dtotal và DA/B
      const { dtotal, dab, mostSimilarDocument } = this.calculateDtotalAndDAB(text, topMatches);

      return {
        duplicatePercentage,
        matches: topMatches,
        totalMatches: matches.length,
        checkedDocuments: this.documentTree.getSize(),
        sources: [...new Set(topMatches.map(m => m.title))],
        // Thêm các thông số mới
        dtotal,
        dab,
        mostSimilarDocument
      };

    } catch (error) {
      console.error('Error checking duplicate content:', error);
      throw error;
    }
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

    const originalWords = originalText.split(/\s+/).length;
    let duplicateWords = 0;

    // Count unique duplicate words to avoid double counting
    const duplicateWordSet = new Set();
    
    for (const match of matches) {
      const matchWords = match.inputText.split(/\s+/);
      matchWords.forEach(word => {
        if (word.length > 2) {
          duplicateWordSet.add(word.toLowerCase());
        }
      });
    }

    duplicateWords = duplicateWordSet.size;
    
    return Math.min(Math.round((duplicateWords / originalWords) * 100), 100);
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
          if (similarity >= 70) { // Threshold 70% để coi là trùng
            uniqueMatchedSentences.add(origSentence.toLowerCase());
          }
        });
      });

      // Tìm document có similarity cao nhất cho DA/B
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
          if (similarity >= 70) { // Threshold 70%
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