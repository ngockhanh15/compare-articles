const express = require('express');
const { protect } = require('../middleware/auth');
const documentController = require('../controllers/documentController');
const router = express.Router();

// All routes require authentication
router.use(protect);

// ===== DOCUMENT MANAGEMENT ROUTES =====

// Upload document
router.post('/upload', documentController.uploadDocument);

// Get user documents with pagination and filters
router.get('/', documentController.getUserDocuments);

// Get document statistics
router.get('/stats', documentController.getDocumentStats);

// Get document by ID
router.get('/:id', documentController.getDocumentById);

// Get extracted text from document for plagiarism check
router.get('/:id/text', documentController.getDocumentText);

// Download document
router.get('/:id/download', documentController.downloadDocument);

// Update document metadata
router.put('/:id', documentController.updateDocument);

// Delete document
router.delete('/:id', documentController.deleteDocument);

module.exports = router;