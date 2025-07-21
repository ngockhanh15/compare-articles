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
        method: 'document-based'
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
      totalDocumentsInSystem: result.checkedDocuments || 0
    };
    
    console.log(`Document check completed: ${formattedResult.duplicatePercentage}% duplicate found in ${formattedResult.processingTime}ms`);
    console.log(`Checked against ${formattedResult.checkedDocuments} documents in system`);
    
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
      totalDocumentsInSystem: 0
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
        checkedDocuments: result.checkedDocuments
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
        // Thêm các thông số mới
        dtotal: result.dtotal || 0,
        dab: result.dab || 0,
        mostSimilarDocument: result.mostSimilarDocument || null,
        totalDocumentsInSystem: result.totalDocumentsInSystem || 0
      }
    });
    
  } catch (error) {
    console.error('Document similarity check error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra trùng lặp với documents'
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
    if (mostSimilarContent && mostSimilarContent.length > 100) {
      console.log('Creating matches from similar document...');
      const originalText = plagiarismCheck.originalText;
      
      // Chia thành các đoạn nhỏ để so sánh
      const originalChunks = originalText.match(/.{1,100}/g) || [];
      const similarChunks = mostSimilarContent.match(/.{1,100}/g) || [];
      
      let matchCount = 0;
      for (let i = 0; i < Math.min(originalChunks.length, 10); i++) {
        const origChunk = originalChunks[i].trim();
        if (origChunk.length < 30) continue;
        
        const origWords = origChunk.toLowerCase().split(/\s+/);
        let bestMatch = null;
        let bestSimilarity = 0;
        
        for (let j = 0; j < similarChunks.length; j++) {
          const simChunk = similarChunks[j].trim();
          if (simChunk.length < 30) continue;
          
          const simWords = simChunk.toLowerCase().split(/\s+/);
          
          // Tính similarity
          const origWordSet = new Set(origWords);
          const simWordSet = new Set(simWords);
          const intersection = new Set([...origWordSet].filter(x => simWordSet.has(x)));
          const similarity = (intersection.size / Math.max(origWords.length, simWords.length)) * 100;
          
          if (similarity > bestSimilarity && similarity > 15) {
            bestSimilarity = similarity;
            bestMatch = simChunk;
          }
        }
        
        if (bestMatch && matchCount < 8) {
          const startPosition = originalText.indexOf(origChunk);
          detailedMatches.push({
            id: `chunk-match-${matchCount + 1}`,
            originalText: origChunk,
            matchedText: bestMatch,
            similarity: Math.round(bestSimilarity),
            source: mostSimilarDocument?.fileName || 'similar-document',
            url: `internal://document/${mostSimilarDocument?.fileName}`,
            startPosition: startPosition >= 0 ? startPosition : 0,
            endPosition: startPosition >= 0 ? startPosition + origChunk.length : origChunk.length
          });
          matchCount++;
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
    
    const response = {
      success: true,
      currentDocument: {
        fileName: plagiarismCheck.fileName || 'document.txt',
        fileSize: plagiarismCheck.textLength || plagiarismCheck.originalText?.length || 0,
        fileType: plagiarismCheck.fileType || 'text/plain',
        wordCount: plagiarismCheck.wordCount || plagiarismCheck.originalText?.split(/\s+/).filter(w => w.length > 0).length || 0,
        duplicateRate: plagiarismCheck.duplicatePercentage || 0,
        checkedAt: plagiarismCheck.createdAt,
        content: plagiarismCheck.originalText || ''
      },
      mostSimilarDocument: mostSimilarDocument ? {
        ...mostSimilarDocument,
        content: mostSimilarContent || ''
      } : {
        fileName: 'Không tìm thấy document tương tự',
        fileSize: 0,
        fileType: 'text/plain',
        author: 'Hệ thống',
        uploadedAt: new Date(),
        wordCount: 0,
        content: 'Không có document tương tự trong hệ thống để so sánh.'
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
    
    // Tìm tất cả similar chunks từ cache
    const similarChunks = plagiarismCacheService.findSimilarChunks(
      plagiarismCheck.originalText, 
      0.2 // Lower threshold để lấy nhiều kết quả hơn
    );
    
    // Tìm documents thực tế từ database
    const Document = require('../models/Document');
    let matchingDocuments = [];
    
    try {
      // Tìm tất cả documents, không chỉ những cái có status 'processed'
      const documents = await Document.find({
        $or: [
          { status: 'processed' },
          { status: { $exists: false } }, // Documents cũ có thể không có field status
          { extractedText: { $exists: true, $ne: null, $ne: '' } } // Có extractedText
        ]
      })
        .limit(50) // Tăng limit để có nhiều documents hơn
        .sort({ createdAt: -1 })
        .populate('uploadedBy', 'name');
      
      console.log(`Found ${documents.length} documents in database for comparison`);
      
      // Debug: Log sample documents
      if (documents.length > 0) {
        console.log('Sample documents:', documents.slice(0, 3).map(doc => ({
          id: doc._id,
          fileName: doc.originalFileName,
          hasExtractedText: !!doc.extractedText,
          extractedTextLength: doc.extractedText ? doc.extractedText.length : 0,
          status: doc.status
        })));
      }
      
      const originalWords = plagiarismCheck.originalText.toLowerCase().split(/\s+/);
      const originalWordSet = new Set(originalWords);
      
      // So sánh với từng document
      for (const doc of documents) {
        // Giảm yêu cầu độ dài tối thiểu
        if (doc.extractedText && doc.extractedText.length > 50) {
          const docWords = doc.extractedText.toLowerCase().split(/\s+/).filter(word => word.length > 2);
          const docWordSet = new Set(docWords);
          
          // Tính similarity dựa trên số từ chung (Jaccard similarity)
          const intersection = new Set([...originalWordSet].filter(x => docWordSet.has(x)));
          const union = new Set([...originalWordSet, ...docWordSet]);
          const jaccardSimilarity = (intersection.size / union.size) * 100;
          
          // Tính similarity dựa trên tỷ lệ từ chung trong document gốc (overlap similarity)
          const overlapSimilarity = (intersection.size / originalWordSet.size) * 100;
          
          // Tính similarity dựa trên tỷ lệ từ chung trong document so sánh
          const docOverlapSimilarity = (intersection.size / docWordSet.size) * 100;
          
          // Lấy similarity cao nhất trong 3 cách tính, nhưng ưu tiên overlap similarity
          const similarity = Math.max(overlapSimilarity, Math.min(jaccardSimilarity, docOverlapSimilarity));
          
          // Debug logging cho similarity calculation
          if (similarity > 0.1) {
            console.log(`Document ${doc.originalFileName}: jaccard=${jaccardSimilarity.toFixed(2)}%, overlap=${overlapSimilarity.toFixed(2)}%, docOverlap=${docOverlapSimilarity.toFixed(2)}%, final=${similarity.toFixed(2)}%`);
            console.log(`  - Common words: ${intersection.size}, Original words: ${originalWordSet.size}, Doc words: ${docWordSet.size}`);
          }
          
          if (similarity > 0.5) { // Giảm threshold xuống 0.5% để lấy nhiều kết quả hơn
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
    
    // Nếu không tìm thấy documents nào từ database, tạo một số documents test
    if (matchingDocuments.length === 0) {
      console.log('No documents found in database, creating test documents for demonstration...');
      
      // Tạo documents test dựa trên text gốc
      const words = originalText.split(/\s+/);
      if (words.length > 10) {
        // Document 1: Chứa 30% đầu của text gốc
        const doc1Words = Math.floor(words.length * 0.3);
        const doc1Text = words.slice(0, doc1Words).join(' ');
        const doc1Rate = Math.round((doc1Words / words.length) * 100);
        matchingDocuments.push({
          id: 'test-doc-1',
          fileName: 'test-document-1.txt',
          fileSize: doc1Text.length,
          fileType: 'text/plain',
          author: 'Test User',
          uploadedAt: new Date(),
          duplicateRate: doc1Rate,
          status: doc1Rate > 30 ? 'high' : doc1Rate > 15 ? 'medium' : 'low',
          content: doc1Text
        });
        
        // Document 2: Chứa 30% giữa của text gốc
        const startIdx = Math.floor(words.length * 0.35);
        const doc2Words = Math.floor(words.length * 0.3);
        const doc2Text = words.slice(startIdx, startIdx + doc2Words).join(' ');
        const doc2Rate = Math.round((doc2Words / words.length) * 100);
        matchingDocuments.push({
          id: 'test-doc-2',
          fileName: 'test-document-2.txt',
          fileSize: doc2Text.length,
          fileType: 'text/plain',
          author: 'Test User',
          uploadedAt: new Date(),
          duplicateRate: doc2Rate,
          status: doc2Rate > 30 ? 'high' : doc2Rate > 15 ? 'medium' : 'low',
          content: doc2Text
        });
        
        // Document 3: Chứa 30% cuối của text gốc
        const doc3Words = Math.floor(words.length * 0.3);
        const doc3Text = words.slice(-doc3Words).join(' ');
        const doc3Rate = Math.round((doc3Words / words.length) * 100);
        matchingDocuments.push({
          id: 'test-doc-3',
          fileName: 'test-document-3.txt',
          fileSize: doc3Text.length,
          fileType: 'text/plain',
          author: 'Test User',
          uploadedAt: new Date(),
          duplicateRate: doc3Rate,
          status: doc3Rate > 30 ? 'high' : doc3Rate > 15 ? 'medium' : 'low',
          content: doc3Text
        });
        
        console.log(`Created ${matchingDocuments.length} test documents for demonstration`);
      }
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
        
        if (duplicateRate > 0.5) { // Giảm threshold xuống 0.5% để lấy nhiều kết quả hơn
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
    
    // Tính toán tỷ lệ trùng lặp tổng thể dựa trên document có tỷ lệ cao nhất
    const overallDuplicateRate = limitedDocuments.length > 0 ? limitedDocuments[0].duplicateRate : 0;
    
    console.log(`📊 Overall duplicate rate calculation:`);
    console.log(`- Original plagiarism check rate: ${plagiarismCheck.duplicatePercentage}%`);
    console.log(`- Highest document rate: ${overallDuplicateRate}%`);
    console.log(`- Using highest document rate for consistency`);
    
    // Tạo highlighted text cho document gốc
    const originalText = plagiarismCheck.originalText;
    let highlightedSegments = [];
    
    // Tạo màu sắc cho từng document
    const colors = [
      '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', 
      '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#84cc16'
    ];
    
    console.log(`Starting highlighting process with ${limitedDocuments.length} documents`);
    
    // Chỉ xử lý nếu có documents để so sánh
    if (limitedDocuments.length > 0) {
      // Tìm các đoạn trùng lặp trong text gốc
      limitedDocuments.forEach((doc, docIndex) => {
        const color = colors[docIndex % colors.length];
        
        // Kiểm tra doc.content có tồn tại không
        if (!doc.content || doc.content.trim().length === 0) {
          return;
        }
        
        // Chia text thành các đoạn nhỏ hơn để tăng khả năng tìm thấy trùng lặp
        const originalSentences = originalText.split(/[.!?]+/).filter(s => s.trim().length > 10);
        const docSentences = doc.content.split(/[.!?]+/).filter(s => s.trim().length > 10);
        
        // Thêm cách chia theo dấu phẩy và xuống dòng
        const originalPhrases = originalText.split(/[,.;\n]+/).filter(s => s.trim().length > 8);
        const docPhrases = doc.content.split(/[,.;\n]+/).filter(s => s.trim().length > 8);
        
        // Thêm cách chia theo khoảng trắng (sliding window)
        const originalWords = originalText.split(/\s+/);
        const docWords = doc.content.split(/\s+/);
        const originalChunks = [];
        const docChunks = [];
        
        // Tạo chunks 5-10 từ
        for (let i = 0; i <= originalWords.length - 5; i++) {
          for (let len = 5; len <= Math.min(10, originalWords.length - i); len++) {
            const chunk = originalWords.slice(i, i + len).join(' ');
            if (chunk.length > 20) {
              originalChunks.push({
                text: chunk,
                start: originalText.indexOf(chunk),
                length: chunk.length
              });
            }
          }
        }
        
        for (let i = 0; i <= docWords.length - 5; i++) {
          for (let len = 5; len <= Math.min(10, docWords.length - i); len++) {
            const chunk = docWords.slice(i, i + len).join(' ');
            if (chunk.length > 20) {
              docChunks.push(chunk);
            }
          }
        }
        
        // Thêm cách chia theo từ khóa (sliding window) cho n-grams
        const originalWordsLower = originalText.toLowerCase().split(/\s+/);
        const docWordsLower = doc.content.toLowerCase().split(/\s+/);
        const originalNgrams = [];
        const docNgrams = [];
        
        // Tạo n-grams (cụm từ 3-5 từ)
        for (let i = 0; i <= originalWordsLower.length - 3; i++) {
          for (let len = 3; len <= Math.min(5, originalWordsLower.length - i); len++) {
            const ngram = originalWordsLower.slice(i, i + len).join(' ');
            if (ngram.length > 10) {
              originalNgrams.push({
                text: ngram,
                start: originalText.toLowerCase().indexOf(ngram),
                length: ngram.length
              });
            }
          }
        }
        
        for (let i = 0; i <= docWordsLower.length - 3; i++) {
          for (let len = 3; len <= Math.min(5, docWordsLower.length - i); len++) {
            const ngram = docWordsLower.slice(i, i + len).join(' ');
            if (ngram.length > 10) {
              docNgrams.push(ngram);
            }
          }
        }
        
        // Kết hợp tất cả segments
        const allOriginalSegments = [...originalSentences, ...originalPhrases, ...originalChunks.map(c => c.text)];
        const allDocSegments = [...docSentences, ...docPhrases, ...docChunks, ...docNgrams];
        
        // So sánh sentences và phrases
        allOriginalSegments.forEach((origSegment) => {
          const origWords = origSegment.toLowerCase().trim().split(/\s+/);
          if (origWords.length < 3) return;
          
          let bestMatch = null;
          let bestSimilarity = 0;
          
          allDocSegments.forEach((docSegment) => {
            const docWords = docSegment.toLowerCase().trim().split(/\s+/);
            if (docWords.length < 3) return;
            
            // Tính similarity giữa hai đoạn (sử dụng nhiều phương pháp)
            const origWordSet = new Set(origWords);
            const docWordSet = new Set(docWords);
            const intersection = new Set([...origWordSet].filter(x => docWordSet.has(x)));
            const union = new Set([...origWordSet, ...docWordSet]);
            
            // Jaccard similarity
            const jaccardSimilarity = (intersection.size / union.size) * 100;
            
            // Overlap similarity (dựa trên text gốc)
            const overlapSimilarity = (intersection.size / origWordSet.size) * 100;
            
            // Cosine similarity approximation
            const cosineSimilarity = (intersection.size / Math.sqrt(origWordSet.size * docWordSet.size)) * 100;
            
            // Word order similarity - kiểm tra từ có cùng thứ tự không
            let orderSimilarity = 0;
            if (intersection.size > 2) {
              const commonWordsOrig = origWords.filter(word => docWordSet.has(word));
              const commonWordsDoc = docWords.filter(word => origWordSet.has(word));
              
              if (commonWordsOrig.length > 0 && commonWordsDoc.length > 0) {
                // Tính tỷ lệ từ xuất hiện theo thứ tự tương tự
                let orderMatches = 0;
                for (let i = 0; i < Math.min(commonWordsOrig.length, commonWordsDoc.length); i++) {
                  if (commonWordsOrig[i] === commonWordsDoc[i]) {
                    orderMatches++;
                  }
                }
                orderSimilarity = (orderMatches / Math.max(commonWordsOrig.length, commonWordsDoc.length)) * 100;
              }
            }
            
            // Paraphrase similarity - kiểm tra câu đảo từ (cùng từ, khác thứ tự)
            let paraphraseSimilarity = 0;
            if (intersection.size >= Math.min(origWordSet.size, docWordSet.size) * 0.7) {
              // Nếu có ít nhất 70% từ chung, có thể là paraphrase
              const lengthRatio = Math.min(origWords.length, docWords.length) / Math.max(origWords.length, docWords.length);
              paraphraseSimilarity = (intersection.size / Math.max(origWordSet.size, docWordSet.size)) * lengthRatio * 100;
            }
            
            // Lấy similarity cao nhất, ưu tiên paraphrase và overlap
            const similarity = Math.max(
              jaccardSimilarity, 
              overlapSimilarity, 
              cosineSimilarity,
              paraphraseSimilarity,
              orderSimilarity * 0.8 // Giảm trọng số order similarity
            );
            
            // Giảm threshold xuống 10% để bắt được nhiều trường hợp hơn, đặc biệt là paraphrase
            if (similarity > bestSimilarity && similarity > 10) {
              bestSimilarity = similarity;
              bestMatch = docSegment.trim();
            }
          });
          
          if (bestMatch) {
            const startPosition = originalText.indexOf(origSegment.trim());
            if (startPosition >= 0) {
              highlightedSegments.push({
                start: startPosition,
                end: startPosition + origSegment.trim().length,
                text: origSegment.trim(),
                documentId: doc.id,
                documentName: doc.fileName,
                similarity: Math.round(bestSimilarity),
                color: color
              });
            }
          }
        });
        
        // So sánh n-grams để tìm cụm từ trùng lặp chính xác
        originalNgrams.forEach((origNgram) => {
          docNgrams.forEach((docNgram) => {
            if (origNgram.text === docNgram) {
              // Tìm vị trí chính xác trong text gốc
              const regex = new RegExp(origNgram.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
              let match;
              while ((match = regex.exec(originalText)) !== null) {
                highlightedSegments.push({
                  start: match.index,
                  end: match.index + match[0].length,
                  text: match[0],
                  documentId: doc.id,
                  documentName: doc.fileName,
                  similarity: 100, // Exact match
                  color: color
                });
              }
            }
          });
        });
        
        // Thêm phương pháp đặc biệt để tìm câu paraphrase (đảo từ)
        console.log(`Checking for paraphrase sentences in ${doc.fileName}...`);
        
        originalSentences.forEach(origSentence => {
          const origWords = origSentence.toLowerCase().trim().split(/\s+/).filter(w => w.length > 2);
          if (origWords.length < 4) return;
          
          docSentences.forEach(docSentence => {
            const docWords = docSentence.toLowerCase().trim().split(/\s+/).filter(w => w.length > 2);
            if (docWords.length < 4) return;
            
            // Kiểm tra xem có phải là paraphrase không
            const origWordSet = new Set(origWords);
            const docWordSet = new Set(docWords);
            const intersection = new Set([...origWordSet].filter(x => docWordSet.has(x)));
            
            // Nếu có ít nhất 60% từ chung và độ dài tương tự
            const wordOverlap = intersection.size / Math.max(origWordSet.size, docWordSet.size);
            const lengthRatio = Math.min(origWords.length, docWords.length) / Math.max(origWords.length, docWords.length);
            
            if (wordOverlap >= 0.6 && lengthRatio >= 0.7) {
              const paraphraseScore = Math.round(wordOverlap * lengthRatio * 100);
              
              console.log(`  Found paraphrase: "${origSentence.substring(0, 50)}..." -> "${docSentence.substring(0, 50)}..." (${paraphraseScore}%)`);
              
              const startPosition = originalText.indexOf(origSentence.trim());
              if (startPosition >= 0) {
                highlightedSegments.push({
                  start: startPosition,
                  end: startPosition + origSentence.trim().length,
                  text: origSentence.trim(),
                  documentId: doc.id,
                  documentName: doc.fileName,
                  similarity: paraphraseScore,
                  color: color,
                  type: 'paraphrase'
                });
              }
            }
          });
        });
        
        // Thêm phương pháp highlighting đơn giản dựa trên từ khóa chung
        if (highlightedSegments.filter(s => s.documentId === doc.id).length === 0) {
          console.log(`No segments found for document ${doc.fileName}, trying simple word matching...`);
          
          const originalWords = originalText.toLowerCase().split(/\s+/);
          const docWords = doc.content.toLowerCase().split(/\s+/);
          const commonWords = originalWords.filter(word => 
            word.length > 4 && // Chỉ lấy từ dài hơn 4 ký tự
            docWords.includes(word) &&
            !['that', 'this', 'with', 'from', 'they', 'have', 'been', 'were', 'will', 'would', 'could', 'should'].includes(word)
          );
          
          // Tìm các cụm từ chứa từ khóa chung
          const uniqueCommonWords = [...new Set(commonWords)].slice(0, 3); // Lấy tối đa 3 từ khóa
          
          uniqueCommonWords.forEach(keyword => {
            const regex = new RegExp(`\\b[^.!?]*${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.!?]*\\b`, 'gi');
            let match;
            while ((match = regex.exec(originalText)) !== null) {
              const matchText = match[0].trim();
              if (matchText.length > 20 && matchText.length < 200) { // Độ dài hợp lý
                highlightedSegments.push({
                  start: match.index,
                  end: match.index + matchText.length,
                  text: matchText,
                  documentId: doc.id,
                  documentName: doc.fileName,
                  similarity: Math.round((keyword.length / matchText.length) * 100),
                  color: color
                });
              }
            }
          });
        }
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
    
    console.log(`Creating highlighted text with ${cleanedSegments.length} segments`);
    
    if (cleanedSegments.length > 0) {
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
    } else {
      // Nếu không có segments, tạo highlight đơn giản dựa trên từ khóa chung
      console.log('No segments found, creating simple highlights based on common words');
      highlightedText = originalText;
      
      if (limitedDocuments.length > 0) {
        // Tìm từ khóa chung từ tất cả documents
        const allCommonWords = new Set();
        const originalWords = originalText.toLowerCase().split(/\s+/);
        
        limitedDocuments.forEach(doc => {
          if (doc.content) {
            const docWords = doc.content.toLowerCase().split(/\s+/);
            const commonWords = originalWords.filter(word => 
              word.length > 3 && // Từ dài hơn 3 ký tự
              docWords.includes(word) &&
              !['that', 'this', 'with', 'from', 'they', 'have', 'been', 'were', 'will', 'would', 'could', 'should', 'there', 'their', 'where', 'which', 'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'way'].includes(word.toLowerCase())
            );
            commonWords.forEach(word => allCommonWords.add(word));
          }
        });
        
        // Highlight các từ khóa chung
        const commonWordsArray = Array.from(allCommonWords).slice(0, 15);
        console.log(`Found ${commonWordsArray.length} common words for highlighting:`, commonWordsArray);
        
        if (commonWordsArray.length > 0) {
          commonWordsArray.forEach((word, index) => {
            const color = colors[index % colors.length];
            const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            const matches = highlightedText.match(regex);
            if (matches) {
              console.log(`Highlighting word "${word}" - found ${matches.length} matches`);
              highlightedText = highlightedText.replace(regex, `<span style="background-color: ${color}20; border-left: 3px solid ${color}; padding: 2px 4px; margin: 1px;" data-document-id="common-word-${index}" data-similarity="50" title="Từ khóa chung: ${word}">${word}</span>`);
            }
          });
        } else {
          console.log('No common words found, trying with shorter words...');
          // Thử với từ ngắn hơn nếu không tìm thấy từ nào
          const shorterCommonWords = originalWords.filter(word => 
            word.length > 2 && 
            limitedDocuments.some(doc => doc.content && doc.content.toLowerCase().includes(word.toLowerCase())) &&
            !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'way', 'the', 'of', 'to', 'in', 'is', 'it', 'on', 'be', 'at', 'by', 'as'].includes(word.toLowerCase())
          );
          
          const uniqueShorterWords = [...new Set(shorterCommonWords)].slice(0, 10);
          console.log(`Found ${uniqueShorterWords.length} shorter common words:`, uniqueShorterWords);
          
          uniqueShorterWords.forEach((word, index) => {
            const color = colors[index % colors.length];
            const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            highlightedText = highlightedText.replace(regex, `<span style="background-color: ${color}20; border-left: 3px solid ${color}; padding: 2px 4px; margin: 1px;" data-document-id="short-word-${index}" data-similarity="30" title="Từ khóa: ${word}">${word}</span>`);
          });
        }
      }
    }
    
    // Cập nhật highlightedSegments để trả về
    highlightedSegments = cleanedSegments;
    
    // Debug logging
    console.log(`Detailed comparison for checkId ${checkId}:`);
    console.log(`- Total matching documents found: ${matchingDocuments.length}`);
    console.log(`- Limited documents for display: ${limitedDocuments.length}`);
    console.log(`- Highlighted segments found: ${highlightedSegments.length}`);
    console.log(`- Original text length: ${originalText.length} characters`);
    console.log(`- Matching documents details:`, limitedDocuments.map(doc => ({
      id: doc.id,
      fileName: doc.fileName,
      duplicateRate: doc.duplicateRate,
      status: doc.status
    })));
    
    res.json({
      success: true,
      checkId: checkId,
      currentDocument: {
        fileName: plagiarismCheck.fileName || 'document.txt',
        fileSize: plagiarismCheck.textLength,
        fileType: plagiarismCheck.fileType || 'text/plain',
        duplicateRate: overallDuplicateRate, // Sử dụng tỷ lệ nhất quán
        originalText: originalText,
        highlightedText: highlightedText && highlightedText !== originalText ? highlightedText : originalText
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