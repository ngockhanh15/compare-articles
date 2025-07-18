const express = require('express');
const router = express.Router();
const vietnameseStopwordService = require('../services/VietnameseStopwordService');
const { protect } = require('../middleware/auth');

// Lấy thống kê stopwords
router.get('/stats', protect, async (req, res) => {
  try {
    if (!vietnameseStopwordService.initialized) {
      await vietnameseStopwordService.initialize();
    }
    
    const stats = vietnameseStopwordService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting stopword stats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê stopwords',
      error: error.message
    });
  }
});

// Lấy tất cả stopwords
router.get('/all', protect, async (req, res) => {
  try {
    if (!vietnameseStopwordService.initialized) {
      await vietnameseStopwordService.initialize();
    }
    
    const stopwords = vietnameseStopwordService.getAllStopwords();
    res.json({
      success: true,
      data: {
        stopwords: stopwords,
        total: stopwords.length
      }
    });
  } catch (error) {
    console.error('Error getting all stopwords:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách stopwords',
      error: error.message
    });
  }
});

// Kiểm tra một từ có phải stopword không
router.post('/check', protect, async (req, res) => {
  try {
    const { word } = req.body;
    
    if (!word) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp từ cần kiểm tra'
      });
    }

    if (!vietnameseStopwordService.initialized) {
      await vietnameseStopwordService.initialize();
    }
    
    const isStopword = vietnameseStopwordService.isStopword(word);
    res.json({
      success: true,
      data: {
        word: word,
        isStopword: isStopword
      }
    });
  } catch (error) {
    console.error('Error checking stopword:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra stopword',
      error: error.message
    });
  }
});

// Loại bỏ stopwords từ text
router.post('/remove', protect, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp text cần xử lý'
      });
    }

    if (!vietnameseStopwordService.initialized) {
      await vietnameseStopwordService.initialize();
    }
    
    const originalText = text;
    const filteredText = vietnameseStopwordService.removeStopwords(text);
    const meaningfulWords = vietnameseStopwordService.extractMeaningfulWords(text);
    const stopwordDensity = vietnameseStopwordService.calculateStopwordDensity(text);
    
    res.json({
      success: true,
      data: {
        originalText: originalText,
        filteredText: filteredText,
        meaningfulWords: meaningfulWords,
        stopwordDensity: Math.round(stopwordDensity * 100) / 100,
        stats: {
          originalWordCount: originalText.split(/\s+/).length,
          filteredWordCount: filteredText.split(/\s+/).length,
          meaningfulWordCount: meaningfulWords.length,
          removedWordCount: originalText.split(/\s+/).length - meaningfulWords.length
        }
      }
    });
  } catch (error) {
    console.error('Error removing stopwords:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi loại bỏ stopwords',
      error: error.message
    });
  }
});

// Tách text thành chunks dựa trên stopwords
router.post('/split', protect, async (req, res) => {
  try {
    const { text, options = {} } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp text cần tách'
      });
    }

    if (!vietnameseStopwordService.initialized) {
      await vietnameseStopwordService.initialize();
    }
    
    const chunks = vietnameseStopwordService.splitByStopwords(text, options);
    
    res.json({
      success: true,
      data: {
        originalText: text,
        chunks: chunks,
        totalChunks: chunks.length,
        options: options,
        stats: {
          originalWordCount: text.split(/\s+/).length,
          totalMeaningfulWords: chunks.reduce((sum, chunk) => sum + chunk.meaningfulWordCount, 0),
          averageChunkLength: chunks.length > 0 ? Math.round(chunks.reduce((sum, chunk) => sum + chunk.meaningfulWordCount, 0) / chunks.length) : 0
        }
      }
    });
  } catch (error) {
    console.error('Error splitting text by stopwords:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tách text theo stopwords',
      error: error.message
    });
  }
});

// Thêm stopword mới
router.post('/add', protect, async (req, res) => {
  try {
    const { word } = req.body;
    
    if (!word) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp từ cần thêm'
      });
    }

    if (!vietnameseStopwordService.initialized) {
      await vietnameseStopwordService.initialize();
    }
    
    vietnameseStopwordService.addStopword(word);
    
    res.json({
      success: true,
      message: `Đã thêm stopword: ${word}`,
      data: {
        word: word,
        totalStopwords: vietnameseStopwordService.getStats().totalStopwords
      }
    });
  } catch (error) {
    console.error('Error adding stopword:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi thêm stopword',
      error: error.message
    });
  }
});

// Xóa stopword
router.delete('/remove/:word', protect, async (req, res) => {
  try {
    const { word } = req.params;
    
    if (!word) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp từ cần xóa'
      });
    }

    if (!vietnameseStopwordService.initialized) {
      await vietnameseStopwordService.initialize();
    }
    
    const removed = vietnameseStopwordService.removeStopword(word);
    
    if (removed) {
      res.json({
        success: true,
        message: `Đã xóa stopword: ${word}`,
        data: {
          word: word,
          totalStopwords: vietnameseStopwordService.getStats().totalStopwords
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Không tìm thấy stopword: ${word}`
      });
    }
  } catch (error) {
    console.error('Error removing stopword:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa stopword',
      error: error.message
    });
  }
});

module.exports = router;