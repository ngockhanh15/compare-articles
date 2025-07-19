const PlagiarismCheck = require('../models/PlagiarismCheck');
const plagiarismCacheService = require('../services/PlagiarismCacheService');
const plagiarismDetectionService = require('../services/PlagiarismDetectionService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // Ensure uploads directory exists
    if (!fsSync.existsSync(uploadDir)) {
      fsSync.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword' // .doc
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file định dạng TXT, DOC, DOCX và PDF'), false);
    }
  }
});

// Real plagiarism checking using TreeAVL and database comparison
const performPlagiarismCheck = async (text, options = {}) => {
  const startTime = Date.now();
  
  try {
    // 1. Kiểm tra cache trước (để tăng tốc độ)
    const cachedResult = plagiarismCacheService.findCachedResult(text);
    
    if (cachedResult && cachedResult.type === 'exact') {
      console.log('Cache hit: exact match found');
      return {
        ...cachedResult.data.result,
        fromCache: true,
        cacheType: 'exact',
        processingTime: Date.now() - startTime
      };
    }
    
    // 2. Thực hiện kiểm tra plagiarism thật sự với cây AVL
    console.log('Performing real plagiarism check using AVL tree...');
    const result = await plagiarismDetectionService.checkPlagiarism(text, options);
    
    // 3. Kết hợp với cache để tối ưu hóa (word-based)
    const similarWords = plagiarismCacheService.findSimilarWords(text, 0.5);
    
    // Nếu có similar words từ cache, thêm vào kết quả
    if (similarWords.length > 0) {
      console.log(`Found ${similarWords.length} similar word patterns in cache`);
      
      similarWords.slice(0, 2).forEach((wordMatch, index) => {
        if (wordMatch.similarity >= 50) {
          // Kiểm tra xem match này đã có chưa để tránh duplicate
          const existingMatch = result.matches.find(m => 
            m.url && m.url.includes(wordMatch.fullHash)
          );
          
          if (!existingMatch) {
            result.matches.push({
              text: wordMatch.matchedText,
              source: `cached-database-${index + 1}`,
              similarity: wordMatch.similarity,
              url: `internal://cached/${wordMatch.fullHash}`,
              matchedWords: wordMatch.matchedWords.length,
              wordMatches: wordMatch.matchedWords.map(w => w.original).join(', '),
              fromCache: true,
              method: 'word-based-cache'
            });
          }
        }
      });
      
      // Cập nhật sources
      const cacheSource = 'cached-database';
      if (!result.sources.includes(cacheSource)) {
        result.sources.push(cacheSource);
      }
      
      // Điều chỉnh duplicate percentage nếu cần
      if (similarWords.length > 0) {
        const avgCacheSimilarity = similarWords.reduce((sum, wordMatch) => sum + wordMatch.similarity, 0) / similarWords.length;
        result.duplicatePercentage = Math.max(result.duplicatePercentage, Math.floor(avgCacheSimilarity * 0.9));
      }
    }
    
    // 4. Cập nhật confidence dựa trên kết quả cuối cùng
    if (result.duplicatePercentage >= 50) {
      result.confidence = 'high';
    } else if (result.duplicatePercentage >= 25) {
      result.confidence = 'medium';
    } else {
      result.confidence = 'low';
    }
    
    // 5. Cache kết quả mới để sử dụng cho lần sau
    plagiarismCacheService.cacheResult(text, result);
    
    // 6. Cập nhật processing time
    result.processingTime = Date.now() - startTime;
    result.fromCache = false;
    result.cacheOptimized = similarWords.length > 0;
    result.similarWordsFound = similarWords.length;
    
    console.log(`Plagiarism check completed: ${result.duplicatePercentage}% duplicate found in ${result.processingTime}ms`);
    
    return result;
    
  } catch (error) {
    console.error('Error in plagiarism check:', error);
    
    // Fallback: trả về kết quả cơ bản nếu có lỗi
    return {
      duplicatePercentage: 0,
      matches: [],
      sources: [],
      confidence: 'low',
      processingTime: Date.now() - startTime,
      fromCache: false,
      error: 'Error occurred during plagiarism check',
      errorDetails: error.message
    };
  }
};

// Extract text from uploaded file
const extractTextFromFile = async (filePath, fileType) => {
  try {
    switch (fileType) {
      case 'text/plain':
        return await fs.readFile(filePath, 'utf8');
        
      case 'application/pdf':
        const pdfBuffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        return pdfData.text;
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': // .docx
        const docxResult = await mammoth.extractRawText({ path: filePath });
        return docxResult.value;
        
      case 'application/msword': // .doc
        // Mammoth cũng có thể đọc .doc nhưng không hoàn hảo
        try {
          const docResult = await mammoth.extractRawText({ path: filePath });
          return docResult.value;
        } catch (docError) {
          throw new Error('File .doc này có thể không được hỗ trợ đầy đủ. Vui lòng chuyển đổi sang .docx hoặc .pdf');
        }
        
      default:
        throw new Error(`Định dạng file ${fileType} chưa được hỗ trợ. Hiện tại hỗ trợ: TXT, DOC, DOCX, PDF`);
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    
    // Nếu là lỗi từ việc xử lý file cụ thể, throw lại message gốc
    if (error.message.includes('không được hỗ trợ') || error.message.includes('chưa được hỗ trợ')) {
      throw error;
    }
    
    // Lỗi chung
    throw new Error(`Không thể đọc nội dung file ${fileType}. Vui lòng kiểm tra file có bị hỏng không.`);
  }
};

// Upload file and extract text
exports.uploadFile = [
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file được upload'
        });
      }

      const filePath = req.file.path;
      const fileType = req.file.mimetype;
      
      // Extract text from file
      const extractedText = await extractTextFromFile(filePath, fileType);
      
      // Xóa file ngay sau khi extract text thành công
      await fs.unlink(filePath);
      
      res.json({
        success: true,
        extractedText,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: fileType
      });
      
    } catch (error) {
      console.error('File upload error:', error);
      
      // Clean up file if exists and there was an error
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      }
      
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi xử lý file'
      });
    }
  }
];

// Check plagiarism
exports.checkPlagiarism = async (req, res) => {
  try {
    const { text, options = {}, fileName, fileType } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Văn bản không được để trống'
      });
    }
    
    // Perform plagiarism check
    const result = await performPlagiarismCheck(text, options);
    
    // Determine status based on duplicate percentage
    const getStatus = (percentage) => {
      if (percentage >= 50) return 'high';
      if (percentage >= 25) return 'medium';
      return 'low';
    };

    // Save plagiarism check to database
    const plagiarismCheck = new PlagiarismCheck({
      user: req.user.id,
      originalText: text,
      textLength: text.length,
      wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
      duplicatePercentage: result.duplicatePercentage,
      matches: result.matches || [],
      sources: result.sources || [],
      confidence: result.confidence,
      status: getStatus(result.duplicatePercentage),
      source: fileName ? 'file' : 'text',
      fileName: fileName || null,
      fileType: fileType || null,
      processingTime: result.processingTime,
      options: {
        checkInternet: options.checkInternet !== false,
        checkDatabase: options.checkDatabase !== false,
        sensitivity: options.sensitivity || 'medium',
        language: options.language || 'vi'
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await plagiarismCheck.save();

    res.json({
      success: true,
      checkId: plagiarismCheck._id,
      result: {
        duplicatePercentage: result.duplicatePercentage,
        matches: result.matches,
        sources: result.sources,
        confidence: result.confidence,
        textLength: text.length,
        wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
        processingTime: result.processingTime,
        totalMatches: result.matches ? result.matches.length : 0,
        checkedDocuments: result.totalDocumentsChecked || 0,
        // Thêm các thông số mới
        dtotal: result.dtotal || 0,
        dab: result.dab || 0,
        mostSimilarDocument: result.mostSimilarDocument || null
      }
    });
    
  } catch (error) {
    console.error('Plagiarism check error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra trùng lặp'
    });
  }
};

// Get plagiarism history
exports.getPlagiarismHistory = async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    const userId = req.user.id;
    
    const checks = await PlagiarismCheck.find({ user: userId })
      .select('originalText duplicatePercentage status source fileName createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));
    
    const total = await PlagiarismCheck.countDocuments({ user: userId });
    
    res.json({
      success: true,
      history: checks.map(check => ({
        id: check._id,
        text: check.originalText.substring(0, 100) + (check.originalText.length > 100 ? '...' : ''),
        duplicatePercentage: check.duplicatePercentage,
        status: check.status,
        source: check.source,
        fileName: check.fileName,
        checkedAt: check.createdAt
      })),
      total,
      hasMore: offset + limit < total
    });
    
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử kiểm tra'
    });
  }
};

// Get user statistics
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await PlagiarismCheck.getUserStats(userId);
    const totalChecks = await PlagiarismCheck.countDocuments({ user: userId });
    
    res.json({
      success: true,
      totalChecks,
      stats: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          avgDuplicateRate: Math.round(stat.avgDuplicateRate * 100) / 100,
          totalWords: stat.totalWords,
          totalChars: stat.totalChars
        };
        return acc;
      }, {})
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê'
    });
  }
};

// Get list of uploaded files
exports.getUploadedFiles = async (req, res) => {
  try {
    const Document = require('../models/Document');
    
    const {
      page = 1,
      limit = 10,
      search = '',
      fileType = 'all',
      status = 'all'
    } = req.query;

    const query = { uploadedBy: req.user.id };

    // Add search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { originalFileName: { $regex: search, $options: 'i' } }
      ];
    }

    // Add file type filter
    if (fileType !== 'all') {
      query.fileType = fileType;
    }

    // Add status filter
    if (status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const documents = await Document.find(query)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Document.countDocuments(query);

    const files = documents.map(doc => ({
      _id: doc._id,
      title: doc.title,
      fileName: doc.originalFileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      uploadedBy: {
        name: doc.uploadedBy.name,
        email: doc.uploadedBy.email
      },
      uploadedAt: doc.createdAt,
      checkCount: doc.checkCount,
      lastChecked: doc.lastChecked,
      downloadCount: doc.downloadCount,
      status: doc.status
    }));

    res.json({
      success: true,
      files,
      total,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    });
    
  } catch (error) {
    console.error('Get uploaded files error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách file'
    });
  }
};

// Get plagiarism detection system statistics
exports.getSystemStats = async (req, res) => {
  try {
    const detectionStats = plagiarismDetectionService.getStats();
    const cacheStats = plagiarismCacheService.getCacheStats();
    
    res.json({
      success: true,
      detectionSystem: detectionStats,
      cacheSystem: cacheStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê hệ thống'
    });
  }
};

// Initialize plagiarism detection system
exports.initializeSystem = async (req, res) => {
  try {
    await plagiarismDetectionService.reset();
    await plagiarismDetectionService.initialize();
    
    const stats = plagiarismDetectionService.getStats();
    
    res.json({
      success: true,
      message: 'Hệ thống plagiarism detection đã được khởi tạo lại',
      stats: stats
    });
    
  } catch (error) {
    console.error('Initialize system error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi khởi tạo hệ thống'
    });
  }
};

// Get cache statistics
exports.getCacheStats = async (req, res) => {
  try {
    const stats = plagiarismCacheService.getCacheStats();
    
    res.json({
      success: true,
      cacheStats: stats
    });
    
  } catch (error) {
    console.error('Get cache stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê cache'
    });
  }
};

// Find similar texts in cache
exports.findSimilarTexts = async (req, res) => {
  try {
    const { text, threshold = 0.8 } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Văn bản không được để trống'
      });
    }
    
    const similarChunks = plagiarismCacheService.findSimilarChunks(text, threshold);
    
    res.json({
      success: true,
      similarChunks: similarChunks,
      total: similarChunks.length,
      threshold: threshold
    });
    
  } catch (error) {
    console.error('Find similar texts error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tìm kiếm văn bản tương tự'
    });
  }
};

// Clear all cache
exports.clearCache = async (req, res) => {
  try {
    const result = plagiarismCacheService.clearAllCache();
    
    res.json({
      success: true,
      message: 'Đã xóa toàn bộ cache',
      result: result
    });
    
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa cache'
    });
  }
};

// Get detailed comparison with most similar document
exports.getDetailedComparison = async (req, res) => {
  try {
    const { checkId } = req.params;
    const userId = req.user.id;
    
    const plagiarismCheck = await PlagiarismCheck.findOne({ 
      _id: checkId, 
      user: userId 
    });
    
    if (!plagiarismCheck) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy kết quả kiểm tra'
      });
    }
    
    // Tìm document tương tự nhất trong cây AVL
    const similarChunks = plagiarismCacheService.findSimilarChunks(
      plagiarismCheck.originalText, 
      0.7
    );
    
    // Tìm document giống nhất từ database thực tế
    const Document = require('../models/Document');
    let mostSimilarDocument = null;
    let mostSimilarContent = '';
    let overallSimilarity = plagiarismCheck.duplicatePercentage || 0;
    
    // Tìm document có nội dung tương tự nhất
    if (similarChunks.length > 0) {
      const topChunk = similarChunks.reduce((prev, current) => 
        (prev.similarity > current.similarity) ? prev : current
      );
      
      overallSimilarity = Math.max(overallSimilarity, Math.round(topChunk.similarity));
      mostSimilarContent = topChunk.matchedChunk.text;
      
      // Tạo thông tin document từ cache
      mostSimilarDocument = {
        fileName: `document-${topChunk.matchedChunk.fullHash.substring(0, 8)}.txt`,
        fileSize: topChunk.matchedChunk.text.length,
        fileType: 'text/plain',
        author: 'Hệ thống',
        uploadedAt: new Date()
      };
    } else {
      // Tìm document thực tế từ database nếu không có similar chunks
      try {
        const documents = await Document.find({ status: 'processed' })
          .limit(10)
          .sort({ createdAt: -1 })
          .populate('uploadedBy', 'name');
        
        if (documents.length > 0) {
          // Tìm document có nội dung tương tự nhất bằng cách so sánh từ khóa
          let bestMatch = null;
          let bestSimilarity = 0;
          
          const originalWords = plagiarismCheck.originalText.toLowerCase().split(/\s+/);
          const originalWordSet = new Set(originalWords);
          
          for (const doc of documents) {
            if (doc.extractedText && doc.extractedText.length > 100) {
              const docWords = doc.extractedText.toLowerCase().split(/\s+/);
              const docWordSet = new Set(docWords);
              
              // Tính similarity dựa trên số từ chung
              const intersection = new Set([...originalWordSet].filter(x => docWordSet.has(x)));
              const union = new Set([...originalWordSet, ...docWordSet]);
              const similarity = (intersection.size / union.size) * 100;
              
              if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = doc;
              }
            }
          }
          
          if (bestMatch) {
            mostSimilarDocument = {
              fileName: bestMatch.originalFileName,
              fileSize: bestMatch.fileSize,
              fileType: bestMatch.mimeType,
              author: bestMatch.uploadedBy?.name || 'Unknown',
              uploadedAt: bestMatch.createdAt
            };
            mostSimilarContent = bestMatch.extractedText;
            overallSimilarity = Math.max(overallSimilarity, Math.round(bestSimilarity));
          }
        }
      } catch (docError) {
        console.error('Error finding similar documents:', docError);
      }
    }
    
    // Tạo detailed matches từ dữ liệu thực tế
    const detailedMatches = [];
    
    // Thêm matches từ plagiarism check
    if (plagiarismCheck.matches && plagiarismCheck.matches.length > 0) {
      plagiarismCheck.matches.forEach((match, index) => {
        const originalTextLower = plagiarismCheck.originalText.toLowerCase();
        const matchTextLower = match.text.toLowerCase();
        const startIndex = originalTextLower.indexOf(matchTextLower);
        
        detailedMatches.push({
          id: `match-${index + 1}`,
          originalText: match.text,
          matchedText: match.text,
          similarity: match.similarity || 85,
          source: match.source,
          url: match.url,
          startPosition: startIndex >= 0 ? startIndex : 0,
          endPosition: startIndex >= 0 ? startIndex + match.text.length : match.text.length
        });
      });
    }
    
    // Thêm matches từ similar chunks
    if (similarChunks.length > 0) {
      similarChunks.slice(0, 5).forEach((chunk, index) => {
        const originalTextLower = plagiarismCheck.originalText.toLowerCase();
        const chunkTextLower = chunk.originalChunk.text.toLowerCase();
        const startIndex = originalTextLower.indexOf(chunkTextLower);
        
        if (startIndex >= 0) {
          detailedMatches.push({
            id: `cache-match-${index + 1}`,
            originalText: chunk.originalChunk.text,
            matchedText: chunk.matchedChunk.text,
            similarity: Math.round(chunk.similarity),
            source: 'database-cache',
            url: `internal://cache/${chunk.matchedChunk.fullHash}`,
            startPosition: startIndex,
            endPosition: startIndex + chunk.originalChunk.text.length
          });
        }
      });
    } else if (mostSimilarContent && mostSimilarContent.length > 100) {
      // Tạo matches thực tế bằng cách tìm đoạn văn tương tự
      const originalText = plagiarismCheck.originalText;
      const originalSentences = originalText.split(/[.!?]+/).filter(s => s.trim().length > 20);
      const similarSentences = mostSimilarContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
      
      originalSentences.forEach((origSentence, origIndex) => {
        const origWords = origSentence.toLowerCase().trim().split(/\s+/);
        if (origWords.length < 5) return; // Skip short sentences
        
        let bestMatch = null;
        let bestSimilarity = 0;
        
        similarSentences.forEach((simSentence, simIndex) => {
          const simWords = simSentence.toLowerCase().trim().split(/\s+/);
          if (simWords.length < 5) return;
          
          // Tính similarity giữa hai câu
          const origWordSet = new Set(origWords);
          const simWordSet = new Set(simWords);
          const intersection = new Set([...origWordSet].filter(x => simWordSet.has(x)));
          const union = new Set([...origWordSet, ...simWordSet]);
          const similarity = (intersection.size / union.size) * 100;
          
          if (similarity > bestSimilarity && similarity > 30) { // Threshold 30%
            bestSimilarity = similarity;
            bestMatch = simSentence.trim();
          }
        });
        
        if (bestMatch && detailedMatches.length < 10) { // Limit to 10 matches
          const startPosition = originalText.indexOf(origSentence.trim());
          if (startPosition >= 0) {
            detailedMatches.push({
              id: `real-match-${origIndex + 1}`,
              originalText: origSentence.trim(),
              matchedText: bestMatch,
              similarity: Math.round(bestSimilarity),
              source: mostSimilarDocument?.fileName || 'similar-document',
              url: `internal://document/${mostSimilarDocument?.fileName}`,
              startPosition: startPosition,
              endPosition: startPosition + origSentence.trim().length
            });
          }
        }
      });
    }
    
    // Sắp xếp matches theo vị trí trong text
    detailedMatches.sort((a, b) => a.startPosition - b.startPosition);
    
    const response = {
      success: true,
      currentDocument: {
        fileName: plagiarismCheck.fileName || 'document.txt',
        fileSize: plagiarismCheck.textLength,
        fileType: plagiarismCheck.fileType || 'text/plain',
        wordCount: plagiarismCheck.wordCount,
        duplicateRate: plagiarismCheck.duplicatePercentage,
        checkedAt: plagiarismCheck.createdAt,
        content: plagiarismCheck.originalText
      },
      mostSimilarDocument: mostSimilarDocument ? {
        ...mostSimilarDocument,
        content: mostSimilarContent
      } : null,
      overallSimilarity: overallSimilarity,
      detailedMatches: detailedMatches
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Get detailed comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy so sánh chi tiết'
    });
  }
};

// Get all documents comparison
exports.getAllDocumentsComparison = async (req, res) => {
  try {
    const { checkId } = req.params;
    const userId = req.user.id;
    
    const plagiarismCheck = await PlagiarismCheck.findOne({ 
      _id: checkId, 
      user: userId 
    });
    
    if (!plagiarismCheck) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy kết quả kiểm tra'
      });
    }
    
    // Lấy thống kê từ detection service
    const systemStats = plagiarismDetectionService.getStats();
    
    // Tìm tất cả similar chunks từ cache
    const similarChunks = plagiarismCacheService.findSimilarChunks(
      plagiarismCheck.originalText, 
      0.3 // Lower threshold để lấy nhiều kết quả hơn
    );
    
    // Tìm documents thực tế từ database
    const Document = require('../models/Document');
    let allDocuments = [];
    
    try {
      const documents = await Document.find({ status: 'processed' })
        .limit(50)
        .sort({ createdAt: -1 })
        .populate('uploadedBy', 'name');
      
      const originalWords = plagiarismCheck.originalText.toLowerCase().split(/\s+/);
      const originalWordSet = new Set(originalWords);
      
      // So sánh với từng document
      for (const doc of documents) {
        if (doc.extractedText && doc.extractedText.length > 100) {
          const docWords = doc.extractedText.toLowerCase().split(/\s+/);
          const docWordSet = new Set(docWords);
          
          // Tính similarity dựa trên số từ chung
          const intersection = new Set([...originalWordSet].filter(x => docWordSet.has(x)));
          const union = new Set([...originalWordSet, ...docWordSet]);
          const similarity = (intersection.size / union.size) * 100;
          
          if (similarity > 5) { // Chỉ lấy những document có similarity > 5%
            const duplicateRate = Math.round(similarity);
            const status = duplicateRate > 30 ? 'high' : duplicateRate > 15 ? 'medium' : 'low';
            
            allDocuments.push({
              id: doc._id,
              fileName: doc.originalFileName,
              fileSize: doc.fileSize,
              fileType: doc.mimeType,
              author: doc.uploadedBy?.name || 'Unknown',
              uploadedAt: doc.createdAt,
              duplicateRate: duplicateRate,
              status: status
            });
          }
        }
      }
    } catch (docError) {
      console.error('Error finding documents:', docError);
    }
    
    // Thêm documents từ cache
    const cacheDocuments = [];
    if (similarChunks.length > 0) {
      const groupedChunks = {};
      
      // Nhóm chunks theo hash để tạo thành documents
      similarChunks.forEach(chunk => {
        const docId = chunk.matchedChunk.fullHash.substring(0, 12);
        if (!groupedChunks[docId]) {
          groupedChunks[docId] = {
            chunks: [],
            totalSimilarity: 0,
            maxSimilarity: 0
          };
        }
        groupedChunks[docId].chunks.push(chunk);
        groupedChunks[docId].totalSimilarity += chunk.similarity;
        groupedChunks[docId].maxSimilarity = Math.max(groupedChunks[docId].maxSimilarity, chunk.similarity);
      });
      
      // Tạo documents từ grouped chunks
      Object.keys(groupedChunks).forEach(docId => {
        const group = groupedChunks[docId];
        const avgSimilarity = group.totalSimilarity / group.chunks.length;
        const duplicateRate = Math.round(Math.min(avgSimilarity, group.maxSimilarity));
        const status = duplicateRate > 30 ? 'high' : duplicateRate > 15 ? 'medium' : 'low';
        
        cacheDocuments.push({
          id: `cache-${docId}`,
          fileName: `document-${docId}.txt`,
          fileSize: group.chunks.reduce((sum, chunk) => sum + chunk.matchedChunk.text.length, 0),
          fileType: 'text/plain',
          author: 'Hệ thống',
          uploadedAt: new Date(),
          duplicateRate: duplicateRate,
          status: status
        });
      });
    }
    
    // Kết hợp và sắp xếp tất cả documents
    allDocuments = [...allDocuments, ...cacheDocuments];
    allDocuments.sort((a, b) => b.duplicateRate - a.duplicateRate);
    
    // Tính thống kê
    const totalDocuments = allDocuments.length;
    const highRiskCount = allDocuments.filter(doc => doc.status === 'high').length;
    const mediumRiskCount = allDocuments.filter(doc => doc.status === 'medium').length;
    const lowRiskCount = allDocuments.filter(doc => doc.status === 'low').length;
    
    res.json({
      success: true,
      checkId: checkId,
      currentDocument: {
        fileName: plagiarismCheck.fileName || 'document.txt',
        fileSize: plagiarismCheck.textLength,
        fileType: plagiarismCheck.fileType || 'text/plain',
        duplicateRate: plagiarismCheck.duplicatePercentage
      },
      totalDocuments: totalDocuments,
      highRiskCount: highRiskCount,
      mediumRiskCount: mediumRiskCount,
      lowRiskCount: lowRiskCount,
      allDocuments: allDocuments,
      systemStats: {
        totalDocumentsInSystem: systemStats.totalDocuments,
        totalChunksInSystem: systemStats.totalChunks,
        systemInitialized: systemStats.initialized
      }
    });
    
  } catch (error) {
    console.error('Get all documents comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy so sánh với tất cả tài liệu'
    });
  }
};

// Get detailed comparison with all documents (for visual comparison)
exports.getDetailedAllDocumentsComparison = async (req, res) => {
  try {
    const { checkId } = req.params;
    const userId = req.user.id;
    
    const plagiarismCheck = await PlagiarismCheck.findOne({ 
      _id: checkId, 
      user: userId 
    });
    
    if (!plagiarismCheck) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy kết quả kiểm tra'
      });
    }
    
    // Tìm tất cả similar chunks từ cache
    const similarChunks = plagiarismCacheService.findSimilarChunks(
      plagiarismCheck.originalText, 
      0.2 // Lower threshold để lấy nhiều kết quả hơn
    );
    
    // Tìm documents thực tế từ database
    const Document = require('../models/Document');
    let matchingDocuments = [];
    
    try {
      const documents = await Document.find({ status: 'processed' })
        .limit(20)
        .sort({ createdAt: -1 })
        .populate('uploadedBy', 'name');
      
      const originalWords = plagiarismCheck.originalText.toLowerCase().split(/\s+/);
      const originalWordSet = new Set(originalWords);
      
      // So sánh với từng document
      for (const doc of documents) {
        if (doc.extractedText && doc.extractedText.length > 100) {
          const docWords = doc.extractedText.toLowerCase().split(/\s+/).filter(word => word.length > 2);
          const docWordSet = new Set(docWords);
          
          // Tính similarity dựa trên số từ chung (Jaccard similarity)
          const intersection = new Set([...originalWordSet].filter(x => docWordSet.has(x)));
          const union = new Set([...originalWordSet, ...docWordSet]);
          const jaccardSimilarity = (intersection.size / union.size) * 100;
          
          // Tính similarity dựa trên tỷ lệ từ chung trong document gốc
          const overlapSimilarity = (intersection.size / originalWordSet.size) * 100;
          
          // Lấy similarity cao hơn trong 2 cách tính
          const similarity = Math.max(jaccardSimilarity, overlapSimilarity);
          
          if (similarity > 8) { // Giảm threshold để lấy nhiều kết quả hơn
            const duplicateRate = Math.round(similarity);
            const status = duplicateRate > 30 ? 'high' : duplicateRate > 15 ? 'medium' : 'low';
            
            matchingDocuments.push({
              id: doc._id,
              fileName: doc.originalFileName,
              fileSize: doc.fileSize,
              fileType: doc.mimeType,
              author: doc.uploadedBy?.name || 'Unknown',
              uploadedAt: doc.createdAt,
              duplicateRate: duplicateRate,
              status: status,
              content: doc.extractedText
            });
          }
        }
      }
    } catch (docError) {
      console.error('Error finding documents:', docError);
    }
    
    // Thêm documents từ cache
    if (similarChunks.length > 0) {
      const groupedChunks = {};
      
      // Nhóm chunks theo hash để tạo thành documents
      similarChunks.forEach(chunk => {
        const docId = chunk.matchedChunk.fullHash.substring(0, 12);
        if (!groupedChunks[docId]) {
          groupedChunks[docId] = {
            chunks: [],
            totalSimilarity: 0,
            maxSimilarity: 0,
            content: ''
          };
        }
        groupedChunks[docId].chunks.push(chunk);
        groupedChunks[docId].totalSimilarity += chunk.similarity;
        groupedChunks[docId].maxSimilarity = Math.max(groupedChunks[docId].maxSimilarity, chunk.similarity);
        groupedChunks[docId].content += chunk.matchedChunk.text + ' ';
      });
      
      // Tạo documents từ grouped chunks
      Object.keys(groupedChunks).forEach(docId => {
        const group = groupedChunks[docId];
        const avgSimilarity = group.totalSimilarity / group.chunks.length;
        const duplicateRate = Math.round(Math.min(avgSimilarity, group.maxSimilarity));
        const status = duplicateRate > 30 ? 'high' : duplicateRate > 15 ? 'medium' : 'low';
        
        if (duplicateRate > 8) { // Giảm threshold để lấy nhiều kết quả hơn
          matchingDocuments.push({
            id: `cache-${docId}`,
            fileName: `document-${docId}.txt`,
            fileSize: group.content.length,
            fileType: 'text/plain',
            author: 'Hệ thống',
            uploadedAt: new Date(),
            duplicateRate: duplicateRate,
            status: status,
            content: group.content.trim()
          });
        }
      });
    }
    
    // Sắp xếp theo tỷ lệ trùng lặp và giới hạn số lượng
    matchingDocuments.sort((a, b) => b.duplicateRate - a.duplicateRate);
    
    // Giới hạn số lượng documents để tránh lỗi hiển thị
    const limitedDocuments = matchingDocuments.slice(0, 10);
    
    // Tạo highlighted text cho document gốc
    const originalText = plagiarismCheck.originalText;
    let highlightedSegments = [];
    
    // Tạo màu sắc cho từng document
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', 
      '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#84cc16'
    ];
    
    // Chỉ xử lý nếu có documents để so sánh
    if (limitedDocuments.length > 0) {
      // Tìm các đoạn trùng lặp trong text gốc
      limitedDocuments.forEach((doc, docIndex) => {
        const color = colors[docIndex % colors.length];
        
        // Kiểm tra doc.content có tồn tại không
        if (!doc.content || doc.content.trim().length === 0) {
          return;
        }
        
        const originalSentences = originalText.split(/[.!?]+/).filter(s => s.trim().length > 20);
        const docSentences = doc.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
        
        originalSentences.forEach((origSentence) => {
          const origWords = origSentence.toLowerCase().trim().split(/\s+/);
          if (origWords.length < 5) return;
          
          let bestMatch = null;
          let bestSimilarity = 0;
          
          docSentences.forEach((docSentence) => {
            const docWords = docSentence.toLowerCase().trim().split(/\s+/);
            if (docWords.length < 5) return;
            
            // Tính similarity giữa hai câu
            const origWordSet = new Set(origWords);
            const docWordSet = new Set(docWords);
            const intersection = new Set([...origWordSet].filter(x => docWordSet.has(x)));
            const union = new Set([...origWordSet, ...docWordSet]);
            const similarity = (intersection.size / union.size) * 100;
            
            if (similarity > bestSimilarity && similarity > 30) { // Giảm threshold xuống 30%
              bestSimilarity = similarity;
              bestMatch = docSentence.trim();
            }
          });
          
          if (bestMatch) {
            const startPosition = originalText.indexOf(origSentence.trim());
            if (startPosition >= 0) {
              highlightedSegments.push({
                start: startPosition,
                end: startPosition + origSentence.trim().length,
                text: origSentence.trim(),
                documentId: doc.id,
                documentName: doc.fileName,
                similarity: Math.round(bestSimilarity),
                color: color
              });
            }
          }
        });
      });
    }
    
    // Sắp xếp segments theo vị trí
    highlightedSegments.sort((a, b) => a.start - b.start);
    
    // Xử lý overlap segments - loại bỏ các segments bị chồng lấn
    const cleanedSegments = [];
    highlightedSegments.forEach(segment => {
      let hasOverlap = false;
      
      for (let existing of cleanedSegments) {
        // Kiểm tra overlap
        if ((segment.start >= existing.start && segment.start < existing.end) ||
            (segment.end > existing.start && segment.end <= existing.end) ||
            (segment.start <= existing.start && segment.end >= existing.end)) {
          hasOverlap = true;
          // Giữ segment có similarity cao hơn
          if (segment.similarity > existing.similarity) {
            const index = cleanedSegments.indexOf(existing);
            cleanedSegments[index] = segment;
          }
          break;
        }
      }
      
      if (!hasOverlap) {
        cleanedSegments.push(segment);
      }
    });
    
    // Sắp xếp lại sau khi clean
    cleanedSegments.sort((a, b) => a.start - b.start);
    
    // Tạo text với highlight
    let highlightedText = '';
    let lastIndex = 0;
    
    cleanedSegments.forEach(segment => {
      // Thêm text trước segment
      if (segment.start > lastIndex) {
        highlightedText += originalText.substring(lastIndex, segment.start);
      }
      
      // Thêm segment với highlight
      highlightedText += `<span style="background-color: ${segment.color}20; border-left: 3px solid ${segment.color}; padding: 2px 4px; margin: 1px;" data-document-id="${segment.documentId}" data-similarity="${segment.similarity}" title="${segment.documentName} (${segment.similarity}%)">${segment.text}</span>`;
      
      lastIndex = segment.end;
    });
    
    // Thêm phần còn lại của text
    if (lastIndex < originalText.length) {
      highlightedText += originalText.substring(lastIndex);
    }
    
    // Cập nhật highlightedSegments để trả về
    highlightedSegments = cleanedSegments;
    
    // Debug logging
    console.log(`Detailed comparison for checkId ${checkId}:`);
    console.log(`- Total matching documents found: ${matchingDocuments.length}`);
    console.log(`- Limited documents for display: ${limitedDocuments.length}`);
    console.log(`- Highlighted segments found: ${highlightedSegments.length}`);
    console.log(`- Original text length: ${originalText.length} characters`);
    
    res.json({
      success: true,
      checkId: checkId,
      currentDocument: {
        fileName: plagiarismCheck.fileName || 'document.txt',
        fileSize: plagiarismCheck.textLength,
        fileType: plagiarismCheck.fileType || 'text/plain',
        duplicateRate: plagiarismCheck.duplicatePercentage,
        originalText: originalText,
        highlightedText: highlightedText || originalText // Fallback nếu không có highlight
      },
      matchingDocuments: limitedDocuments.map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        author: doc.author,
        uploadedAt: doc.uploadedAt,
        duplicateRate: doc.duplicateRate,
        status: doc.status
        // Không trả về content để giảm kích thước response
      })),
      highlightedSegments: highlightedSegments,
      totalMatches: matchingDocuments.length,
      displayedMatches: limitedDocuments.length,
      hasMoreMatches: matchingDocuments.length > 10
    });
    
  } catch (error) {
    console.error('Get detailed all documents comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy so sánh chi tiết với tất cả tài liệu'
    });
  }
};