const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const documentController = require('../controllers/documentController');
const router = express.Router();

// All routes require authentication
router.use(protect);

// ===== ADMIN ROUTES =====
// Admin routes for managing all documents
router.get('/admin/all', authorize('admin'), documentController.getAllDocuments);
router.get('/admin/stats', authorize('admin'), documentController.getAllDocumentStats);
router.get('/admin/stats/document-uploads', authorize('admin'), documentController.getDocumentUploadStats);
router.delete('/admin/:id', authorize('admin'), documentController.adminDeleteDocument);

// ===== DOCUMENT MANAGEMENT ROUTES =====

// Upload document
router.post('/upload', documentController.uploadDocument);

// Bulk upload documents from ZIP file
router.post('/bulk-upload', documentController.bulkUploadDocuments);

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