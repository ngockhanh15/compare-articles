const plagiarismDetectionService = require('../services/PlagiarismDetectionService');

/**
 * Script để khởi tạo hệ thống plagiarism detection
 * Được gọi khi server khởi động
 */
async function initializePlagiarismSystem() {
  try {
    console.log('🚀 Initializing Plagiarism Detection System...');
    
    // Khởi tạo service
    await plagiarismDetectionService.initialize();
    
    // Lấy thống kê sau khi khởi tạo
    const stats = plagiarismDetectionService.getStats();
    
    console.log('✅ Plagiarism Detection System initialized successfully!');
    console.log(`📊 System Stats:
    - Total Documents: ${stats.totalDocuments}
    - Total Chunks: ${stats.totalChunks}
    - Initialized: ${stats.initialized}
    - Memory Usage: ${Math.round(stats.memoryUsage.heapUsed / 1024 / 1024)}MB`);
    
    return {
      success: true,
      stats: stats
    };
    
  } catch (error) {
    console.error('❌ Failed to initialize Plagiarism Detection System:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Nếu script được chạy trực tiếp
if (require.main === module) {
  // Kết nối database trước khi khởi tạo
  require('../config/database');
  
  initializePlagiarismSystem()
    .then(result => {
      if (result.success) {
        console.log('✅ Initialization completed successfully');
        process.exit(0);
      } else {
        console.error('❌ Initialization failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Initialization error:', error);
      process.exit(1);
    });
}

module.exports = initializePlagiarismSystem;