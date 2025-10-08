const express = require("express");
const { protect, authorize, optionalAuth } = require("../middleware/auth");
const plagiarismController = require("../controllers/plagiarismController");
const userUploadRoutes = require("./userUpload");
const stopwordsRoutes = require("./stopwords");
const userRoutes = require("./users");
const avltreeRoutes = require("./avltree");
const router = express.Router();
const auditController = require("../controllers/auditController");
const thresholdController = require("../controllers/thresholdController");

// ===== PLAGIARISM CHECKING ROUTES =====

// Upload file for plagiarism checking (file is deleted after processing)
router.post("/plagiarism/upload", protect, plagiarismController.uploadFile);

// Check plagiarism
router.post("/check-plagiarism", protect, plagiarismController.checkPlagiarism);

// Check document similarity (kiểm tra với documents đã upload)
router.post(
  "/check-document-similarity",
  protect,
  plagiarismController.checkDocumentSimilarity
);

// Test endpoint for debugging (no auth required)
router.post("/test-plagiarism", plagiarismController.checkPlagiarism);

// Test endpoint for document similarity (no auth required)
router.post(
  "/test-document-similarity",
  plagiarismController.checkDocumentSimilarity
);

// Get plagiarism history
router.get(
  "/plagiarism-history",
  protect,
  plagiarismController.getPlagiarismHistory
);

// Get all plagiarism history for admin
router.get(
  "/admin/plagiarism-history",
  protect,
  authorize("admin"),
  plagiarismController.getAllPlagiarismHistory
);

// Get plagiarism check statistics by month for admin
router.get(
  "/admin/stats/plagiarism-checks",
  protect,
  authorize("admin"),
  plagiarismController.getPlagiarismCheckStats
);

// Get user plagiarism statistics
router.get("/plagiarism-stats", protect, plagiarismController.getUserStats);

// Get document tree statistics
router.get(
  "/document-tree-stats",
  protect,
  plagiarismController.getDocumentTreeStats
);

// Get detailed comparison with most similar document
router.get(
  "/plagiarism/:checkId/detailed-comparison",
  protect,
  plagiarismController.getDetailedComparison
);

// Get all documents comparison
router.get(
  "/plagiarism/:checkId/all-documents-comparison",
  protect,
  plagiarismController.getAllDocumentsComparison
);

// Get detailed comparison with all documents (for visual comparison)
router.get(
  "/plagiarism/:checkId/detailed-all-documents-comparison",
  protect,
  plagiarismController.getDetailedAllDocumentsComparison
);

// ===== FILE MANAGEMENT ROUTES =====

// Get list of uploaded files (returns empty list since files are not stored)
router.get("/files", protect, plagiarismController.getUploadedFiles);

// ===== TreeAVL Cache Management Routes =====

// Get cache statistics
router.get("/cache/stats", protect, plagiarismController.getCacheStats);

// Find similar texts in cache
router.post(
  "/cache/find-similar",
  protect,
  plagiarismController.findSimilarTexts
);

// Clear all cache (admin only)
router.delete(
  "/cache/clear",
  protect,
  authorize("admin"),
  plagiarismController.clearCache
);

// ===== System Management Routes =====

// Get system statistics (detection + cache)
router.get("/system/stats", protect, plagiarismController.getSystemStats);

// Initialize/Reset plagiarism detection system (admin only)
router.post(
  "/system/initialize",
  protect,
  authorize("admin"),
  plagiarismController.initializeSystem
);

// ===== USER UPLOAD ROUTES (FOR PLAGIARISM CHECK ONLY) =====
router.use("/user-upload", userUploadRoutes);

// ===== VIETNAMESE STOPWORDS ROUTES =====
router.use("/stopwords", stopwordsRoutes);

// ===== AVL TREE DATABASE PERSISTENCE ROUTES =====
router.use("/avltree", protect, authorize("admin"), avltreeRoutes);

// ===== USER MANAGEMENT ROUTES =====
router.use("/users", userRoutes);

router.get("/home", plagiarismController.home);

// ===== AUDIT LOG ROUTES =====
router.post("/audit-logs", protect, auditController.createLog);
router.get("/audit-logs", protect, authorize("admin"), auditController.listLogs);

// ===== THRESHOLD MANAGEMENT ROUTES =====
// Public threshold access for all authenticated users (read-only)
router.get("/thresholds", protect, thresholdController.getThresholds);

// Admin-only threshold management
router.get("/admin/thresholds", protect, authorize("admin"), thresholdController.getThresholds);
router.put("/admin/thresholds", protect, authorize("admin"), thresholdController.updateThresholds);
router.get("/admin/thresholds/history", protect, authorize("admin"), thresholdController.getThresholdHistory);
router.post("/admin/thresholds/reset", protect, authorize("admin"), thresholdController.resetThresholds);

module.exports = router;
