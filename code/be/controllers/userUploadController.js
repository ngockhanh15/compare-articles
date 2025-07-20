const multer = require('multer');
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');
const documentAVLService = require('../services/DocumentAVLService');
const plagiarismDetectionService = require('../services/PlagiarismDetectionService');
const PlagiarismCheck = require('../models/PlagiarismCheck');

// Configure multer for memory storage (files are not saved to disk)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-powerpoint' // .ppt
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file định dạng TXT, DOC, DOCX, PDF, XLS, XLSX, PPT, PPTX'), false);
    }
  }
});

// Helper function to get file type from mime type
const getFileTypeFromMime = (mimeType) => {
  const mimeToType = {
    'text/plain': 'txt',
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.ms-powerpoint': 'ppt'
  };
  return mimeToType[mimeType] || 'unknown';
};

// Extract text from uploaded file buffer (in memory)
const extractTextFromBuffer = async (buffer, mimeType) => {
  try {
    switch (mimeType) {
      case 'text/plain':
        return buffer.toString('utf8');
        
      case 'application/pdf':
        const pdfData = await pdfParse(buffer);
        return pdfData.text;
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': // .docx
        const docxResult = await mammoth.extractRawText({ buffer: buffer });
        return docxResult.value;
        
      case 'application/msword': // .doc
        try {
          const docResult = await mammoth.extractRawText({ buffer: buffer });
          return docResult.value;
        } catch (docError) {
          throw new Error('File .doc này có thể không được hỗ trợ đầy đủ. Vui lòng chuyển đổi sang .docx');
        }
        
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': // .xlsx
      case 'application/vnd.ms-excel': // .xls
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        let excelText = '';
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetData = XLSX.utils.sheet_to_csv(worksheet);
          excelText += `Sheet: ${sheetName}\n${sheetData}\n\n`;
        });
        return excelText;
        
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': // .pptx
      case 'application/vnd.ms-powerpoint': // .ppt
        return 'PowerPoint file - Text extraction not fully supported yet. Please convert to PDF or Word format for better text extraction.';
        
      default:
        throw new Error(`Định dạng file ${mimeType} chưa được hỗ trợ`);
    }
  } catch (error) {
    console.error('Error extracting text from buffer:', error);
    throw new Error(`Không thể đọc nội dung file: ${error.message}`);
  }
};

// Extract text from file (no plagiarism check, just text extraction)
exports.extractTextFromFile = [
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file được upload'
        });
      }

      const mimeType = req.file.mimetype;
      const fileType = getFileTypeFromMime(mimeType);

      console.log(`Extracting text from file: ${req.file.originalname}`);

      // Extract text from file buffer
      const extractedText = await extractTextFromBuffer(req.file.buffer, mimeType);
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('Không thể trích xuất nội dung từ file hoặc file rỗng');
      }

      res.json({
        success: true,
        extractedText: extractedText,
        file: {
          name: req.file.originalname,
          type: fileType,
          size: req.file.size,
          mimeType: mimeType
        },
        textLength: extractedText.length,
        wordCount: extractedText.split(/\s+/).filter(word => word.length > 0).length,
        message: 'Trích xuất văn bản thành công'
      });
      
    } catch (error) {
      console.error('Text extraction error:', error);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi trích xuất văn bản từ file'
      });
    }
  }
];

// Upload file for plagiarism check (in memory, not saved)
exports.uploadForCheck = [
  upload.single('file'),
  async (req, res) => {
    const startTime = Date.now();

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file được upload'
        });
      }

      const mimeType = req.file.mimetype;
      const fileType = getFileTypeFromMime(mimeType);

      console.log(`Processing file for plagiarism check: ${req.file.originalname}`);

      // Extract text from file buffer
      const extractedText = await extractTextFromBuffer(req.file.buffer, mimeType);
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('Không thể trích xuất nội dung từ file hoặc file rỗng');
      }

      // Get check options from request
      const options = {
        minSimilarity: parseInt(req.body.sensitivity === 'high' ? 60 : req.body.sensitivity === 'low' ? 80 : 50),
        chunkSize: 50,
        maxResults: 20
      };

      // Check for duplicate content using PlagiarismDetectionService
      const duplicateResult = await plagiarismDetectionService.checkPlagiarism(extractedText, options);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Determine status based on duplicate percentage
      const getStatus = (percentage) => {
        if (percentage > 30) return 'high';
        if (percentage > 15) return 'medium';
        return 'low';
      };

      // Create plagiarism check record
      const plagiarismCheck = new PlagiarismCheck({
        user: req.user.id,
        originalText: extractedText.substring(0, 10000), // Store first 10k chars for reference
        textLength: extractedText.length,
        wordCount: extractedText.split(/\s+/).length,
        duplicatePercentage: duplicateResult.duplicatePercentage,
        matches: duplicateResult.matches.map(match => ({
          text: match.text ? match.text.substring(0, 500) : '', // Limit stored text
          source: match.source || 'internal-database',
          similarity: match.similarity,
          url: match.url || '', // No URL for internal documents
          matchedWords: match.matchedWords || 0
        })),
        sources: duplicateResult.sources,
        confidence: duplicateResult.confidence,
        status: getStatus(duplicateResult.duplicatePercentage),
        source: 'file',
        fileName: req.file.originalname,
        fileType: fileType,
        processingTime: processingTime,
        options: {
          checkInternet: false, // Only checking internal database
          checkDatabase: true,
          sensitivity: req.body.sensitivity || 'medium',
          language: req.body.language || 'vi'
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      await plagiarismCheck.save();

      // Prepare response
      const response = {
        success: true,
        checkId: plagiarismCheck._id,
        result: {
          duplicatePercentage: duplicateResult.duplicatePercentage,
          status: plagiarismCheck.status,
          confidence: plagiarismCheck.confidence,
          wordCount: plagiarismCheck.wordCount,
          textLength: plagiarismCheck.textLength,
          processingTime: processingTime,
          matches: duplicateResult.matches.map(match => ({
            source: match.source || 'internal-database',
            similarity: match.similarity,
            text: match.text ? match.text.substring(0, 200) + '...' : '',
            method: match.method || 'unknown'
          })),
          sources: duplicateResult.sources,
          totalMatches: duplicateResult.matches ? duplicateResult.matches.length : 0,
          checkedDocuments: duplicateResult.totalDocumentsChecked || 0,
          // Thêm các thông số mới
          dtotal: duplicateResult.dtotal || 0,
          dab: duplicateResult.dab || 0,
          mostSimilarDocument: duplicateResult.mostSimilarDocument || null
        },
        file: {
          name: req.file.originalname,
          type: fileType,
          size: req.file.size
        },
        message: 'Kiểm tra đạo văn hoàn tất'
      };

      res.json(response);
      
    } catch (error) {
      console.error('User upload check error:', error);
      
      res.status(500).json({
        success: false,
        message: error.message || 'Lỗi khi kiểm tra file'
      });
    }
  }
];

// Check text content (without file upload)
exports.checkTextContent = async (req, res) => {
  const startTime = Date.now();

  try {
    const { text, options = {} } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung text không được để trống'
      });
    }

    if (text.length > 100000) { // 100k character limit
      return res.status(400).json({
        success: false,
        message: 'Nội dung text quá dài (tối đa 100,000 ký tự)'
      });
    }

    console.log(`Processing text for plagiarism check: ${text.length} characters`);

    // Get check options
    const checkOptions = {
      minSimilarity: parseInt(options.sensitivity === 'high' ? 60 : options.sensitivity === 'low' ? 80 : 50),
      chunkSize: 50,
      maxResults: 20
    };

    // Check for duplicate content using PlagiarismDetectionService
    const duplicateResult = await plagiarismDetectionService.checkPlagiarism(text, checkOptions);

    // Debug logging
    console.log('🔍 DEBUG - PlagiarismDetectionService result:');
    console.log('- duplicatePercentage:', duplicateResult.duplicatePercentage);
    console.log('- confidence:', duplicateResult.confidence);
    console.log('- matches count:', duplicateResult.matches ? duplicateResult.matches.length : 0);
    if (duplicateResult.matches && duplicateResult.matches.length > 0) {
      console.log('- matches details:');
      duplicateResult.matches.forEach((match, index) => {
        console.log(`  ${index + 1}. similarity: ${match.similarity}%, method: ${match.method}`);
      });
    }

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Determine status based on duplicate percentage
    const getStatus = (percentage) => {
      if (percentage > 30) return 'high';
      if (percentage > 15) return 'medium';
      return 'low';
    };

    // Create plagiarism check record
    const plagiarismCheck = new PlagiarismCheck({
      user: req.user.id,
      originalText: text, // Store full text for detailed comparison
      textLength: text.length,
      wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
      duplicatePercentage: duplicateResult.duplicatePercentage,
      matches: duplicateResult.matches.map(match => ({
        text: match.text ? match.text.substring(0, 500) : '', // Limit stored text
        source: match.source || 'internal-database',
        similarity: match.similarity,
        url: match.url || '', // No URL for internal documents
        matchedWords: match.matchedWords || 0
      })),
      sources: duplicateResult.sources,
      confidence: duplicateResult.confidence,
      status: getStatus(duplicateResult.duplicatePercentage),
      source: 'text',
      processingTime: processingTime,
      options: {
        checkInternet: false, // Only checking internal database
        checkDatabase: true,
        sensitivity: options.sensitivity || 'medium',
        language: options.language || 'vi'
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await plagiarismCheck.save();

    // Prepare response
    const response = {
      success: true,
      checkId: plagiarismCheck._id,
      result: {
        duplicatePercentage: duplicateResult.duplicatePercentage,
        status: plagiarismCheck.status,
        confidence: plagiarismCheck.confidence,
        wordCount: plagiarismCheck.wordCount,
        textLength: plagiarismCheck.textLength,
        processingTime: processingTime,
        matches: duplicateResult.matches.map(match => ({
          source: match.source || 'internal-database',
          similarity: match.similarity,
          text: match.text ? match.text.substring(0, 200) + '...' : '',
          method: match.method || 'unknown'
        })),
        sources: duplicateResult.sources,
        totalMatches: duplicateResult.matches ? duplicateResult.matches.length : 0,
        checkedDocuments: duplicateResult.totalDocumentsChecked || 0,
        // Thêm các thông số mới
        dtotal: duplicateResult.dtotal || 0,
        dab: duplicateResult.dab || 0,
        mostSimilarDocument: duplicateResult.mostSimilarDocument || null
      },
      message: 'Kiểm tra đạo văn hoàn tất'
    };

    res.json(response);
    
  } catch (error) {
    console.error('Text content check error:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi kiểm tra nội dung'
    });
  }
};

// Get AVL tree statistics
exports.getTreeStats = async (req, res) => {
  try {
    const stats = documentAVLService.getTreeStats();
    
    res.json({
      success: true,
      stats: stats,
      message: 'Thống kê cây AVL tài liệu'
    });
    
  } catch (error) {
    console.error('Get tree stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê'
    });
  }
};

module.exports = exports;