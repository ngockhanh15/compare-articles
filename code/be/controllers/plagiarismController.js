const PlagiarismCheck = require("../models/PlagiarismCheck");
const plagiarismCacheService = require("../services/PlagiarismCacheService");
const plagiarismDetectionService = require("../services/PlagiarismDetectionService");
const documentAVLService = require("../services/DocumentAVLService");
const Users = require("../models/User");
const Documents = require("../models/Document");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads");
    // Ensure uploads directory exists
    if (!fsSync.existsSync(uploadDir)) {
      fsSync.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

exports.home = async (req, res) => {
  try {
    const allUser = await Users.find({});
    const allDocuments = await Documents.find({});
    const allTree = await PlagiarismCheck.find({});

    res.json({
      totalUsers: allUser.length,
      totalDocuments: allDocuments.length,
      totalTree: allTree.length,
    });
  } catch (error) {
    console.error("Error in /home:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      "text/plain",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/msword", // .doc
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ hỗ trợ file định dạng TXT, DOC, DOCX và PDF"), false);
    }
  },
});

// Document-based checking using DocumentAVLService (kiểm tra với documents đã upload)
const performDocumentCheck = async (text, options = {}) => {
  const startTime = Date.now();

  try {
    // Sử dụng DocumentAVLService để kiểm tra với các document đã upload
    // Không truyền minSimilarity để sử dụng sentenceThreshold từ database
    const result = await documentAVLService.checkDuplicateContent(text, {
      chunkSize: 50,
    });

    // Chuyển đổi format để tương thích với frontend
    const formattedResult = {
      duplicatePercentage: result.duplicatePercentage || 0,
      matches: result.matches.map((match) => ({
        text: match.matchedText || "Document content",
        source:
          match.title ||
          `Document-${match.documentId.toString().substring(0, 8)}`,
        similarity: match.similarity,
        url: `internal://document/${match.documentId}`,
        documentId: match.documentId,
        fileType: match.fileType,
        createdAt: match.createdAt,
        method: "document-based",
        duplicateSentences: match.duplicateSentences || 0, // Số câu trùng lặp
        duplicateSentencesDetails: match.duplicateSentencesDetails || [], // Chi tiết các câu trùng
        totalSentencesInSource: match.totalSentencesInSource || match.totalSentencesInB || match.totalSentences || 0,
      })),
      sources: result.sources || [],
      confidence:
        result.duplicatePercentage > 70
          ? "high"
          : result.duplicatePercentage > 30
            ? "medium"
            : "low",
      processingTime: Date.now() - startTime,
      fromCache: false,
      totalMatches: result.totalMatches || 0,
      checkedDocuments: result.checkedDocuments || 0,
      // Thông số mới từ DocumentAVLService
      dtotal: result.dtotal || 0,
      dab: result.dab || 0,
      mostSimilarDocument: result.mostSimilarDocument || null,
      totalInputSentences: result.totalInputSentences || result.totalInputHashes || 0,
      totalDuplicatedSentences: result.totalDuplicatedSentences || result.totalDuplicateSentences || 0,
      // Tên document trùng nhất - ưu tiên document có nhiều câu trùng nhất
      mostSimilarDocumentName:
        result.documentWithMostDuplicates?.name ||
        result.documentWithMostDuplicates?.title ||
        result.mostSimilarDocument?.name ||
        result.mostSimilarDocument?.title ||
        result.mostSimilarDocument?.fileName ||
        result.documentWithMostDuplicates?.fileName ||
        "",
      // Thêm thông tin về documents
      totalDocumentsInSystem: result.checkedDocuments || 0,
      // Thêm 2 thông số theo yêu cầu
      totalSentencesWithInputWords: result.totalSentencesWithInputWords || 0,
      maxDuplicateSentences: result.maxDuplicateSentences || 0,
      documentWithMostDuplicates: result.documentWithMostDuplicates || null,
      // Thông tin về cặp từ
      totalUniqueWordPairs: result.totalUniqueWordPairs || 0,
      totalUniqueWords: result.totalUniqueWords || 0,
      totalDuplicateSentences: result.totalDuplicateSentences || 0,
    };

    return formattedResult;
  } catch (error) {
    console.error("Error in document check:", error);

    // Fallback: trả về kết quả cơ bản nếu có lỗi
    return {
      duplicatePercentage: 0,
      matches: [],
      sources: [],
      confidence: "low",
      processingTime: Date.now() - startTime,
      fromCache: false,
      error: "Error occurred during document check",
      errorDetails: error.message,
      totalDocumentsInSystem: 0,
      totalSentencesWithInputWords: 0,
      maxDuplicateSentences: 0,
      totalDuplicateSentences: 0,
    };
  }
};

// Real plagiarism checking using DocumentAVLService (unified single tree)
const performPlagiarismCheck = async (text, options = {}) => {
  const startTime = Date.now();

  try {
    // 1. Kiểm tra cache trước (để tăng tốc độ)
    const cachedResult = plagiarismCacheService.findCachedResult(text);

    if (cachedResult && cachedResult.type === "exact") {
      console.log("Cache hit: exact match found");
      return {
        ...cachedResult.data.result,
        fromCache: true,
        cacheType: "exact",
        processingTime: Date.now() - startTime,
      };
    }

    // 2. Sử dụng DocumentAVLService (cây AVL lớn duy nhất) thay vì plagiarismDetectionService
    console.log("Performing plagiarism check using unified DocumentAVL tree...");
    // Không truyền minSimilarity để sử dụng sentenceThreshold từ database
    const result = await documentAVLService.checkDuplicateContent(text, {
      maxResults: options.maxResults || null,
    });

    // 3. Không cần kết hợp với cache words vì đã có cây AVL thống nhất
    // 4. Cập nhật confidence dựa trên threshold đơn giản: >= 50% = high, < 50% = low
    const confidence = result.duplicatePercentage >= 50 ? "high" : "low";

    // 5. Cache kết quả mới để sử dụng cho lần sau
    plagiarismCacheService.cacheResult(text, result);

    // 6. Cập nhật processing time và trả về
    const finalResult = {
      ...result,
      confidence,
      processingTime: Date.now() - startTime,
      fromCache: false,
      cacheOptimized: false,
      similarWordsFound: 0,
    };

    return finalResult;
  } catch (error) {
    console.error("Error in plagiarism check:", error);

    // Fallback: trả về kết quả cơ bản nếu có lỗi
    return {
      duplicatePercentage: 0,
      matches: [],
      sources: [],
      confidence: "low",
      processingTime: Date.now() - startTime,
      fromCache: false,
      error: "Error occurred during plagiarism check",
      errorDetails: error.message,
    };
  }
};

// Extract text from uploaded file
const extractTextFromFile = async (filePath, fileType) => {
  try {
    switch (fileType) {
      case "text/plain":
        return await fs.readFile(filePath, "utf8");

      case "application/pdf":
        const pdfBuffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        return pdfData.text;

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": // .docx
        const docxResult = await mammoth.extractRawText({ path: filePath });
        return docxResult.value;

      case "application/msword": // .doc
        // Mammoth cũng có thể đọc .doc nhưng không hoàn hảo
        try {
          const docResult = await mammoth.extractRawText({ path: filePath });
          return docResult.value;
        } catch (docError) {
          throw new Error(
            "File .doc này có thể không được hỗ trợ đầy đủ. Vui lòng chuyển đổi sang .docx hoặc .pdf"
          );
        }

      default:
        throw new Error(
          `Định dạng file ${fileType} chưa được hỗ trợ. Hiện tại hỗ trợ: TXT, DOC, DOCX, PDF`
        );
    }
  } catch (error) {
    console.error("Error extracting text from file:", error);

    // Nếu là lỗi từ việc xử lý file cụ thể, throw lại message gốc
    if (
      error.message.includes("không được hỗ trợ") ||
      error.message.includes("chưa được hỗ trợ")
    ) {
      throw error;
    }

    // Lỗi chung
    throw new Error(
      `Không thể đọc nội dung file ${fileType}. Vui lòng kiểm tra file có bị hỏng không.`
    );
  }
};

// Upload file and extract text
exports.uploadFile = [
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Không có file được upload",
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
        fileType: fileType,
      });
    } catch (error) {
      console.error("File upload error:", error);

      // Clean up file if exists and there was an error
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error("Error cleaning up file:", unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        message: error.message || "Lỗi khi xử lý file",
      });
    }
  },
];

// Check document similarity (kiểm tra với documents đã upload)
exports.checkDocumentSimilarity = async (req, res) => {
  try {
    const { text, options = {}, fileName, fileType } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Văn bản không được để trống",
      });
    }

    // Perform document-based check
    const result = await performDocumentCheck(text, options);

    // Determine status based on simple threshold: > 70% = high, 30-70% = medium, <= 30% = low
    const getStatus = (percentage) => {
      if (percentage > 70) return "high";
      if (percentage > 30) return "medium";
      return "low";
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
        mostSimilarDocumentName: result.mostSimilarDocumentName,
        totalSentencesWithInputWords: result.totalSentencesWithInputWords,
        maxDuplicateSentences: result.maxDuplicateSentences,
        documentWithMostDuplicates: result.documentWithMostDuplicates,
        totalDuplicateSentences: result.totalDuplicateSentences,
        totalInputSentences: result.totalInputSentences || result.totalInputHashes || 0,
        totalDuplicatedSentences: result.totalDuplicatedSentences || result.totalDuplicateSentences || 0,
      });
    }

    // Save check to database (optional - có thể bỏ nếu không muốn lưu)
    const plagiarismCheck = new PlagiarismCheck({
      user: req.user.id,
      originalText: text,
      textLength: text.length,
      wordCount: text.split(/\s+/).filter((word) => word.length > 0).length,
      sentenceCount: result.totalInputSentences || text.split(/[.!?]+/).filter(s => s.trim().length > 10).length,
      duplicateSentenceCount: result.totalDuplicatedSentences || result.totalDuplicateSentences || 0,
      duplicatePercentage: result.duplicatePercentage,
      matches: result.matches || [],
      sources: result.sources || [],
      confidence: result.confidence,
      status: getStatus(result.duplicatePercentage),
      source: fileName ? "file" : "text",
      fileName: fileName || null,
      fileType: fileType || null,
      processingTime: result.processingTime,
      options: {
        checkInternet: false, // Document-based check không cần internet
        checkDatabase: true,
        sensitivity: options.sensitivity || "medium",
        language: options.language || "vi",
        checkType: "document-based", // Đánh dấu là document-based check
      },
      // Thêm thông số mới
      totalSentencesWithInputWords: result.totalSentencesWithInputWords,
      maxDuplicateSentences: result.maxDuplicateSentences,
      documentWithMostDuplicates: result.documentWithMostDuplicates,
      totalDuplicateSentences: result.totalDuplicateSentences,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
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
        mostSimilarDocumentName: result.mostSimilarDocumentName,

        textLength: text.length,
        wordCount: text.split(/\s+/).filter((word) => word.length > 0).length,
        processingTime: result.processingTime,
        totalMatches: result.totalMatches,
        checkedDocuments: result.checkedDocuments,
        // Thêm thông số mới
        totalSentencesWithInputWords: result.totalSentencesWithInputWords,
        maxDuplicateSentences: result.maxDuplicateSentences,
        documentWithMostDuplicates: result.documentWithMostDuplicates,
        totalDuplicateSentences: result.totalDuplicateSentences,
        totalInputSentences: result.totalInputSentences || result.totalInputHashes || 0,
        totalDuplicatedSentences: result.totalDuplicatedSentences || result.totalDuplicateSentences || 0,
      },
    });
  } catch (error) {
    console.error("Error in document similarity check:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi kiểm tra độ tương đồng",
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
        message: "Văn bản không được để trống",
      });
    }

    // Perform plagiarism check
    const result = await performPlagiarismCheck(text, options);

    // Determine status based on simple threshold: >= 50% = high, < 50% = low
    const getStatus = (percentage) => {
      if (percentage >= 50) return "high";
      return "low";
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
        totalMatches: result.matches ? result.matches.length : 0,
      });
    }

    // Save plagiarism check to database
    const plagiarismCheck = new PlagiarismCheck({
      user: req.user.id,
      originalText: text,
      textLength: text.length,
      wordCount: text.split(/\s+/).filter((word) => word.length > 0).length,
      sentenceCount: text.split(/[.!?]+/).filter(s => s.trim().length > 10).length,
      duplicateSentenceCount: 0, // For internet-based check, we don't have sentence-level analysis yet
      duplicatePercentage: result.duplicatePercentage,
      matches: result.matches || [],
      sources: result.sources || [],
      confidence: result.confidence,
      status: getStatus(result.duplicatePercentage),
      source: fileName ? "file" : "text",
      fileName: fileName || null,
      fileType: fileType || null,
      processingTime: result.processingTime,
      options: {
        checkInternet: options.checkInternet !== false,
        checkDatabase: options.checkDatabase !== false,
        sensitivity: options.sensitivity || "medium",
        language: options.language || "vi",
      },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
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
        wordCount: text.split(/\s+/).filter((word) => word.length > 0).length,
        processingTime: result.processingTime,
        totalMatches: result.matches ? result.matches.length : 0,
        checkedDocuments: result.totalDocumentsChecked || 0,
        // Thêm các thông số mới
        dtotal: result.dtotal || 0,
        dab: result.dab || 0,
        mostSimilarDocument: result.mostSimilarDocument || null,
      },
    });
  } catch (error) {
    console.error("Plagiarism check error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi kiểm tra trùng lặp",
    });
  }
};

// Get plagiarism history
exports.getPlagiarismHistory = async (req, res) => {
  try {
    const { limit = 10, offset = 0, status, startDate, endDate } = req.query;
    const userId = req.user.id;

    // Build filter object - always filter by current user
    const filter = { user: userId };
    
    // Add status filter if provided
    if (status) filter.status = status;
    
    // Add date range filter if provided
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Add one day to endDate to include the entire end date
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        filter.createdAt.$lt = endDateTime;
      }
    }

    const checks = await PlagiarismCheck.find(filter)
      .select(
        "originalText duplicatePercentage status source fileName createdAt sentenceCount duplicateSentenceCount"
      )
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await PlagiarismCheck.countDocuments(filter);

    res.json({
      success: true,
      history: checks.map((check) => ({
        id: check._id,
        text:
          check.originalText.substring(0, 100) +
          (check.originalText.length > 100 ? "..." : ""),
        duplicatePercentage: check.duplicatePercentage,
        status: check.status,
        source: check.source,
        fileName: check.fileName,
        checkedAt: check.createdAt,
        sentenceCount: check.sentenceCount || 0,
        duplicateSentenceCount: check.duplicateSentenceCount || 0,
      })),
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("Get history error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch sử kiểm tra",
    });
  }
};

// Get all plagiarism history for admin
exports.getAllPlagiarismHistory = async (req, res) => {
  try {
    const { limit = 10, offset = 0, userName, status, startDate, endDate } = req.query;
    
    // Build filter object
    const filter = {};
    if (status) filter.status = status;

    // Build aggregation pipeline
    const pipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      }
    ];

    // Add name filter if provided
    if (userName) {
      pipeline.push({
        $match: {
          'user.name': { $regex: userName, $options: 'i' }
        }
      });
    }

    // Add status filter if provided
    if (status) {
      pipeline.push({
        $match: { status: status }
      });
    }

    // Add date range filter if provided
    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        // Add one day to endDate to include the entire end date
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        dateFilter.$lt = endDateTime;
      }
      
      if (Object.keys(dateFilter).length > 0) {
        pipeline.push({
          $match: { createdAt: dateFilter }
        });
      }
    }

    // Add sorting
    pipeline.push({
      $sort: { createdAt: -1 }
    });

    // Get total count
    const totalPipeline = [...pipeline, { $count: "total" }];
    const totalResult = await PlagiarismCheck.aggregate(totalPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    // Add pagination
    pipeline.push(
      { $skip: parseInt(offset) },
      { $limit: parseInt(limit) }
    );

    // Add projection
    pipeline.push({
      $project: {
        originalText: 1,
        duplicatePercentage: 1,
        status: 1,
        source: 1,
        fileName: 1,
        createdAt: 1,
        sentenceCount: 1,
        duplicateSentenceCount: 1,
        'user._id': 1,
        'user.name': 1,
        'user.email': 1
      }
    });

    const checks = await PlagiarismCheck.aggregate(pipeline);

    res.json({
      success: true,
      history: checks.map((check) => ({
        id: check._id,
        text:
          check.originalText.substring(0, 100) +
          (check.originalText.length > 100 ? "..." : ""),
        duplicatePercentage: check.duplicatePercentage,
        status: check.status,
        source: check.source,
        fileName: check.fileName,
        checkedAt: check.createdAt,
        sentenceCount: check.sentenceCount || 0,
        duplicateSentenceCount: check.duplicateSentenceCount || 0,
        user: {
          id: check.user._id,
          name: check.user.name,
          email: check.user.email,
        },
      })),
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("Get all history error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy lịch sử kiểm tra",
    });
  }
};

// Get document tree statistics
exports.getDocumentTreeStats = async (req, res) => {
  try {
    const stats = documentAVLService.getTreeStats();

    res.json({
      success: true,
      stats: stats,
    });
  } catch (error) {
    console.error("Get document tree stats error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê document tree",
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
          totalChars: stat.totalChars,
        };
        return acc;
      }, {}),
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê",
    });
  }
};

// Get list of uploaded files
exports.getUploadedFiles = async (req, res) => {
  try {
    const Document = require("../models/Document");

    const {
      page = 1,
      limit = 10,
      search = "",
      fileType = "all",
      status = "all",
    } = req.query;

    const query = { uploadedBy: req.user.id };

    // Add search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { originalFileName: { $regex: search, $options: "i" } },
      ];
    }

    // Add file type filter
    if (fileType !== "all") {
      query.fileType = fileType;
    }

    // Add status filter
    if (status !== "all") {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const documents = await Document.find(query)
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Document.countDocuments(query);

    const files = documents.map((doc) => ({
      _id: doc._id,
      title: doc.title,
      fileName: doc.originalFileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      uploadedBy: {
        name: doc.uploadedBy.name,
        email: doc.uploadedBy.email,
      },
      uploadedAt: doc.createdAt,
      checkCount: doc.checkCount,
      lastChecked: doc.lastChecked,
      downloadCount: doc.downloadCount,
      status: doc.status,
    }));

    res.json({
      success: true,
      files,
      total,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get uploaded files error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách file",
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
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get system stats error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê hệ thống",
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
      message: "Hệ thống plagiarism detection đã được khởi tạo lại",
      stats: stats,
    });
  } catch (error) {
    console.error("Initialize system error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi khởi tạo hệ thống",
    });
  }
};

// Get cache statistics
exports.getCacheStats = async (req, res) => {
  try {
    const stats = plagiarismCacheService.getCacheStats();

    res.json({
      success: true,
      cacheStats: stats,
    });
  } catch (error) {
    console.error("Get cache stats error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thống kê cache",
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
        message: "Văn bản không được để trống",
      });
    }

    const similarChunks = plagiarismCacheService.findSimilarChunks(
      text,
      threshold
    );

    res.json({
      success: true,
      similarChunks: similarChunks,
      total: similarChunks.length,
      threshold: threshold,
    });
  } catch (error) {
    console.error("Find similar texts error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tìm kiếm văn bản tương tự",
    });
  }
};

// Clear all cache
exports.clearCache = async (req, res) => {
  try {
    const result = plagiarismCacheService.clearAllCache();

    res.json({
      success: true,
      message: "Đã xóa toàn bộ cache",
      result: result,
    });
  } catch (error) {
    console.error("Clear cache error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa cache",
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
      user: userId,
    });

    if (!plagiarismCheck) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy kết quả kiểm tra",
      });
    }

    // Sử dụng DocumentAVLService để kiểm tra giống như checkDocumentSimilarity
    // Không truyền minSimilarity để sử dụng sentenceThreshold từ database
    const result = await documentAVLService.checkDuplicateContent(
      plagiarismCheck.originalText,
      {
        chunkSize: 50,
        maxResults: 20,
      }
    );

    // Khởi tạo biến
    let mostSimilarDocument = null;
    let mostSimilarContent = "";
    let overallSimilarity = result.duplicatePercentage || 0;
    let detailedMatches = [];

    // Tìm document có similarity cao nhất và lấy toàn bộ nội dung
    if (result.matches && result.matches.length > 0) {
      const bestMatch = result.matches.reduce((prev, current) =>
        prev.similarity > current.similarity ? prev : current
      );

      if (bestMatch) {
        // Lấy toàn bộ nội dung document từ database
        try {
          const Document = require("../models/Document");
          const fullDocument = await Document.findById(bestMatch.documentId);

          mostSimilarDocument = {
            fileName:
              bestMatch.title ||
              `Document-${bestMatch.documentId.toString().substring(0, 8)}`,
            fileSize: fullDocument?.fileSize || bestMatch.textLength || 0,
            fileType: bestMatch.fileType || "text/plain",
            author: bestMatch.uploadedBy?.name || "Unknown",
            uploadedAt: bestMatch.createdAt || new Date(),
            wordCount: fullDocument?.extractedText
              ? fullDocument.extractedText.split(/\s+/).filter((w) => w.length > 0).length
              : 0,
          };

          // Sử dụng toàn bộ nội dung document thay vì chỉ matchedText
          mostSimilarContent = fullDocument?.extractedText || bestMatch.matchedText || "";
        } catch (docError) {
          console.warn("Could not fetch full document content:", docError);
          mostSimilarDocument = {
            fileName:
              bestMatch.title ||
              `Document-${bestMatch.documentId.toString().substring(0, 8)}`,
            fileSize: bestMatch.textLength || 0,
            fileType: bestMatch.fileType || "text/plain",
            author: bestMatch.uploadedBy?.name || "Unknown",
            uploadedAt: bestMatch.createdAt || new Date(),
            wordCount: bestMatch.matchedText
              ? bestMatch.matchedText.split(/\s+/).filter((w) => w.length > 0).length
              : 0,
          };
          mostSimilarContent = bestMatch.matchedText || "";
        }
      }
    }

    const Document = require("../models/Document"); // Import Document model

    for (let index = 0; index < result.matches.length; index++) {
      const match = result.matches[index];

      console.log(`Processing match ${index}: documentId=${match.documentId}, title=${match.title}, similarity=${match.similarity}%`);

      const originalText = plagiarismCheck.originalText;

      // Lấy toàn bộ nội dung document từ database
      let fullDocumentContent = "";
      try {
        const fullDocument = await Document.findById(match.documentId);
        fullDocumentContent = fullDocument?.extractedText || match.matchedText || "";
      } catch (docError) {
        console.warn(`Could not fetch full content for document ${match.documentId}:`, docError);
        fullDocumentContent = match.matchedText || "";
      }

      const matchText = fullDocumentContent.length > 0
        ? fullDocumentContent.substring(0, 500) + (fullDocumentContent.length > 500 ? "..." : "")
        : "Document content";

      // Tìm vị trí của match trong text gốc (đơn giản hóa)
      const startIndex = originalText
        .toLowerCase()
        .indexOf(matchText.toLowerCase().substring(0, 50));

      detailedMatches.push({
        id: `avl-match-${index + 1}`,
        originalText: matchText,
        matchedText: fullDocumentContent, // Trả về toàn bộ nội dung document
        similarity: match.similarity,
        source:
          match.title ||
          `Document-${match.documentId.toString().substring(0, 8)}`,
        url: `internal://document/${match.documentId}`,
        startPosition: startIndex >= 0 ? startIndex : 0,
        endPosition:
          startIndex >= 0 ? startIndex + matchText.length : matchText.length,
        documentId: match.documentId,
        fileType: match.fileType,
        createdAt: match.createdAt,
        method: "document-based",
        duplicateSentences: match.duplicateSentences || 0,
        duplicateSentencesDetails: match.duplicateSentencesDetails || [],
        fullContent: fullDocumentContent, // Thêm field chứa toàn bộ nội dung
        // Thêm thông tin câu trùng lặp chi tiết cho hiển thị
        duplicateContentInfo: match.duplicateSentencesDetails ? {
          totalDuplicates: match.duplicateSentencesDetails.length,
          sampleDuplicates: match.duplicateSentencesDetails.slice(0, 3).map(detail => ({
            inputSentence: detail.inputSentence || '',
            sourceSentence: detail.sourceSentence || '',
            similarity: detail.similarity || 0
          }))
        } : null
      });
    }

    console.log(
      `Created ${detailedMatches.length} detailed matches from DocumentAVLService`
    );

    // Sắp xếp matches theo similarity (cao nhất trước)
    detailedMatches.sort((a, b) => b.similarity - a.similarity);

    // Tạo highlighted text cho current document
    let currentHighlightedText = plagiarismCheck.originalText || "";
    if (detailedMatches && detailedMatches.length > 0) {
      // Sắp xếp matches theo vị trí để tránh overlap
      const sortedMatches = [...detailedMatches].sort(
        (a, b) => a.startPosition - b.startPosition
      );

      let highlightedText = "";
      let lastIndex = 0;

      sortedMatches.forEach((match, index) => {
        const color = `hsl(${(index * 137.5) % 360}, 70%, 50%)`; // Generate different colors

        // Add text before this match
        if (match.startPosition > lastIndex) {
          highlightedText += plagiarismCheck.originalText.substring(
            lastIndex,
            match.startPosition
          );
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
    let similarHighlightedText = mostSimilarContent || "";
    if (detailedMatches && detailedMatches.length > 0 && mostSimilarContent) {
      let highlightedText = mostSimilarContent;

      detailedMatches.forEach((match, index) => {
        const color = `hsl(${(index * 137.5) % 360}, 70%, 50%)`; // Same colors as current document
        const searchText = match.matchedText;

        if (searchText && searchText.length > 0) {
          // Simple replacement for matched text
          const regex = new RegExp(
            searchText.replace(/[.,*+?^${}()|[\]\\]/g, "\\$&"),
            "gi"
          );
          highlightedText = highlightedText.replace(
            regex,
            `<span style="background-color: ${color}20; border-left: 3px solid ${color}; padding: 2px 4px; margin: 1px; border-radius: 3px;" data-match-id="${match.id}" data-similarity="${match.similarity}" title="${match.source} (${match.similarity}%)">${searchText}</span>`
          );
        }
      });

      similarHighlightedText = highlightedText;
    }

    // Lấy thông tin mostSimilarDocument từ database để có đầy đủ nội dung
    let enhancedMostSimilarDocument = null;
    if (result.mostSimilarDocument && result.mostSimilarDocument.id) {
      try {
        const fullDocument = await Document.findById(result.mostSimilarDocument.id);
        if (fullDocument) {
          enhancedMostSimilarDocument = {
            ...result.mostSimilarDocument,
            content: fullDocument.extractedText || "",
            fullContent: fullDocument.extractedText || "",
            title: fullDocument.title || fullDocument.fileName || "",
            fileName: fullDocument.fileName || "",
            fileType: fullDocument.fileType || "",
            createdAt: fullDocument.createdAt,
            highlightedText: similarHighlightedText,
          };
          console.log(`📋 Loaded full content for mostSimilarDocument: ${fullDocument.extractedText?.length || 0} characters`);
        }
      } catch (docError) {
        console.warn(`Could not fetch full content for mostSimilarDocument ${result.mostSimilarDocument.id}:`, docError);
        enhancedMostSimilarDocument = {
          ...result.mostSimilarDocument,
          content: mostSimilarContent || "",
          highlightedText: similarHighlightedText,
        };
      }
    }

    const response = {
      success: true,
      currentDocument: {
        fileName: plagiarismCheck.fileName || "document.txt",
        fileSize:
          plagiarismCheck.textLength ||
          plagiarismCheck.originalText?.length ||
          0,
        fileType: plagiarismCheck.fileType || "text/plain",
        wordCount:
          plagiarismCheck.wordCount ||
          plagiarismCheck.originalText?.split(/\s+/).filter((w) => w.length > 0)
            .length ||
          0,
        duplicateRate: overallSimilarity,
        checkedAt: plagiarismCheck.createdAt,
        content: plagiarismCheck.originalText || "",
        highlightedText: currentHighlightedText,
      },
      mostSimilarDocument: enhancedMostSimilarDocument || {
        fileName: "Không tìm thấy document tương tự",
        fileSize: 0,
        fileType: "text/plain",
        author: "Hệ thống",
        uploadedAt: new Date(),
        wordCount: 0,
        content: "Không có document tương tự trong hệ thống để so sánh.",
        fullContent: "Không có document tương tự trong hệ thống để so sánh.",
        highlightedText: "Không có document tương tự trong hệ thống để so sánh.",
      },
      overallSimilarity: overallSimilarity || 0,
      detailedMatches: detailedMatches || [],
      // Thêm các thông số mới từ DocumentAVLService giống checkDocumentSimilarity
      totalMatches: result.totalMatches || 0,
      checkedDocuments: result.checkedDocuments || 0,
      dtotal: result.dtotal || 0,
      dab: result.dab || 0,
      mostSimilarDocumentInfo: result.mostSimilarDocument || null,
      totalDocumentsInSystem: result.checkedDocuments || 0,
      totalSentencesWithInputWords: result.totalSentencesWithInputWords || 0,
      maxDuplicateSentences: result.maxDuplicateSentences || 0,
      documentWithMostDuplicates: result.documentWithMostDuplicates || null,
      totalUniqueWordPairs: result.totalUniqueWordPairs || 0,
      totalUniqueWords: result.totalUniqueWords || 0,
      totalDuplicateSentences: result.totalDuplicateSentences || 0,
      totalInputSentences: result.totalInputSentences || result.totalInputHashes || 0,
      totalDuplicatedSentences: result.totalDuplicatedSentences || result.totalDuplicateSentences || 0,
      // Thêm thông tin tổng hợp về câu trùng lặp
      duplicateContentSummary: {
        totalDuplicateSentences: result.totalDuplicateSentences || 0,
        totalInputSentences: result.totalInputSentences || 0,
        duplicatePercentage: result.duplicatePercentage || 0,
        documentsWithDuplicates: detailedMatches.filter(match =>
          match.duplicateSentences && match.duplicateSentences > 0
        ).length,
        sampleDuplicateContent: detailedMatches
          .filter(match => match.duplicateContentInfo && match.duplicateContentInfo.sampleDuplicates.length > 0)
          .slice(0, 3)
          .map(match => ({
            sourceDocument: match.source,
            duplicateCount: match.duplicateContentInfo.totalDuplicates,
            samples: match.duplicateContentInfo.sampleDuplicates
          }))
      }
    };

    res.json(response);
  } catch (error) {
    console.error("Get detailed comparison error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy so sánh chi tiết",
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
      user: userId,
    });

    if (!plagiarismCheck) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy kết quả kiểm tra",
      });
    }

    // Lấy thống kê từ DocumentAVLService (cây thống nhất)
    const systemStats = documentAVLService.getTreeStats();

    // Sử dụng DocumentAVLService để tìm tất cả documents tương tự
    let allDocuments = [];

    try {
      // Không truyền minSimilarity để sử dụng sentenceThreshold từ database
      const avlResult = await documentAVLService.checkDuplicateContent(
        plagiarismCheck.originalText,
        {
          maxResults: 50
        }
      );

      // Chuyển đổi kết quả từ DocumentAVLService
      allDocuments = avlResult.matches.map(match => ({
        id: match.documentId,
        fileName: match.title,
        fileSize: match.textLength || 0,
        fileType: match.fileType || 'text/plain',
        author: match.uploadedBy?.name || 'Unknown',
        uploadedAt: match.createdAt || new Date(),
        duplicateRate: Math.round(match.similarity),
        status: match.similarity > 30 ? 'high' : match.similarity > 15 ? 'medium' : 'low',
      }));

    } catch (docError) {
      console.error("Error finding documents using DocumentAVLService:", docError);
    }
    allDocuments.sort((a, b) => b.duplicateRate - a.duplicateRate);

    // Tính thống kê
    const totalDocuments = allDocuments.length;
    const highRiskCount = allDocuments.filter(
      (doc) => doc.status === "high"
    ).length;
    const mediumRiskCount = allDocuments.filter(
      (doc) => doc.status === "medium"
    ).length;
    const lowRiskCount = allDocuments.filter(
      (doc) => doc.status === "low"
    ).length;

    res.json({
      success: true,
      checkId: checkId,
      currentDocument: {
        fileName: plagiarismCheck.fileName || "document.txt",
        fileSize: plagiarismCheck.textLength,
        fileType: plagiarismCheck.fileType || "text/plain",
        duplicateRate: plagiarismCheck.duplicatePercentage,
      },
      totalDocuments: totalDocuments,
      highRiskCount: highRiskCount,
      mediumRiskCount: mediumRiskCount,
      lowRiskCount: lowRiskCount,
      allDocuments: allDocuments,
      systemStats: {
        totalDocumentsInSystem: systemStats.totalDocuments || 0,
        totalSentencesInSystem: systemStats.totalSentences || 0,
        systemInitialized: systemStats.initialized || false,
      },
    });
  } catch (error) {
    console.error("Get all documents comparison error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy so sánh với tất cả tài liệu",
    });
  }
};

// Get detailed comparison with all documents (for visual comparison)
// Get detailed comparison with all documents (for visual comparison)
exports.getDetailedAllDocumentsComparison = async (req, res) => {
  try {
    const { checkId } = req.params;
    const userId = req.user.id;

    // Tìm kiếm kết quả kiểm tra
    const plagiarismCheck = await PlagiarismCheck.findOne({
      _id: checkId,
      user: userId,
    });
    if (!plagiarismCheck) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy kết quả kiểm tra",
      });
    }

    const originalText = plagiarismCheck.originalText;
    console.log(
      `🔍 Starting detailed comparison for checkId: ${checkId}, text length: ${originalText.length}`
    );

    // Lấy kết quả từ DocumentAVLService
    // Không truyền minSimilarity để sử dụng sentenceThreshold từ database
    const avlResult = await documentAVLService.checkDuplicateContent(
      originalText,
      {
        chunkSize: 50,
        maxResults: 20,
      }
    );

    // Xử lý kết quả
    const matchingDocuments = processMatchingDocuments(avlResult.matches);
    const limitedDocuments = matchingDocuments;

    // Tạo highlighted text
    const { highlightedText, highlightedSegments } = createHighlightedText(
      originalText,
      limitedDocuments
    );

    // Trả về kết quả
    res.json({
      success: true,
      checkId: checkId,
      currentDocument: {
        fileName: plagiarismCheck.fileName || "document.txt",
        fileSize: plagiarismCheck.textLength,
        fileType: plagiarismCheck.fileType || "text/plain",
        duplicateRate: avlResult.duplicatePercentage,
        originalText: originalText,
        highlightedText: highlightedText,
      },
      matchingDocuments: limitedDocuments.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        author: doc.author,
        uploadedAt: doc.uploadedAt,
        duplicateRate: doc.duplicateRate,
        status: doc.status,
        duplicateSentences: doc.duplicateSentences,
      })),
      highlightedSegments: highlightedSegments,
      totalMatches: matchingDocuments.length,
      displayedMatches: limitedDocuments.length,
      hasMoreMatches: matchingDocuments.length > 10,
      totalDuplicateSentences: avlResult.totalDuplicateSentences || 0,
      totalSentencesWithInputWords: avlResult.totalSentencesWithInputWords || 0,
      maxDuplicateSentences: avlResult.maxDuplicateSentences || 0,
      documentWithMostDuplicates: avlResult.documentWithMostDuplicates || null,
    });
  } catch (error) {
    console.error("Get detailed all documents comparison error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy so sánh chi tiết với tất cả tài liệu",
    });
  }
};

// Hàm xử lý danh sách tài liệu trùng lặp
function processMatchingDocuments(matches) {
  const documents = matches.map((match) => ({
    id: match.documentId,
    fileName:
      match.title || `Document-${match.documentId.toString().substring(0, 8)}`,
    fileSize: match.textLength || 0,
    fileType: match.fileType || "text/plain",
    author: match.uploadedBy?.name || "Unknown",
    uploadedAt: match.createdAt || new Date(),
    duplicateRate: match.similarity,
    status:
      match.similarity > 70 ? "high" : match.similarity > 30 ? "medium" : "low",
    content: match.matchedText || "",
    duplicateSentences: match.duplicateSentences || 0,
    duplicateSentencesDetails: match.duplicateSentencesDetails || [],
  }));

  // Sắp xếp theo tỷ lệ trùng lặp
  return documents.sort((a, b) => b.duplicateRate - a.duplicateRate);
}

// Hàm tạo highlighted text
function createHighlightedText(originalText, documents) {
  // Màu sắc cho từng document
  const colors = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f43f5e",
    "#84cc16",
  ];

  let highlightedSegments = [];

  if (documents.length > 0) {
    // Tạo tập hợp cặp từ từ văn bản gốc (đồng nhất với checkDuplicateContent trong DocumentAVLService)
    // Điều này đảm bảo kết quả nhất quán giữa hai chức năng
    const vietnameseStopwordService = require("../services/VietnameseStopwordService");
    const meaningfulWords =
      vietnameseStopwordService.extractMeaningfulWords(originalText);

    // Tạo danh sách các cặp từ từ văn bản đầu vào (giống như trong checkDuplicateContent)
    const wordPairs = [];
    for (let i = 0; i < meaningfulWords.length - 1; i++) {
      wordPairs.push(`${meaningfulWords[i]}_${meaningfulWords[i + 1]}`);
    }
    const uniqueInputWordPairs = new Set(wordPairs);

    // Tách văn bản gốc thành các câu
    const originalSentences = originalText
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 10);

    // Phân tích từng câu với từng tài liệu
    documents.forEach((doc, docIndex) => {
      if (!doc.content || doc.content.trim().length === 0) return;

      const color = colors[docIndex % colors.length];

      // So sánh từng câu trong văn bản gốc với tài liệu
      originalSentences.forEach((origSentence) => {
        const origSentenceTrimmed = origSentence.trim();

        // Tính toán độ trùng lặp của câu sử dụng cùng phương pháp với checkDuplicateContent
        const sentenceDuplicateRatio = calculateSentenceDuplicateRatio(
          origSentenceTrimmed,
          doc.content,
          uniqueInputWordPairs // Truyền tập hợp cặp từ đã tạo sẵn
        );

        // Chỉ đánh dấu các câu có độ trùng lặp >= 50%
        if (sentenceDuplicateRatio >= 50) {
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
              type: "sentence-based-avl",
            });
          }
        }
      });
    });

    // Xử lý segments trùng lặp
    highlightedSegments = cleanOverlappingSegments(highlightedSegments);
  }

  // Tạo highlighted text
  const highlightedText = generateHighlightedText(
    originalText,
    highlightedSegments,
    colors
  );

  return { highlightedText, highlightedSegments };
}

// Hàm xử lý segments trùng lặp
function cleanOverlappingSegments(segments) {
  // Sắp xếp segments theo vị trí
  segments.sort((a, b) => a.start - b.start);

  const cleanedSegments = [];
  segments.forEach((segment) => {
    let hasOverlap = false;

    for (let i = 0; i < cleanedSegments.length; i++) {
      const existing = cleanedSegments[i];
      // Kiểm tra overlap
      if (
        (segment.start >= existing.start && segment.start < existing.end) ||
        (segment.end > existing.start && segment.end <= existing.end) ||
        (segment.start <= existing.start && segment.end >= existing.end)
      ) {
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

  return cleanedSegments.sort((a, b) => a.start - b.start);
}

// Hàm tạo highlighted text từ segments
function generateHighlightedText(originalText, segments, colors) {
  if (segments.length === 0) return originalText;

  let lastIndex = 0;
  let highlightedText = "";

  segments.forEach((segment) => {
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

  return highlightedText;
}

// Hàm helper để tính toán độ trùng lặp của một câu với một tài liệu
// Sử dụng cùng phương pháp với checkDuplicateContent trong DocumentAVLService
function calculateSentenceDuplicateRatio(
  sentence,
  documentContent,
  inputWordPairs = null
) {
  try {
    // Sử dụng Vietnamese stopword service để lấy các từ có nghĩa
    const vietnameseStopwordService = require("../services/VietnameseStopwordService");

    // Nếu chưa có inputWordPairs được truyền vào, tạo từ documentContent (để tương thích ngược)
    let uniqueInputWordPairs;
    if (inputWordPairs) {
      uniqueInputWordPairs = inputWordPairs;
    } else {
      // Tách tài liệu thành các từ có nghĩa
      const docWords =
        vietnameseStopwordService.extractMeaningfulWords(documentContent);

      // Tạo danh sách các cặp từ từ tài liệu (giống như trong checkDuplicateContent)
      const wordPairs = [];
      for (let i = 0; i < docWords.length - 1; i++) {
        wordPairs.push(`${docWords[i]}_${docWords[i + 1]}`);
      }
      uniqueInputWordPairs = new Set(wordPairs);
    }

    // Tách câu thành các từ có nghĩa
    const sentenceWords =
      vietnameseStopwordService.extractMeaningfulWords(sentence);

    // Tạo các cặp từ trong câu
    const sentenceWordPairs = [];
    for (let i = 0; i < sentenceWords.length - 1; i++) {
      sentenceWordPairs.push(`${sentenceWords[i]}_${sentenceWords[i + 1]}`);
    }
    const uniqueSentenceWordPairs = new Set(sentenceWordPairs);

    // Tìm các cặp từ trùng lặp (đồng nhất với checkDuplicateContent)
    const matchedWordPairs = [...uniqueSentenceWordPairs].filter((pair) =>
      uniqueInputWordPairs.has(pair)
    );

    // Tính tỷ lệ trùng lặp theo công thức: (số cặp từ trùng / số cặp từ trong câu) * 100
    // (đồng nhất với checkDuplicateContent)
    let duplicateRatio = 0;
    if (uniqueSentenceWordPairs.size > 0) {
      duplicateRatio =
        (matchedWordPairs.length / uniqueInputWordPairs.size) * 100;
    }

    return duplicateRatio;
  } catch (error) {
    console.error("Error calculating sentence duplicate ratio:", error);
    return 0;
  }
}

// Get plagiarism check statistics by month (admin only)
exports.getPlagiarismCheckStats = async (req, res) => {
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

    // Aggregate plagiarism checks by month
    const stats = await PlagiarismCheck.aggregate([
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
    console.error('Get plagiarism check stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê kiểm tra plagiarism'
    });
  }
};