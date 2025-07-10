const PlagiarismCheck = require('../models/PlagiarismCheck');
const plagiarismCacheService = require('../services/PlagiarismCacheService');
const plagiarismDetectionService = require('../services/PlagiarismDetectionService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

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
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Hiện tại chỉ hỗ trợ file định dạng TXT'), false);
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
    if (fileType === 'text/plain') {
      return await fs.readFile(filePath, 'utf8');
    }
    
    // For other file types, throw error - no mock data
    throw new Error(`Định dạng file ${fileType} chưa được hỗ trợ. Hiện tại chỉ hỗ trợ file .txt`);
  } catch (error) {
    throw new Error('Không thể đọc nội dung file');
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
      
      // Không xóa file, giữ lại để xử lý sau
      // await fs.unlink(filePath);
      
      res.json({
        success: true,
        extractedText,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        filePath: filePath, // Trả về đường dẫn file để xử lý sau
        uploadedFileName: req.file.filename, // Tên file đã được rename
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
    
    const startTime = Date.now();
    
    // Perform plagiarism check
    const result = await performPlagiarismCheck(text, options);
    
    const processingTime = Date.now() - startTime;
    
    // Determine status based on duplicate percentage
    const getStatus = (percentage) => {
      if (percentage > 30) return 'high';
      if (percentage > 15) return 'medium';
      return 'low';
    };

    // Save to database
    const plagiarismCheck = new PlagiarismCheck({
      user: req.user.id,
      originalText: text,
      textLength: text.length,
      wordCount: text.trim().split(/\s+/).length,
      duplicatePercentage: result.duplicatePercentage,
      status: getStatus(result.duplicatePercentage),
      matches: result.matches,
      sources: result.sources,
      confidence: result.confidence,
      source: 'text',
      processingTime,
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
    
    // Thêm document mới vào cây AVL để sử dụng cho các lần kiểm tra sau
    try {
      await plagiarismDetectionService.addNewDocument(text, result);
    } catch (error) {
      console.error('Error adding document to AVL tree:', error);
      // Không throw error vì việc lưu vào database đã thành công
    }
    
    res.json({
      success: true,
      checkId: plagiarismCheck._id,
      duplicatePercentage: result.duplicatePercentage,
      matches: result.matches,
      sources: result.sources,
      confidence: result.confidence,
      processingTime: result.processingTime,
      totalDocumentsInDatabase: result.totalDocumentsChecked || 0,
      totalChunksInDatabase: result.totalChunksChecked || 0
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
    const uploadsDir = path.join(__dirname, '../uploads');
    
    // Đọc danh sách file trong thư mục uploads
    const files = await fs.readdir(uploadsDir);
    
    const fileList = [];
    for (const file of files) {
      try {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          fileList.push({
            fileName: file,
            filePath: filePath,
            size: stats.size,
            uploadedAt: stats.birthtime,
            modifiedAt: stats.mtime
          });
        }
      } catch (error) {
        console.error(`Error reading file ${file}:`, error);
      }
    }
    
    // Sắp xếp theo thời gian upload (mới nhất trước)
    fileList.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    
    res.json({
      success: true,
      files: fileList,
      total: fileList.length
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

// Delete uploaded file
exports.deleteUploadedFile = async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: 'Tên file không được để trống'
      });
    }
    
    const filePath = path.join(__dirname, '../uploads', fileName);
    
    // Kiểm tra file có tồn tại không
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File không tồn tại'
      });
    }
    
    // Xóa file
    await fs.unlink(filePath);
    
    res.json({
      success: true,
      message: 'Đã xóa file thành công',
      deletedFile: fileName
    });
    
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa file'
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

// Get file content for analysis
exports.getFileContent = async (req, res) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName) {
      return res.status(400).json({
        success: false,
        message: 'Tên file không được để trống'
      });
    }
    
    const filePath = path.join(__dirname, '../uploads', fileName);
    
    // Kiểm tra file có tồn tại không
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File không tồn tại'
      });
    }
    
    // Đọc thông tin file
    const stats = await fs.stat(filePath);
    const fileExtension = path.extname(fileName).toLowerCase();
    
    let content = '';
    let fileType = 'unknown';
    
    // Xác định loại file và đọc nội dung
    if (fileExtension === '.txt') {
      content = await fs.readFile(filePath, 'utf8');
      fileType = 'text/plain';
    } else {
      // Với các file khác, chỉ trả về thông tin cơ bản
      content = 'Binary file - content not displayable';
      fileType = 'binary';
    }
    
    res.json({
      success: true,
      fileName: fileName,
      filePath: filePath,
      fileSize: stats.size,
      fileType: fileType,
      uploadedAt: stats.birthtime,
      modifiedAt: stats.mtime,
      content: content.length > 1000 ? content.substring(0, 1000) + '...' : content,
      fullContentLength: content.length
    });
    
  } catch (error) {
    console.error('Get file content error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đọc nội dung file'
    });
  }
};

// Clean up old files (admin only)
exports.cleanupOldFiles = async (req, res) => {
  try {
    const { daysOld = 30 } = req.body; // Mặc định xóa file cũ hơn 30 ngày
    const uploadsDir = path.join(__dirname, '../uploads');
    
    const files = await fs.readdir(uploadsDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let deletedCount = 0;
    let totalSize = 0;
    
    for (const file of files) {
      try {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile() && stats.mtime < cutoffDate) {
          totalSize += stats.size;
          await fs.unlink(filePath);
          deletedCount++;
        }
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }
    
    res.json({
      success: true,
      message: `Đã xóa ${deletedCount} file cũ`,
      deletedCount: deletedCount,
      totalSizeFreed: totalSize,
      cutoffDate: cutoffDate.toISOString(),
      daysOld: daysOld
    });
    
  } catch (error) {
    console.error('Cleanup old files error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi dọn dẹp file cũ'
    });
  }
};