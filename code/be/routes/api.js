const express = require('express');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const plagiarismController = require('../controllers/plagiarismController');
const userUploadRoutes = require('./userUpload');
const stopwordsRoutes = require('./stopwords');
const userRoutes = require('./users');
const router = express.Router();

// ===== PLAGIARISM CHECKING ROUTES =====

// Upload file for plagiarism checking (file is deleted after processing)
router.post('/plagiarism/upload', protect, plagiarismController.uploadFile);

// Check plagiarism
router.post('/check-plagiarism', protect, plagiarismController.checkPlagiarism);

// Check document similarity (kiểm tra với documents đã upload)
router.post('/check-document-similarity', protect, plagiarismController.checkDocumentSimilarity);

// Test endpoint for debugging (no auth required)
router.post('/test-plagiarism', plagiarismController.checkPlagiarism);

// Test endpoint for document similarity (no auth required)
router.post('/test-document-similarity', plagiarismController.checkDocumentSimilarity);

// Get plagiarism history
router.get('/plagiarism-history', protect, plagiarismController.getPlagiarismHistory);

// Get user plagiarism statistics
router.get('/plagiarism-stats', protect, plagiarismController.getUserStats);

// Get document tree statistics
router.get('/document-tree-stats', protect, plagiarismController.getDocumentTreeStats);

// Get detailed comparison with most similar document
router.get('/plagiarism/:checkId/detailed-comparison', protect, plagiarismController.getDetailedComparison);

// Get all documents comparison
router.get('/plagiarism/:checkId/all-documents-comparison', protect, plagiarismController.getAllDocumentsComparison);

// Get detailed comparison with all documents (for visual comparison)
router.get('/plagiarism/:checkId/detailed-all-documents-comparison', protect, plagiarismController.getDetailedAllDocumentsComparison);

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

// ===== USER UPLOAD ROUTES (FOR PLAGIARISM CHECK ONLY) =====
router.use('/user-upload', userUploadRoutes);

// ===== VIETNAMESE STOPWORDS ROUTES =====
router.use('/stopwords', stopwordsRoutes);

// ===== USER MANAGEMENT ROUTES =====
router.use('/users', userRoutes);

router.get('/home', protect, plagiarismController.home);

module.exports = router;
