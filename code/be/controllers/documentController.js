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
      sortOrder = 'desc',
      startDate = '',
      endDate = ''
    } = req.query;

    console.log("getUserDocuments query params:", { page, limit, search, fileType, status, sortBy, sortOrder, startDate, endDate });

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      fileType,
      status,
      sortBy,
      sortOrder,
      startDate,
      endDate
    };

    const documents = await Document.getUserDocuments(req.user.id, options);
    
    // Use the same query building logic for counting
    const countQuery = { uploadedBy: req.user.id };
    
    // Add search filter
    if (search) {
      countQuery.$or = [
        { title: { $regex: search, $options: 'i' } },
        { originalFileName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add file type filter
    if (fileType !== 'all') {
      countQuery.fileType = fileType;
    }
    
    // Add status filter
    if (status !== 'all') {
      countQuery.status = status;
    }
    
    // Add date filter
    if (startDate || endDate) {
      countQuery.createdAt = {};
      if (startDate) {
        // Parse startDate and set to beginning of day in UTC
        const startDateTime = new Date(startDate + 'T00:00:00.000Z');
        countQuery.createdAt.$gte = startDateTime;
      }
      if (endDate) {
        // Parse endDate and set to end of day in UTC
        const endDateTime = new Date(endDate + 'T23:59:59.999Z');
        countQuery.createdAt.$lte = endDateTime;
      }
    }

    const total = await Document.countDocuments(countQuery);

    const documentsWithDetails = documents.map(doc => ({
      _id: doc._id,
      title: doc.title,
      author: doc.author,
      fileName: doc.originalFileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
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
    });

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
        author: document.author,
        fileName: document.originalFileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
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
    console.log('Deleting document with ID:', id);
    
    const document = await Document.findOne({
      _id: id,
      uploadedBy: req.user.id
    });

    if (!document) {
      console.log('Document not found for user:', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài liệu'
      });
    }

    console.log('Found document:', document.title);

    // Delete file from filesystem
    try {
      await fs.unlink(document.filePath);
      console.log('File deleted from filesystem');
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
    console.log('Deleting document from database...');
    await Document.findByIdAndDelete(document._id);
    console.log('Document deleted from database');

    // Log action
    console.log('Logging action...');
    logAction({
      req,
      action: 'delete_document',
      targetType: 'document',
      targetId: String(document._id),
      targetName: document.title,
    });

    console.log('Sending success response');
    res.json({
      success: true,
      message: 'Xóa tài liệu thành công'
    });
    
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa tài liệu'
    });
  }
};

// Admin delete any document
exports.adminDeleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Admin deleting document with ID:', id);
    
    const document = await Document.findById(id).populate({
      path: 'uploadedBy',
      select: 'name email',
      options: { strictPopulate: false }
    });

    if (!document) {
      console.log('Document not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài liệu'
      });
    }

    console.log('Found document:', document.title, 'owned by:', document.uploadedBy ? document.uploadedBy.name : 'Unknown user');

    // Delete file from filesystem
    try {
      await fs.unlink(document.filePath);
      console.log('File deleted from filesystem');
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
    console.log('Deleting document from database...');
    await Document.findByIdAndDelete(document._id);
    console.log('Document deleted from database');

    // Log action
    console.log('Logging action...');
    logAction({
      req,
      action: 'admin_delete_document',
      targetType: 'document',
      targetId: String(document._id),
      targetName: document.title,
      metadata: { 
        originalOwner: document.uploadedBy ? document.uploadedBy.name : null,
        originalOwnerId: document.uploadedBy ? document.uploadedBy._id : null
      }
    });

    console.log('Sending success response');
    res.json({
      success: true,
      message: 'Xóa tài liệu thành công'
    });
    
  } catch (error) {
    console.error('Admin delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa tài liệu'
    });
  }
};

// Get all documents for admin with pagination and filters
exports.getAllDocuments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      fileType = 'all',
      status = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate = '',
      endDate = ''
    } = req.query;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { originalFileName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (fileType !== 'all') {
      query.fileType = fileType;
    }
    
    if (status !== 'all') {
      query.status = status;
    }

    // Add date filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        // Parse startDate and set to beginning of day in UTC
        const startDateTime = new Date(startDate + 'T00:00:00.000Z');
        query.createdAt.$gte = startDateTime;
      }
      if (endDate) {
        // Parse endDate and set to end of day in UTC
        const endDateTime = new Date(endDate + 'T23:59:59.999Z');
        query.createdAt.$lte = endDateTime;
      }
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get documents with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const documents = await Document.find(query)
      .populate({
        path: 'uploadedBy',
        select: 'name email',
        options: { strictPopulate: false }
      })
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Document.countDocuments(query);

    const documentsWithDetails = documents.map(doc => ({
      _id: doc._id,
      title: doc.title,
      author: doc.author,
      fileName: doc.originalFileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      uploadedAt: doc.createdAt,
      checkCount: doc.checkCount,
      lastChecked: doc.lastChecked,
      downloadCount: doc.downloadCount,
      status: doc.status,
      description: doc.description,
      tags: doc.tags,
      isPublic: doc.isPublic,
      uploadedBy: doc.uploadedBy ? {
        _id: doc.uploadedBy._id || null,
        name: doc.uploadedBy.name || null,
        email: doc.uploadedBy.email || null
      } : null
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
    console.error('Get all documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách tài liệu'
    });
  }
};

// Get all document statistics for admin
exports.getAllDocumentStats = async (req, res) => {
  try {
    // Get stats for all documents
    const stats = await Document.aggregate([
      {
        $group: {
          _id: '$fileType',
          count: { $sum: 1 },
          totalSize: { $sum: '$fileSize' },
          avgSize: { $avg: '$fileSize' },
          totalChecks: { $sum: '$checkCount' },
          totalDownloads: { $sum: '$downloadCount' }
        }
      }
    ]);

    const totalDocuments = await Document.countDocuments({});
    
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
    console.error('Get all document stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê tài liệu'
    });
  }
};

// Get document upload statistics by month (admin only)
exports.getDocumentUploadStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build match condition
    const matchCondition = {};
    if (startDate || endDate) {
      matchCondition.createdAt = {};
      if (startDate) {
        matchCondition.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchCondition.createdAt.$lte = new Date(endDate);
      }
    }

    // Aggregate documents by month
    const stats = await Document.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          month: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: 1
            }
          },
          count: 1
        }
      },
      { $sort: { month: 1 } }
    ]);

    // Calculate summary statistics
    const total = stats.reduce((sum, stat) => sum + stat.count, 0);
    const average = stats.length > 0 ? total / stats.length : 0;
    const peak = stats.length > 0 ? Math.max(...stats.map(s => s.count)) : 0;

    res.json({
      success: true,
      data: stats,
      summary: {
        total,
        average,
        peak
      }
    });
    
  } catch (error) {
    console.error('Get document upload stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê tải lên tài liệu'
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

// Configure multer for ZIP file upload
const zipUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit for ZIP files
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ZIP'), false);
    }
  }
});

// Bulk upload documents from ZIP file
exports.bulkUploadDocuments = [
  zipUpload.single('zipFile'),
  async (req, res) => {
    const AdmZip = require('adm-zip');
    
    try {
      // Check if ZIP file is provided
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn file ZIP'
        });
      }

      const zipBuffer = req.file.buffer;
      const zip = new AdmZip(zipBuffer);
      const zipEntries = zip.getEntries();

      // Find metadata file (CSV or Excel)
      let metadataEntry = zipEntries.find(entry => 
        entry.entryName.toLowerCase() === 'metadata.csv' ||
        entry.entryName.toLowerCase() === 'metadata.xlsx'
      );

      if (!metadataEntry) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy file metadata.csv hoặc metadata.xlsx trong ZIP'
        });
      }

      // Parse metadata
      let metadata = [];
      if (metadataEntry.entryName.toLowerCase().endsWith('.csv')) {
        // Parse CSV
        const csvData = metadataEntry.getData().toString('utf8');
        const lines = csvData.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          return res.status(400).json({
            success: false,
            message: 'File metadata.csv không có dữ liệu'
          });
        }

        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
          if (values.length >= 3) {
            metadata.push({
              filename: values[0],
              title: values[1],
              author: values[2],
              description: values[3] || ''
            });
          }
        }
      } else {
        // Parse Excel
        const XLSX = require('xlsx');
        const workbook = XLSX.read(metadataEntry.getData(), { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        metadata = jsonData.map(row => ({
          filename: row['Tên file'] || row['filename'] || '',
          title: row['Tiêu đề'] || row['title'] || '',
          author: row['Tác giả'] || row['author'] || '',
          description: row['Mô tả'] || row['description'] || ''
        }));
      }

      if (metadata.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có dữ liệu trong file metadata'
        });
      }

      // Process each document
      const results = {
        success: true,
        totalFiles: metadata.length,
        successCount: 0,
        failedCount: 0,
        successFiles: [],
        failedFiles: []
      };

      for (const meta of metadata) {
        try {
          // Find corresponding file in ZIP
          const fileEntry = zipEntries.find(entry => 
            entry.entryName === meta.filename || 
            entry.entryName.endsWith('/' + meta.filename)
          );

          if (!fileEntry) {
            results.failedCount++;
            results.failedFiles.push({
              filename: meta.filename,
              error: 'Không tìm thấy file trong ZIP'
            });
            continue;
          }

          // Extract file data
          const fileData = fileEntry.getData();
          const fileExtension = path.extname(meta.filename).toLowerCase();
          
          // Validate file type
          const allowedExtensions = ['.txt', '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt'];
          if (!allowedExtensions.includes(fileExtension)) {
            results.failedCount++;
            results.failedFiles.push({
              filename: meta.filename,
              error: 'Định dạng file không được hỗ trợ'
            });
            continue;
          }

          // Save file to uploads directory
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const sanitizedName = path.basename(meta.filename, fileExtension).replace(/[^a-zA-Z0-9]/g, '_');
          const savedFileName = `${sanitizedName}-${uniqueSuffix}${fileExtension}`;
          const filePath = path.join(__dirname, '../uploads', savedFileName);

          await fs.writeFile(filePath, fileData);

          // Get MIME type from extension
          const mimeTypeMap = {
            '.txt': 'text/plain',
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.ppt': 'application/vnd.ms-powerpoint'
          };
          const mimeType = mimeTypeMap[fileExtension] || 'application/octet-stream';

          // Extract text content
          let extractedText = '';
          try {
            extractedText = await extractTextFromFile(filePath, mimeType);
          } catch (extractError) {
            console.error('Text extraction error:', extractError);
            // Continue with empty text if extraction fails
          }

          // Create document record
          const document = new Document({
            originalFileName: meta.filename,
            fileName: savedFileName,
            filePath: filePath,
            fileSize: fileData.length,
            fileType: getFileTypeFromMime(mimeType),
            mimeType: mimeType,
            title: meta.title || meta.filename,
            author: meta.author || 'Unknown',
            description: meta.description || '',
            extractedText: extractedText,
            uploadedBy: req.user.id,
            isPublic: false,
            status: extractedText ? 'processed' : 'failed'
          });

          await document.save();

          // Add to AVL tree if text extraction was successful
          if (extractedText && extractedText.trim()) {
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
              console.error('AVL tree addition error:', avlError);
              // Continue even if AVL addition fails
            }
          }

          // Log successful upload
          await logAction(req.user.id, 'BULK_UPLOAD_DOCUMENT', {
            documentId: document._id,
            fileName: meta.filename,
            fileSize: fileData.length
          });

          results.successCount++;
          results.successFiles.push({
            filename: meta.filename,
            title: meta.title,
            documentId: document._id
          });

        } catch (error) {
          console.error(`Error processing file ${meta.filename}:`, error);
          results.failedCount++;
          results.failedFiles.push({
            filename: meta.filename,
            error: error.message
          });
        }
      }

      // Log bulk upload action
      await logAction(req.user.id, 'BULK_UPLOAD_COMPLETED', {
        totalFiles: results.totalFiles,
        successCount: results.successCount,
        failedCount: results.failedCount
      });

      res.json({
        success: true,
        message: `Bulk upload hoàn thành: ${results.successCount}/${results.totalFiles} file thành công`,
        results: results
      });

    } catch (error) {
      console.error('Bulk upload error:', error);
      
      // Log failed bulk upload
      await logAction(req.user.id, 'BULK_UPLOAD_FAILED', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        message: 'Lỗi khi upload hàng loạt: ' + error.message
      });
    }
  }
];

module.exports = exports;