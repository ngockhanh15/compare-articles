const express = require('express');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const plagiarismController = require('../controllers/plagiarismController');
const router = express.Router();

// ===== PLAGIARISM CHECKING ROUTES =====

// Upload file for plagiarism checking (file is deleted after processing)
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

// Get list of uploaded files (returns empty list since files are not stored)
router.get('/files', protect, plagiarismController.getUploadedFiles);

// ===== TreeAVL Cache Management Routes =====

// Get cache statistics
router.get('/cache/stats', protect, plagiarismController.getCacheStats);

// Find similar texts in cache
router.post('/cache/find-similar', protect, plagiarismController.findSimilarTexts);

// Clear all cache (admin only)
router.delete('/cache/clear', protect, authorize('admin'), plagiarismController.clearCache);

// ===== System Management Routes =====

// Get system statistics (detection + cache)
router.get('/system/stats', protect, plagiarismController.getSystemStats);

// Initialize/Reset plagiarism detection system (admin only)
router.post('/system/initialize', protect, authorize('admin'), plagiarismController.initializeSystem);

module.exports = router;