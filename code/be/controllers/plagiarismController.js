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
    
    // 3. Kết hợp với cache để tối ưu hóa
    const similarChunks = plagiarismCacheService.findSimilarChunks(text, 0.8);
    
    // Nếu có similar chunks từ cache, thêm vào kết quả
    if (similarChunks.length > 0) {
      console.log(`Found ${similarChunks.length} similar chunks in cache`);
      
      similarChunks.slice(0, 2).forEach((chunk, index) => {
        if (chunk.similarity > 80) {
          // Kiểm tra xem match này đã có chưa để tránh duplicate
          const existingMatch = result.matches.find(m => 
            m.text.includes(chunk.originalChunk.text.substring(0, 50))
          );
          
          if (!existingMatch) {
            result.matches.push({
              text: chunk.originalChunk.text.substring(0, 200) + '...',
              source: `cached-database-${index + 1}`,
              similarity: Math.floor(chunk.similarity),
              url: `internal://cached/${chunk.matchedChunk.fullHash}`,
              matchedWords: Math.floor(chunk.originalChunk.text.split(/\s+/).length * chunk.similarity / 100),
              fromCache: true
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
      if (similarChunks.length > 0) {
        const avgCacheSimilarity = similarChunks.reduce((sum, chunk) => sum + chunk.similarity, 0) / similarChunks.length;
        result.duplicatePercentage = Math.max(result.duplicatePercentage, Math.floor(avgCacheSimilarity * 0.9));
      }
    }
    
    // 4. Cập nhật confidence dựa trên kết quả cuối cùng
    if (result.duplicatePercentage > 30) {
      result.confidence = 'high';
    } else if (result.duplicatePercentage > 15) {
      result.confidence = 'medium';
    } else {
      result.confidence = 'low';
    }
    
    // 5. Cache kết quả mới để sử dụng cho lần sau
    plagiarismCacheService.cacheResult(text, result);
    
    // 6. Cập nhật processing time
    result.processingTime = Date.now() - startTime;
    result.fromCache = false;
    result.cacheOptimized = similarChunks.length > 0;
    result.similarChunksFound = similarChunks.length;
    
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
    const { text, options = {} } = req.body;
    
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
      if (percentage > 30) return 'high';
      if (percentage > 15) return 'medium';
      return 'low';
    };

    res.json({
      success: true,
      duplicatePercentage: result.duplicatePercentage,
      matches: result.matches,
      sources: result.sources,
      confidence: result.confidence,
      status: getStatus(result.duplicatePercentage),
      processingTime: result.processingTime,
      totalDocumentsInDatabase: result.totalDocumentsChecked || 0,
      totalChunksInDatabase: result.totalChunksChecked || 0,
      fromCache: result.fromCache || false,
      cacheOptimized: result.cacheOptimized || false,
      similarChunksFound: result.similarChunksFound || 0
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
    // Hệ thống không lưu file sau khi xử lý, trả về danh sách rỗng
    res.json({
      success: true,
      files: [],
      total: 0,
      message: 'Hệ thống không lưu file sau khi xử lý để bảo mật và tiết kiệm dung lượng'
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
    
    res.json({
      success: true,
      originalText: plagiarismCheck.originalText,
      matches: plagiarismCheck.matches,
      duplicatePercentage: plagiarismCheck.duplicatePercentage,
      similarChunks: similarChunks.slice(0, 3), // Top 3 similar chunks
      detailedAnalysis: {
        wordCount: plagiarismCheck.wordCount,
        textLength: plagiarismCheck.textLength,
        confidence: plagiarismCheck.confidence,
        status: plagiarismCheck.status
      }
    });
    
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
    
    res.json({
      success: true,
      checkId: checkId,
      originalText: plagiarismCheck.originalText.substring(0, 500) + '...',
      totalDocumentsCompared: systemStats.totalDocuments,
      totalChunksCompared: systemStats.totalChunks,
      matches: plagiarismCheck.matches,
      sources: plagiarismCheck.sources,
      duplicatePercentage: plagiarismCheck.duplicatePercentage,
      processingTime: plagiarismCheck.processingTime,
      systemInitialized: systemStats.initialized
    });
    
  } catch (error) {
    console.error('Get all documents comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy so sánh với tất cả tài liệu'
    });
  }
};
