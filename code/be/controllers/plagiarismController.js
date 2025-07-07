const PlagiarismCheck = require('../models/PlagiarismCheck');
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
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file định dạng: TXT, PDF, DOC, DOCX'), false);
    }
  }
});

// Mock function to simulate plagiarism checking
// Trong thực tế, bạn sẽ tích hợp với service thực tế như Turnitin, Copyscape, etc.
const simulatePlagiarismCheck = async (text, options = {}) => {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  const words = text.trim().split(/\s+/);
  const wordCount = words.length;
  
  // Mock duplicate percentage (in real implementation, this would come from actual checking)
  const duplicatePercentage = Math.floor(Math.random() * 50) + 5; // 5-55%
  
  // Mock matches
  const matches = [];
  if (duplicatePercentage > 10) {
    // Create some mock matches
    const numMatches = Math.floor(duplicatePercentage / 15) + 1;
    
    for (let i = 0; i < Math.min(numMatches, 3); i++) {
      const startPos = Math.floor(Math.random() * Math.max(1, text.length - 100));
      const endPos = Math.min(startPos + 80 + Math.floor(Math.random() * 40), text.length);
      
      matches.push({
        text: text.substring(startPos, endPos) + '...',
        source: ['example.com', 'sample-site.org', 'academic-database.edu'][i] || 'unknown-source.com',
        similarity: Math.floor(duplicatePercentage * (0.8 + Math.random() * 0.4)),
        url: `https://${['example.com', 'sample-site.org', 'academic-database.edu'][i] || 'unknown-source.com'}/article${i + 1}`,
        matchedWords: Math.floor(wordCount * duplicatePercentage / 100 / numMatches)
      });
    }
  }
  
  const sources = [...new Set(matches.map(m => m.source))];
  
  return {
    duplicatePercentage,
    matches,
    sources,
    confidence: duplicatePercentage > 30 ? 'high' : duplicatePercentage > 15 ? 'medium' : 'low',
    processingTime: 1000 + Math.random() * 2000
  };
};

// Extract text from uploaded file
const extractTextFromFile = async (filePath, fileType) => {
  try {
    if (fileType === 'text/plain') {
      return await fs.readFile(filePath, 'utf8');
    }
    
    // For PDF, DOC, DOCX files, you would use libraries like:
    // - pdf-parse for PDF
    // - mammoth for DOCX
    // - textract for various formats
    
    // Mock implementation - in reality, implement proper text extraction
    const mockText = `Đây là nội dung được trích xuất từ file ${path.basename(filePath)}. 
    Trong thực tế, bạn cần sử dụng các thư viện như pdf-parse, mammoth, hoặc textract 
    để trích xuất text từ các định dạng file khác nhau. Nội dung này chỉ là mock data 
    để test chức năng upload file.`;
    
    return mockText;
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
    const result = await simulatePlagiarismCheck(text, options);
    
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
    
    res.json({
      success: true,
      duplicatePercentage: result.duplicatePercentage,
      matches: result.matches,
      sources: result.sources,
      confidence: result.confidence,
      processingTime: result.processingTime
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
    
    // Lấy thông tin file
    const stats = await fs.stat(filePath);
    const fileExtension = path.extname(fileName).toLowerCase();
    
    // Xác định mime type dựa trên extension
    let mimeType = 'application/octet-stream';
    switch (fileExtension) {
      case '.txt':
        mimeType = 'text/plain';
        break;
      case '.pdf':
        mimeType = 'application/pdf';
        break;
      case '.doc':
        mimeType = 'application/msword';
        break;
      case '.docx':
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
    }
    
    // Extract text từ file
    const extractedText = await extractTextFromFile(filePath, mimeType);
    
    res.json({
      success: true,
      fileName: fileName,
      filePath: filePath,
      fileSize: stats.size,
      mimeType: mimeType,
      extractedText: extractedText,
      uploadedAt: stats.birthtime,
      modifiedAt: stats.mtime
    });
    
  } catch (error) {
    console.error('Get file content error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đọc nội dung file'
    });
  }
};

// Clean up old files (utility function)
exports.cleanupOldFiles = async (req, res) => {
  try {
    const { daysOld = 7 } = req.query; // Mặc định xóa file cũ hơn 7 ngày
    const uploadsDir = path.join(__dirname, '../uploads');
    
    const files = await fs.readdir(uploadsDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysOld));
    
    let deletedCount = 0;
    const deletedFiles = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile() && stats.birthtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
          deletedFiles.push({
            fileName: file,
            uploadedAt: stats.birthtime,
            size: stats.size
          });
        }
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
      }
    }
    
    res.json({
      success: true,
      message: `Đã xóa ${deletedCount} file cũ`,
      deletedCount,
      deletedFiles,
      cutoffDate
    });
    
  } catch (error) {
    console.error('Cleanup files error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi dọn dẹp file cũ'
    });
  }
};