const express = require('express');
const { protect } = require('../middleware/auth');
const userUploadController = require('../controllers/userUploadController');
const router = express.Router();

// All routes require authentication
router.use(protect);

// ===== USER UPLOAD ROUTES (FOR PLAGIARISM CHECK ONLY) =====

// Upload file for plagiarism check (temporary, not saved)
router.post('/check-file', userUploadController.uploadForCheck);

// Check text content for plagiarism (no file upload)
router.post('/check-text', userUploadController.checkTextContent);

// Get AVL tree statistics
router.get('/tree-stats', userUploadController.getTreeStats);

module.exports = router;