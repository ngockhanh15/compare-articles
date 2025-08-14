const Document = require('../models/Document');
const documentAVLService = require('../services/DocumentAVLService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');
const { logAction } = require('../utils/auditLogger');

// Configure multer for file uploads with persistent storage
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
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${sanitizedName}-${uniqueSuffix}${ext}`);
  }
});

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

// Extract text from uploaded file
const extractTextFromFile = async (filePath, mimeType) => {
  try {
    switch (mimeType) {
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
        try {
          const docResult = await mammoth.extractRawText({ path: filePath });
          return docResult.value;
        } catch (docError) {
          throw new Error('File .doc này có thể không được hỗ trợ đầy đủ. Vui lòng chuyển đổi sang .docx');
        }
        
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': // .xlsx
      case 'application/vnd.ms-excel': // .xls
        const workbook = XLSX.readFile(filePath);
        let excelText = '';
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetData = XLSX.utils.sheet_to_csv(worksheet);
          excelText += `Sheet: ${sheetName}\n${sheetData}\n\n`;
        });
        return excelText;
        
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': // .pptx
      case 'application/vnd.ms-powerpoint': // .ppt
        // For PowerPoint files, we'll return a placeholder text
        // Full text extraction would require additional libraries like node-pptx
        return 'PowerPoint file - Text extraction not fully supported yet. Please convert to PDF or Word format for better text extraction.';
        
      default:
        throw new Error(`Định dạng file ${mimeType} chưa được hỗ trợ`);
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error(`Không thể đọc nội dung file: ${error.message}`);
  }
};

// Upload and save document
exports.uploadDocument = [
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file được upload'
        });
      }

      const { title, author, description, tags, isPublic } = req.body;
      const filePath = req.file.path;
      const mimeType = req.file.mimetype;
      const fileType = getFileTypeFromMime(mimeType);

      // Create document record
      const document = new Document({
        title: title || req.file.originalname,
        author: author || '',
        fileName: req.file.filename,
        originalFileName: req.file.originalname,
        filePath: filePath,
        fileType: fileType,
        mimeType: mimeType,
        fileSize: req.file.size,
        uploadedBy: req.user.id,
        description: description || '',
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        isPublic: isPublic === 'true',
        status: 'processing'
      });

      await document.save();

      // Extract text in background
      try {
        const extractedText = await extractTextFromFile(filePath, mimeType);
        document.extractedText = extractedText;
        document.status = 'processed';
        await document.save();

        // Add document to AVL tree for plagiarism checking and save tree data
        try {
          const avlTreeData = await documentAVLService.addDocumentToTree(document);
          if (avlTreeData && avlTreeData.success) {
            console.log(`Document "${document.title}" added to AVL tree: ${avlTreeData.sentenceCount} sentences, ${avlTreeData.uniqueTokenCount} tokens`);
            
            // Force save the updated AVL tree to database
            try {
              await documentAVLService.forceSave();
              console.log(`✅ Global AVL Tree saved to database after adding document "${document.title}"`);
            } catch (saveError) {
              console.error('Error saving AVL tree to database:', saveError);
            }
          }
        } catch (avlError) {
          console.error('Error adding document to AVL tree:', avlError);
          // Don't fail the upload if AVL tree addition fails
        }
      } catch (extractError) {
        console.error('Text extraction error:', extractError);
        document.status = 'failed';
        document.processingError = extractError.message;
        await document.save();
      }

      res.json({
        success: true,
        document: {
          id: document._id,
          title: document.title,
          fileName: document.originalFileName,
          fileType: document.fileType,
          fileSize: document.fileSize,
          status: document.status,
          uploadedAt: document.createdAt
        },
        message: 'File đã được upload thành công'
      });
      // Fire-and-forget audit log
      logAction({
        req,
        action: 'upload_document',
        targetType: 'document',
        targetId: String(document._id),
        targetName: document.title,
        metadata: { fileType: document.fileType, fileSize: document.fileSize }
      });
      
    } catch (error) {
      console.error('Document upload error:', error);
      
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
        message: error.message || 'Lỗi khi upload file'
      });
    }
  }
];

// Get user documents with pagination and filters
exports.getUserDocuments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      fileType = 'all',
      status = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      fileType,
      status,
      sortBy,
      sortOrder
    };

    const documents = await Document.getUserDocuments(req.user.id, options);
    const total = await Document.countDocuments({ 
      uploadedBy: req.user.id,
      ...(search && {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { originalFileName: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      }),
      ...(fileType !== 'all' && { fileType }),
      ...(status !== 'all' && { status })
    });

    const documentsWithDetails = documents.map(doc => ({
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
      status: doc.status,
      description: doc.description,
      tags: doc.tags,
      isPublic: doc.isPublic
    }));

    res.json({
      success: true,
      documents: documentsWithDetails,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalDocuments: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách tài liệu'
    });
  }
};

// Get document by ID
exports.getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findOne({
      _id: id,
      $or: [
        { uploadedBy: req.user.id },
        { isPublic: true }
      ]
    }).populate('uploadedBy', 'name email');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài liệu'
      });
    }

    res.json({
      success: true,
      document: {
        _id: document._id,
        title: document.title,
        fileName: document.originalFileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        uploadedBy: {
          name: document.uploadedBy.name,
          email: document.uploadedBy.email
        },
        uploadedAt: document.createdAt,
        checkCount: document.checkCount,
        lastChecked: document.lastChecked,
        downloadCount: document.downloadCount,
        status: document.status,
        description: document.description,
        tags: document.tags,
        isPublic: document.isPublic,
        extractedText: document.extractedText
      }
    });
    
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin tài liệu'
    });
  }
};

// Download document
exports.downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findOne({
      _id: id,
      $or: [
        { uploadedBy: req.user.id },
        { isPublic: true }
      ]
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài liệu'
      });
    }

    // Check if file exists
    const fileExists = fsSync.existsSync(document.filePath);
    if (!fileExists) {
      return res.status(404).json({
        success: false,
        message: 'File không tồn tại trên server'
      });
    }

    // Increment download count
    await document.incrementDownloadCount();

    // Set headers for file download
  res.setHeader('Content-Disposition', `attachment; filename="${document.originalFileName}"`);
    res.setHeader('Content-Type', document.mimeType);
    
    // Stream file to response
    const fileStream = fsSync.createReadStream(document.filePath);
    fileStream.pipe(res);
    // Audit log for download
    logAction({
      req,
      action: 'download_document',
      targetType: 'document',
      targetId: String(document._id),
      targetName: document.title,
    });
    
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải xuống tài liệu'
    });
  }
};

// Update document
exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, tags, isPublic } = req.body;

    const document = await Document.findOne({
      _id: id,
      uploadedBy: req.user.id
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài liệu'
      });
    }

    // Update fields
    if (title) document.title = title;
    if (description !== undefined) document.description = description;
    if (tags) document.tags = tags.split(',').map(tag => tag.trim());
    if (isPublic !== undefined) document.isPublic = isPublic === 'true';

    await document.save();

    res.json({
      success: true,
      document: {
        _id: document._id,
        title: document.title,
        description: document.description,
        tags: document.tags,
        isPublic: document.isPublic
      },
      message: 'Cập nhật tài liệu thành công'
    });
    logAction({
      req,
      action: 'update_document',
      targetType: 'document',
      targetId: String(document._id),
      targetName: document.title,
      metadata: { title, description, isPublic }
    });
    
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật tài liệu'
    });
  }
};

// Delete document
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findOne({
      _id: id,
      uploadedBy: req.user.id
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài liệu'
      });
    }

    // Delete file from filesystem
    try {
      await fs.unlink(document.filePath);
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
    }

    // Remove document from AVL tree
    try {
      await documentAVLService.removeDocumentFromTree(document._id);
      console.log(`Document "${document.title}" removed from AVL tree`);
    } catch (avlError) {
      console.error('Error removing document from AVL tree:', avlError);
      // Continue with deletion even if AVL tree removal fails
    }

    // Delete document from database
    await document.remove();

    res.json({
      success: true,
      message: 'Xóa tài liệu thành công'
    });
    logAction({
      req,
      action: 'delete_document',
      targetType: 'document',
      targetId: String(document._id),
      targetName: document.title,
    });
    
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa tài liệu'
    });
  }
};

// Get document statistics
exports.getDocumentStats = async (req, res) => {
  try {
    const stats = await Document.getDocumentStats(req.user.id);
    const totalDocuments = await Document.countDocuments({ uploadedBy: req.user.id });
    
    // Calculate total storage used
    const totalStorage = stats.reduce((sum, stat) => sum + stat.totalSize, 0);
    
    res.json({
      success: true,
      stats: {
        totalDocuments,
        totalStorage,
        byFileType: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            totalSize: stat.totalSize,
            avgSize: Math.round(stat.avgSize),
            totalChecks: stat.totalChecks,
            totalDownloads: stat.totalDownloads
          };
          return acc;
        }, {})
      }
    });
    
  } catch (error) {
    console.error('Get document stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê tài liệu'
    });
  }
};

// Get extracted text from document for plagiarism check
exports.getDocumentText = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findOne({
      _id: id,
      $or: [
        { uploadedBy: req.user.id },
        { isPublic: true }
      ]
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài liệu'
      });
    }

    if (document.status !== 'processed') {
      return res.status(400).json({
        success: false,
        message: 'Tài liệu chưa được xử lý hoặc xử lý thất bại'
      });
    }

    // Increment check count
    await document.incrementCheckCount();

    res.json({
      success: true,
      extractedText: document.extractedText,
      fileName: document.originalFileName,
      fileType: document.fileType
    });
    
  } catch (error) {
    console.error('Get document text error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy nội dung tài liệu'
    });
  }
};

module.exports = exports;