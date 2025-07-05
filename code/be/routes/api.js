const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const ForbiddenWord = require('../models/ForbiddenWord');
const TextCheck = require('../models/TextCheck');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
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

// Helper functions to extract text from different file types
async function extractTextFromFile(filePath, mimetype) {
  try {
    switch (mimetype) {
      case 'text/plain':
        return fs.readFileSync(filePath, 'utf8');
      
      case 'application/pdf':
        const pdfBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        return pdfData.text;
      
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const docBuffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer: docBuffer });
        return result.value;
      
      default:
        throw new Error('Unsupported file type');
    }
  } catch (error) {
    throw new Error(`Error extracting text: ${error.message}`);
  }
}

// Clean up uploaded file
function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error cleaning up file:', error);
  }
}

// GET all forbidden words (Admin only)
router.get('/words', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, category, severity, search } = req.query;
    
    // Build query
    let query = {};
    if (category) query.category = category;
    if (severity) query.severity = severity;
    if (search) {
      query.word = { $regex: search, $options: 'i' };
    }

    const words = await ForbiddenWord.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ForbiddenWord.countDocuments(query);

    res.json({
      success: true,
      data: words,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get words error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy danh sách từ khóa'
    });
  }
});

// GET word by ID (Admin only)
router.get('/words/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const word = await ForbiddenWord.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');
    
    if (!word) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy từ khóa'
      });
    }
    
    res.json({
      success: true,
      data: word
    });
  } catch (error) {
    console.error('Get word by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi lấy thông tin từ khóa'
    });
  }
});

// POST new word (Admin only)
router.post('/words', protect, authorize('admin'), async (req, res) => {
  try {
    const { word, category, severity, description } = req.body;
    
    if (!word) {
      return res.status(400).json({
        success: false,
        error: 'Từ khóa là bắt buộc'
      });
    }

    // Check if word already exists
    const existingWord = await ForbiddenWord.findOne({ word: word.toLowerCase() });
    if (existingWord) {
      return res.status(400).json({
        success: false,
        error: 'Từ khóa này đã tồn tại'
      });
    }
    
    const newWord = await ForbiddenWord.create({
      word: word.toLowerCase(),
      category: category || 'other',
      severity: severity || 'medium',
      description,
      createdBy: req.user._id
    });

    await newWord.populate('createdBy', 'name email');
    
    res.status(201).json({
      success: true,
      data: newWord,
      message: 'Thêm từ khóa thành công'
    });
  } catch (error) {
    console.error('Add word error:', error);
    res.status(500).json({
      success: false,
      error: 'Lỗi server khi thêm từ khóa'
    });
  }
});

// PUT update word
router.put('/words/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const wordIndex = words.findIndex(w => w.id === id);
    
    if (wordIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Word not found'
      });
    }
    
    const { word, filtered } = req.body;
    
    if (word !== undefined) {
      words[wordIndex].word = word.toLowerCase();
    }
    if (filtered !== undefined) {
      words[wordIndex].filtered = filtered;
    }
    
    res.json({
      success: true,
      data: words[wordIndex],
      message: 'Word updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE word
router.delete('/words/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const wordIndex = words.findIndex(w => w.id === id);
    
    if (wordIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Word not found'
      });
    }
    
    const deletedWord = words.splice(wordIndex, 1)[0];
    
    res.json({
      success: true,
      data: deletedWord,
      message: 'Word deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Upload file endpoint
router.post('/upload-file', upload.single('file'), async (req, res) => {
  let filePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    filePath = req.file.path;
    const extractedText = await extractTextFromFile(filePath, req.file.mimetype);
    
    // Clean up the uploaded file after processing
    cleanupFile(filePath);
    
    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Could not extract text from file or file is empty'
      });
    }

    res.json({
      success: true,
      data: {
        extractedText: extractedText.trim(),
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      },
      message: 'File processed successfully'
    });
  } catch (error) {
    // Clean up file in case of error
    if (filePath) {
      cleanupFile(filePath);
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Filter text endpoint
router.post('/filter', (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }
    
    const filteredWords = words.filter(w => w.filtered).map(w => w.word);
    let filteredText = text.toLowerCase();
    
    filteredWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      filteredText = filteredText.replace(regex, '*'.repeat(word.length));
    });
    
    res.json({
      success: true,
      data: {
        originalText: text,
        filteredText: filteredText,
        wordsFiltered: filteredWords
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;