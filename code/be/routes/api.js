const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const plagiarismController = require('../controllers/plagiarismController');
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

// Upload file endpoint (for plagiarism checking)
router.post('/upload-file', protect, upload.single('file'), async (req, res) => {
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
      extractedText: extractedText.trim(),
      fileName: req.file.originalname,
      fileSize: req.file.size
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

// ===== PLAGIARISM CHECKING ROUTES =====

// Upload file for plagiarism checking (keeps file on server)
router.post('/plagiarism/upload', protect, plagiarismController.uploadFile);

// Check plagiarism
router.post('/check-plagiarism', protect, plagiarismController.checkPlagiarism);

// Get plagiarism history
router.get('/plagiarism-history', protect, plagiarismController.getPlagiarismHistory);

// Get user plagiarism statistics
router.get('/plagiarism-stats', protect, plagiarismController.getUserStats);

// Get detailed comparison with most similar document
router.get('/plagiarism/:checkId/detailed-comparison', protect, plagiarismController.getDetailedComparison);

// Get all documents comparison
router.get('/plagiarism/:checkId/all-documents-comparison', protect, plagiarismController.getAllDocumentsComparison);

// ===== FILE MANAGEMENT ROUTES =====

// Get list of uploaded files
router.get('/files', protect, plagiarismController.getUploadedFiles);

// Get file content for analysis
router.get('/files/:fileName', protect, plagiarismController.getFileContent);

// Delete uploaded file
router.delete('/files/:fileName', protect, plagiarismController.deleteUploadedFile);

// Clean up old files (admin only)
router.post('/files/cleanup', protect, authorize('admin'), plagiarismController.cleanupOldFiles);

module.exports = router;