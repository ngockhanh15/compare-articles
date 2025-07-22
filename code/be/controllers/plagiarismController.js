const PlagiarismCheck = require('../models/PlagiarismCheck');
const plagiarismCacheService = require('../services/PlagiarismCacheService');
const plagiarismDetectionService = require('../services/PlagiarismDetectionService');
const documentAVLService = require('../services/DocumentAVLService');
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

// Document-based checking using DocumentAVLService (kiểm tra với documents đã upload)
const performDocumentCheck = async (text, options = {}) => {
  const startTime = Date.now();
  
  try {
    console.log('Performing document-based check using DocumentAVLService...');
    
    // Sử dụng DocumentAVLService để kiểm tra với các document đã upload
    const result = await documentAVLService.checkDuplicateContent(text, {
      minSimilarity: options.sensitivity === 'high' ? 30 : 
                     options.sensitivity === 'low' ? 70 : 50, // medium = 50
      chunkSize: 50,
      maxResults: 20
    });
    
    // Chuyển đổi format để tương thích với frontend
    const formattedResult = {
      duplicatePercentage: result.duplicatePercentage || 0,
      matches: result.matches.map(match => ({
        text: match.matchedText ? match.matchedText.substring(0, 200) + '...' : 'Document content',
        source: match.title || `Document-${match.documentId.toString().substring(0, 8)}`,
        similarity: match.similarity,
        url: `internal://document/${match.documentId}`,
        documentId: match.documentId,
        fileType: match.fileType,
        createdAt: match.createdAt,
        method: 'document-based',
        duplicateSentences: match.duplicateSentences || 0, // Số câu trùng lặp
        duplicateSentencesDetails: match.duplicateSentencesDetails || [] // Chi tiết các câu trùng
      })),
      sources: result.sources || [],
      confidence: result.duplicatePercentage > 70 ? 'high' : 
                 result.duplicatePercentage > 30 ? 'medium' : 'low',
      processingTime: Date.now() - startTime,
      fromCache: false,
      totalMatches: result.totalMatches || 0,
      checkedDocuments: result.checkedDocuments || 0,
      // Thông số mới từ DocumentAVLService
      dtotal: result.dtotal || 0,
      dab: result.dab || 0,
      mostSimilarDocument: result.mostSimilarDocument || null,
      // Thêm thông tin về documents
      totalDocumentsInSystem: result.checkedDocuments || 0,
      // Thêm 2 thông số theo yêu cầu
      totalSentencesWithInputWords: result.totalSentencesWithInputWords || 0,
      maxDuplicateSentences: result.maxDuplicateSentences || 0,
      documentWithMostDuplicates: result.documentWithMostDuplicates || null,
      // Thông tin về cặp từ
      totalUniqueWordPairs: result.totalUniqueWordPairs || 0,
      totalUniqueWords: result.totalUniqueWords || 0,
      totalDuplicateSentences: result.totalDuplicateSentences || 0
    };
    
    console.log(`Document check completed: ${formattedResult.duplicatePercentage}% duplicate found in ${formattedResult.processingTime}ms`);
    console.log(`Checked against ${formattedResult.checkedDocuments} documents in system`);
    console.log(`Found ${formattedResult.totalDuplicateSentences} duplicate sentences based on word pair analysis`);
    
    return formattedResult;
    
  } catch (error) {
    console.error('Error in document check:', error);
    
    // Fallback: trả về kết quả cơ bản nếu có lỗi
    return {
      duplicatePercentage: 0,
      matches: [],
      sources: [],
      confidence: 'low',
      processingTime: Date.now() - startTime,
      fromCache: false,
      error: 'Error occurred during document check',
      errorDetails: error.message,
      totalDocumentsInSystem: 0,
      totalSentencesWithInputWords: 0,
      maxDuplicateSentences: 0,
      totalDuplicateSentences: 0
    };
  }
};


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
    
    // 4. Cập nhật confidence dựa trên threshold đơn giản: > 50% = high, <= 50% = low
    if (result.duplicatePercentage > 50) {
      result.confidence = 'high';
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

// Check document similarity (kiểm tra với documents đã upload)
exports.checkDocumentSimilarity = async (req, res) => {
  try {
    const { text, options = {}, fileName, fileType } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Văn bản không được để trống'
      });
    }
    
    // Perform document-based check
    const result = await performDocumentCheck(text, options);
    
    // Determine status based on simple threshold: > 70% = high, 30-70% = medium, <= 30% = low
    const getStatus = (percentage) => {
      if (percentage > 70) return 'high';
      if (percentage > 30) return 'medium';
      return 'low';
    };

    // For test endpoint, skip database save if no user
    if (!req.user) {
      return res.json({
        success: true,
        duplicateRate: result.duplicatePercentage,
        confidence: result.confidence,
        matches: result.matches,
        sources: result.sources,
        processingTime: result.processingTime,
        totalMatches: result.totalMatches,
        checkedDocuments: result.checkedDocuments,
        // Thêm thông số mới
        totalSentencesWithInputWords: result.totalSentencesWithInputWords,
        maxDuplicateSentences: result.maxDuplicateSentences,
        documentWithMostDuplicates: result.documentWithMostDuplicates,
        totalDuplicateSentences: result.totalDuplicateSentences
      });
    }

    // Save check to database (optional - có thể bỏ nếu không muốn lưu)
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
        checkInternet: false, // Document-based check không cần internet
        checkDatabase: true,
        sensitivity: options.sensitivity || 'medium',
        language: options.language || 'vi',
        checkType: 'document-based' // Đánh dấu là document-based check
      },
      // Thêm thông số mới
      totalSentencesWithInputWords: result.totalSentencesWithInputWords,
      maxDuplicateSentences: result.maxDuplicateSentences,
      documentWithMostDuplicates: result.documentWithMostDuplicates,
      totalDuplicateSentences: result.totalDuplicateSentences,
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
        totalMatches: result.totalMatches,
        checkedDocuments: result.checkedDocuments,
        // Thêm thông số mới
        totalSentencesWithInputWords: result.totalSentencesWithInputWords,
        maxDuplicateSentences: result.maxDuplicateSentences,
        documentWithMostDuplicates: result.documentWithMostDuplicates,
        totalDuplicateSentences: result.totalDuplicateSentences
      }
    });
  } catch (error) {
    console.error('Error in document similarity check:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi kiểm tra độ tương đồng'
    });
  }
};


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
    
    // Determine status based on simple threshold: > 50% = high, <= 50% = low
    const getStatus = (percentage) => {
      if (percentage > 50) return 'high';
      return 'low';
    };

    // For test endpoint, skip database save if no user
    if (!req.user) {
      return res.json({
        success: true,
        duplicateRate: result.duplicatePercentage,
        confidence: result.confidence,
        matches: result.matches,
        sources: result.sources,
        processingTime: result.processingTime,
        totalMatches: result.matches ? result.matches.length : 0
      });
    }

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

// Get document tree statistics
exports.getDocumentTreeStats = async (req, res) => {
  try {
    const stats = documentAVLService.getTreeStats();
    
    res.json({
      success: true,
      stats: stats
    });
    
  } catch (error) {
    console.error('Get document tree stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê document tree'
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
    
    console.log('Finding detailed comparison for check:', checkId);
    console.log('Original text length:', plagiarismCheck.originalText?.length);
    
    // Khởi tạo biến
    const Document = require('../models/Document');
    let mostSimilarDocument = null;
    let mostSimilarContent = '';
    let overallSimilarity = plagiarismCheck.duplicatePercentage || 0;
    let detailedMatches = [];
    
    console.log('Starting document similarity search...');
    console.log('Original text preview:', plagiarismCheck.originalText?.substring(0, 100) + '...');
    
    // Phương pháp 1: Tìm từ database documents thực tế trước
    try {
      console.log('Searching in Document database...');
      const documents = await Document.find({ 
        status: 'processed',
        extractedText: { $exists: true, $ne: null, $ne: '' }
      })
      .limit(50)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name')
      .select('originalFileName fileSize mimeType extractedText uploadedBy createdAt');
      
      console.log(`Found ${documents.length} documents in database`);
      
      if (documents.length > 0) {
        let bestMatch = null;
        let bestSimilarity = 0;
        
        const originalText = plagiarismCheck.originalText.toLowerCase();
        const originalWords = originalText.split(/\s+/).filter(w => w.length > 2);
        const originalWordSet = new Set(originalWords);
        
        for (const doc of documents) {
          if (doc.extractedText && doc.extractedText.length > 50) {
            const docText = doc.extractedText.toLowerCase();
            const docWords = docText.split(/\s+/).filter(w => w.length > 2);
            const docWordSet = new Set(docWords);
            
            // Tính Jaccard similarity
            const intersection = new Set([...originalWordSet].filter(x => docWordSet.has(x)));
            const union = new Set([...originalWordSet, ...docWordSet]);
            const jaccardSimilarity = (intersection.size / union.size) * 100;
            
            // Tính cosine similarity đơn giản
            const commonWords = intersection.size;
            const cosineSimilarity = (commonWords / Math.sqrt(originalWords.length * docWords.length)) * 100;
            
            // Lấy similarity cao hơn
            const similarity = Math.max(jaccardSimilarity, cosineSimilarity);
            
            console.log(`Document ${doc.originalFileName}: ${similarity.toFixed(2)}% similarity`);
            
            if (similarity > bestSimilarity) {
              bestSimilarity = similarity;
              bestMatch = doc;
            }
          }
        }
        
        if (bestMatch && bestSimilarity > 3) { // Threshold rất thấp để có kết quả
          console.log(`Best match found: ${bestMatch.originalFileName} with ${bestSimilarity.toFixed(2)}% similarity`);
          
          mostSimilarDocument = {
            fileName: bestMatch.originalFileName,
            fileSize: bestMatch.fileSize,
            fileType: bestMatch.mimeType,
            author: bestMatch.uploadedBy?.name || 'Unknown',
            uploadedAt: bestMatch.createdAt,
            wordCount: bestMatch.extractedText.split(/\s+/).filter(w => w.length > 0).length
          };
          mostSimilarContent = bestMatch.extractedText;
          overallSimilarity = Math.max(overallSimilarity, Math.round(bestSimilarity));
        }
      }
    } catch (dbError) {
      console.error('Error searching documents in database:', dbError);
    }
    
    // Tạo detailed matches
    console.log('Creating detailed matches...');
    
    // Phương pháp 1: Từ plagiarism check có sẵn
    if (plagiarismCheck.matches && plagiarismCheck.matches.length > 0) {
      console.log(`Adding ${plagiarismCheck.matches.length} matches from plagiarism check`);
      plagiarismCheck.matches.forEach((match, index) => {
        const originalText = plagiarismCheck.originalText;
        const matchText = match.text || '';
        const startIndex = originalText.toLowerCase().indexOf(matchText.toLowerCase());
        
        detailedMatches.push({
          id: `existing-match-${index + 1}`,
          originalText: matchText,
          matchedText: matchText,
          similarity: match.similarity || 75,
          source: match.source || 'database',
          url: match.url || `internal://match/${index}`,
          startPosition: startIndex >= 0 ? startIndex : 0,
          endPosition: startIndex >= 0 ? startIndex + matchText.length : matchText.length
        });
      });
    }
    
    // Phương pháp 2: Tạo matches từ document tương tự (nếu có)
    if (mostSimilarContent && mostSimilarContent.trim().length > 10) {
      console.log('Creating matches from similar document...');
      const originalText = plagiarismCheck.originalText;
      
      // Chia thành câu để so sánh (thay vì chunks cố định)
      const originalSentences = originalText.split(/[.!?]+/).filter(s => s.trim().length > 5);
      const similarSentences = mostSimilarContent.split(/[.!?]+/).filter(s => s.trim().length > 5);
      
      console.log(`Original sentences: ${originalSentences.length}, Similar sentences: ${similarSentences.length}`);
      
      let matchCount = 0;
      for (let i = 0; i < originalSentences.length && matchCount < 10; i++) {
        const origSentence = originalSentences[i].trim();
        if (origSentence.length < 10) continue;
        
        const origWords = origSentence.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        let bestMatch = null;
        let bestSimilarity = 0;
        
        for (let j = 0; j < similarSentences.length; j++) {
          const simSentence = similarSentences[j].trim();
          if (simSentence.length < 10) continue;
          
          const simWords = simSentence.toLowerCase().split(/\s+/).filter(w => w.length > 2);
          
          // Tính similarity dựa trên từ chung
          const origWordSet = new Set(origWords);
          const simWordSet = new Set(simWords);
          const intersection = new Set([...origWordSet].filter(x => simWordSet.has(x)));
          
          // Tính cả Jaccard và word overlap
          const jaccardSim = intersection.size / new Set([...origWords, ...simWords]).size * 100;
          const overlapSim = intersection.size / Math.min(origWords.length, simWords.length) * 100;
          const similarity = Math.max(jaccardSim, overlapSim);
          
          console.log(`Comparing "${origSentence.substring(0, 30)}..." vs "${simSentence.substring(0, 30)}..." = ${similarity.toFixed(1)}%`);
          
          // Chỉ coi là trùng lặp nếu similarity >= 50% (threshold cao hơn)
          if (similarity > bestSimilarity && similarity >= 50) {
            bestSimilarity = similarity;
            bestMatch = simSentence;
          }
        }
        
        // Chỉ thêm match nếu thực sự có độ tương tự cao (>= 50%)
        if (bestMatch && bestSimilarity >= 50) {
          const startPosition = originalText.indexOf(origSentence);
          detailedMatches.push({
            id: `sentence-match-${matchCount + 1}`,
            originalText: origSentence,
            matchedText: bestMatch,
            similarity: Math.round(bestSimilarity),
            source: mostSimilarDocument?.fileName || 'similar-document',
            url: `internal://document/${mostSimilarDocument?.fileName}`,
            startPosition: startPosition >= 0 ? startPosition : 0,
            endPosition: startPosition >= 0 ? startPosition + origSentence.length : origSentence.length
          });
          matchCount++;
          console.log(`✓ Added match ${matchCount}: ${bestSimilarity.toFixed(1)}% similarity`);
        }
      }
      
      // Nếu không tìm thấy matches từ câu, thử so sánh toàn bộ text
      if (detailedMatches.length === 0 && overallSimilarity >= 50) {
        console.log('No sentence matches found, creating overall match...');
        const origWords = originalText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const simWords = mostSimilarContent.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const origWordSet = new Set(origWords);
        const simWordSet = new Set(simWords);
        const intersection = new Set([...origWordSet].filter(x => simWordSet.has(x)));
        const overlapSimilarity = intersection.size / Math.min(origWords.length, simWords.length) * 100;
        
        // Chỉ tạo overall match nếu thực sự có độ tương tự cao (>= 50%)
        if (overlapSimilarity >= 50) {
          detailedMatches.push({
            id: 'overall-match-1',
            originalText: originalText.trim(),
            matchedText: mostSimilarContent.trim(),
            similarity: Math.round(overlapSimilarity),
            source: mostSimilarDocument?.fileName || 'similar-document',
            url: `internal://document/${mostSimilarDocument?.fileName}`,
            startPosition: 0,
            endPosition: originalText.length
          });
          console.log(`✓ Added overall match: ${overlapSimilarity.toFixed(1)}% similarity`);
        }
      }
    }
    
    console.log(`Created ${detailedMatches.length} detailed matches`);
    
    // Sắp xếp matches theo vị trí trong text
    detailedMatches.sort((a, b) => a.startPosition - b.startPosition);
    
    console.log('Preparing response:', {
      currentDocumentLength: plagiarismCheck.originalText?.length,
      mostSimilarDocumentFound: !!mostSimilarDocument,
      mostSimilarContentLength: mostSimilarContent?.length,
      detailedMatchesCount: detailedMatches.length,
      overallSimilarity: overallSimilarity
    });
    
    // Tạo highlighted text cho current document
    let currentHighlightedText = plagiarismCheck.originalText || '';
    if (detailedMatches && detailedMatches.length > 0) {
      // Sắp xếp matches theo vị trí để tránh overlap
      const sortedMatches = [...detailedMatches].sort((a, b) => a.startPosition - b.startPosition);
      
      let highlightedText = '';
      let lastIndex = 0;
      
      sortedMatches.forEach((match, index) => {
        const color = `hsl(${(index * 137.5) % 360}, 70%, 50%)`; // Generate different colors
        
        // Add text before this match
        if (match.startPosition > lastIndex) {
          highlightedText += plagiarismCheck.originalText.substring(lastIndex, match.startPosition);
        }
        
        // Add highlighted match
        highlightedText += `<span style="background-color: ${color}20; border-left: 3px solid ${color}; padding: 2px 4px; margin: 1px; border-radius: 3px;" data-match-id="${match.id}" data-similarity="${match.similarity}" title="${match.source} (${match.similarity}%)">${match.originalText}</span>`;
        
        lastIndex = match.endPosition;
      });
      
      // Add remaining text
      if (lastIndex < plagiarismCheck.originalText.length) {
        highlightedText += plagiarismCheck.originalText.substring(lastIndex);
      }
      
      currentHighlightedText = highlightedText;
    }
    
    // Tạo highlighted text cho most similar document
    let similarHighlightedText = mostSimilarContent || '';
    if (detailedMatches && detailedMatches.length > 0 && mostSimilarContent) {
      let highlightedText = mostSimilarContent;
      
      detailedMatches.forEach((match, index) => {
        const color = `hsl(${(index * 137.5) % 360}, 70%, 50%)`; // Same colors as current document
        const searchText = match.matchedText;
        
        if (searchText && searchText.length > 0) {
          // Simple replacement for matched text
          const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          highlightedText = highlightedText.replace(regex, `<span style="background-color: ${color}20; border-left: 3px solid ${color}; padding: 2px 4px; margin: 1px; border-radius: 3px;" data-match-id="${match.id}" data-similarity="${match.similarity}" title="${match.source} (${match.similarity}%)">${searchText}</span>`);
        }
      });
      
      similarHighlightedText = highlightedText;
    }

    const response = {
      success: true,
      currentDocument: {
        fileName: plagiarismCheck.fileName || 'document.txt',
        fileSize: plagiarismCheck.textLength || plagiarismCheck.originalText?.length || 0,
        fileType: plagiarismCheck.fileType || 'text/plain',
        wordCount: plagiarismCheck.wordCount || plagiarismCheck.originalText?.split(/\s+/).filter(w => w.length > 0).length || 0,
        duplicateRate: plagiarismCheck.duplicatePercentage || 0,
        checkedAt: plagiarismCheck.createdAt,
        content: plagiarismCheck.originalText || '',
        highlightedText: currentHighlightedText
      },
      mostSimilarDocument: mostSimilarDocument ? {
        ...mostSimilarDocument,
        content: mostSimilarContent || '',
        highlightedText: similarHighlightedText
      } : {
        fileName: 'Không tìm thấy document tương tự',
        fileSize: 0,
        fileType: 'text/plain',
        author: 'Hệ thống',
        uploadedAt: new Date(),
        wordCount: 0,
        content: 'Không có document tương tự trong hệ thống để so sánh.',
        highlightedText: 'Không có document tương tự trong hệ thống để so sánh.'
      },
      overallSimilarity: overallSimilarity || 0,
      detailedMatches: detailedMatches || []
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
    
    const originalText = plagiarismCheck.originalText;
    console.log(`🔍 Starting detailed comparison using DocumentAVLService for checkId: ${checkId}`);
    console.log(`📝 Original text length: ${originalText.length} characters`);
    
    // Sử dụng DocumentAVLService để tìm các tài liệu trùng lặp dựa trên cây AVL
    const avlResult = await documentAVLService.checkDuplicateContent(originalText, {
      minSimilarity: 10, // Giảm threshold để lấy nhiều kết quả hơn
      chunkSize: 50,
      maxResults: 20
    });
    
    console.log(`📊 AVL check result: ${avlResult.duplicatePercentage}% duplicate, ${avlResult.matches.length} matches found`);
    
    // Chuyển đổi matches từ AVL result thành format phù hợp
    const matchingDocuments = avlResult.matches.map(match => ({
      id: match.documentId,
      fileName: match.title || `Document-${match.documentId.toString().substring(0, 8)}`,
      fileSize: match.textLength || 0,
      fileType: match.fileType || 'text/plain',
      author: match.uploadedBy?.name || 'Unknown',
      uploadedAt: match.createdAt || new Date(),
      duplicateRate: match.similarity,
      status: match.similarity > 70 ? 'high' : match.similarity > 30 ? 'medium' : 'low',
      content: match.matchedText || '',
      duplicateSentences: match.duplicateSentences || 0,
      duplicateSentencesDetails: match.duplicateSentencesDetails || []
    }));
    
    // Sắp xếp theo tỷ lệ trùng lặp và giới hạn số lượng
    matchingDocuments.sort((a, b) => b.duplicateRate - a.duplicateRate);
    const limitedDocuments = matchingDocuments.slice(0, 10);
    
    // Tính toán tỷ lệ trùng lặp tổng thể
    const overallDuplicateRate = avlResult.duplicatePercentage;
    
    console.log(`📊 Overall duplicate rate: ${overallDuplicateRate}%`);
    console.log(`📄 Found ${limitedDocuments.length} documents for detailed comparison`);
    
    // Tạo highlighted text dựa trên phân tích câu với cây AVL
    let highlightedText = '';
    let highlightedSegments = [];
    
    // Tạo màu sắc cho từng document
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', 
      '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#84cc16'
    ];
    
    if (limitedDocuments.length > 0) {
      console.log(`🎨 Starting sentence-based highlighting with ${limitedDocuments.length} documents`);
      
      // Tách văn bản gốc thành các câu
      const originalSentences = originalText.split(/[.!?]+/).filter(s => s.trim().length > 10);
      console.log(`📝 Original text has ${originalSentences.length} sentences`);
      
      // Phân tích từng câu với từng tài liệu
      limitedDocuments.forEach((doc, docIndex) => {
        const color = colors[docIndex % colors.length];
        
        if (!doc.content || doc.content.trim().length === 0) {
          return;
        }
        
        console.log(`🔍 Analyzing sentences for document: ${doc.fileName}`);
        
        // Tách tài liệu thành các câu
        const docSentences = doc.content.split(/[.!?]+/).filter(s => s.trim().length > 10);
        
        // So sánh từng câu trong văn bản gốc với các câu trong tài liệu
        originalSentences.forEach((origSentence, sentenceIndex) => {
          const origSentenceTrimmed = origSentence.trim();
          if (origSentenceTrimmed.length < 20) return; // Bỏ qua câu quá ngắn
          
          // Tính toán độ trùng lặp của câu này với tài liệu
          const sentenceDuplicateRatio = calculateSentenceDuplicateRatio(origSentenceTrimmed, doc.content);
          
          // Chỉ đánh dấu các câu có độ trùng lặp > 50%
          if (sentenceDuplicateRatio > 50) {
            const startPosition = originalText.indexOf(origSentenceTrimmed);
            if (startPosition >= 0) {
              highlightedSegments.push({
                start: startPosition,
                end: startPosition + origSentenceTrimmed.length,
                text: origSentenceTrimmed,
                documentId: doc.id,
                documentName: doc.fileName,
                similarity: Math.round(sentenceDuplicateRatio),
                color: color,
                type: 'sentence-based-avl'
              });
              
              console.log(`✅ Sentence ${sentenceIndex + 1} marked for highlighting: ${sentenceDuplicateRatio.toFixed(1)}% similarity with ${doc.fileName}`);
            }
          }
        });
      });
      
      // Sắp xếp segments theo vị trí
      highlightedSegments.sort((a, b) => a.start - b.start);
      
      // Xử lý overlap segments - chỉ giữ segment có similarity cao nhất
      const cleanedSegments = [];
      highlightedSegments.forEach(segment => {
        let hasOverlap = false;
        
        for (let i = 0; i < cleanedSegments.length; i++) {
          const existing = cleanedSegments[i];
          // Kiểm tra overlap
          if ((segment.start >= existing.start && segment.start < existing.end) ||
              (segment.end > existing.start && segment.end <= existing.end) ||
              (segment.start <= existing.start && segment.end >= existing.end)) {
            hasOverlap = true;
            // Giữ segment có similarity cao hơn
            if (segment.similarity > existing.similarity) {
              cleanedSegments[i] = segment;
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
      highlightedSegments = cleanedSegments;
      
      console.log(`🎨 Final highlighted segments: ${highlightedSegments.length}`);
      
      // Tạo highlighted text
      let lastIndex = 0;
      highlightedText = '';
      
      highlightedSegments.forEach(segment => {
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
    } else {
      // Nếu không có documents, sử dụng text gốc
      highlightedText = originalText;
    }
    
    // Debug logging
    console.log(`📊 Detailed comparison summary for checkId ${checkId}:`);
    console.log(`- Total matching documents: ${matchingDocuments.length}`);
    console.log(`- Documents for display: ${limitedDocuments.length}`);
    console.log(`- Highlighted segments: ${highlightedSegments.length}`);
    console.log(`- Overall duplicate rate: ${overallDuplicateRate}%`);
    console.log(`- Total duplicate sentences: ${avlResult.totalDuplicateSentences || 0}`);
    
    res.json({
      success: true,
      checkId: checkId,
      currentDocument: {
        fileName: plagiarismCheck.fileName || 'document.txt',
        fileSize: plagiarismCheck.textLength,
        fileType: plagiarismCheck.fileType || 'text/plain',
        duplicateRate: overallDuplicateRate,
        originalText: originalText,
        highlightedText: highlightedText
      },
      matchingDocuments: limitedDocuments.map(doc => ({
        id: doc.id,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        author: doc.author,
        uploadedAt: doc.uploadedAt,
        duplicateRate: doc.duplicateRate,
        status: doc.status,
        duplicateSentences: doc.duplicateSentences
      })),
      highlightedSegments: highlightedSegments,
      totalMatches: matchingDocuments.length,
      displayedMatches: limitedDocuments.length,
      hasMoreMatches: matchingDocuments.length > 10,
      // Thêm thông tin từ AVL result
      totalDuplicateSentences: avlResult.totalDuplicateSentences || 0,
      totalSentencesWithInputWords: avlResult.totalSentencesWithInputWords || 0,
      maxDuplicateSentences: avlResult.maxDuplicateSentences || 0,
      documentWithMostDuplicates: avlResult.documentWithMostDuplicates || null
    });
    
  } catch (error) {
    console.error('Get detailed all documents comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy so sánh chi tiết với tất cả tài liệu'
    });
  }
};

// Hàm helper để tính toán độ trùng lặp của một câu với một tài liệu
function calculateSentenceDuplicateRatio(sentence, documentContent) {
  try {
    // Sử dụng Vietnamese stopword service để lấy các từ có nghĩa
    const vietnameseStopwordService = require('../services/VietnameseStopwordService');
    
    // Tách câu thành các từ có nghĩa
    const sentenceWords = vietnameseStopwordService.extractMeaningfulWords(sentence);
    const uniqueSentenceWords = new Set(sentenceWords);
    
    // Tách tài liệu thành các từ có nghĩa
    const docWords = vietnameseStopwordService.extractMeaningfulWords(documentContent);
    const uniqueDocWords = new Set(docWords);
    
    // Tạo các cặp từ trong câu
    const sentenceWordPairs = [];
    for (let i = 0; i < sentenceWords.length - 1; i++) {
      sentenceWordPairs.push(`${sentenceWords[i]}_${sentenceWords[i+1]}`);
    }
    const uniqueSentenceWordPairs = new Set(sentenceWordPairs);
    
    // Đếm số từ trùng lặp
    const matchedWords = [...uniqueSentenceWords].filter(word => uniqueDocWords.has(word));
    
    // Tính tỷ lệ trùng lặp theo công thức: (số từ trùng / số cặp từ trong câu) * 100
    let duplicateRatio = 0;
    if (uniqueSentenceWordPairs.size > 0) {
      duplicateRatio = (matchedWords.length / uniqueSentenceWordPairs.size) * 100;
    }
    
    return duplicateRatio;
  } catch (error) {
    console.error('Error calculating sentence duplicate ratio:', error);
    return 0;
  }
}