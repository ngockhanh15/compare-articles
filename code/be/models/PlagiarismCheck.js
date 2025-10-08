const mongoose = require('mongoose');

const plagiarismCheckSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  originalText: {
    type: String,
    required: true
  },
  textLength: {
    type: Number,
    required: true
  },
  wordCount: {
    type: Number,
    required: true
  },
  sentenceCount: {
    type: Number,
    required: true,
    default: 0
  },
  duplicateSentenceCount: {
    type: Number,
    required: true,
    default: 0
  },
  duplicatePercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  matches: [{
    text: {
      type: String,
      required: true
    },
    source: {
      type: String,
      required: true
    },
    similarity: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    url: String,
    matchedWords: Number
  }],
  sources: [String], // Danh sách các nguồn được tìm thấy
  confidence: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['low', 'medium', 'high'], // Dựa trên duplicatePercentage
    required: true
  },
  source: {
    type: String,
    enum: ['text', 'file'],
    required: true
  },
  fileName: String,     // Nếu source là file
  fileType: String,     // Nếu source là file
  processingTime: Number, // Thời gian xử lý (ms)
  options: {
    checkInternet: {
      type: Boolean,
      default: true
    },
    checkDatabase: {
      type: Boolean,
      default: true
    },
    sensitivity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    language: {
      type: String,
      default: 'vi'
    }
  },
  ipAddress: String,
  userAgent: String,
  
  // 🚀 CACHING OPTIMIZATION FIELDS - Lưu kết quả chi tiết để tránh gọi lại checkDuplicateContent
  detailedResult: {
    type: mongoose.Schema.Types.Mixed, // Lưu toàn bộ kết quả từ DocumentAVLService
    default: null
  },
  
  // Metadata bổ sung từ DocumentAVLService
  totalInputSentences: {
    type: Number,
    default: 0
  },
  dtotal: {
    type: Number,
    default: 0
  },
  dab: {
    type: Number,
    default: 0
  },
  totalSentencesWithInputWords: {
    type: Number,
    default: 0
  },
  maxDuplicateSentences: {
    type: Number,
    default: 0
  },
  documentWithMostDuplicates: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  totalDuplicateSentences: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for optimization
plagiarismCheckSchema.index({ user: 1, createdAt: -1 });
plagiarismCheckSchema.index({ status: 1 });
plagiarismCheckSchema.index({ duplicatePercentage: 1 });
plagiarismCheckSchema.index({ source: 1 });

// Static method: Get user statistics
plagiarismCheckSchema.statics.getUserStats = function (userId) {
  return this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDuplicateRate: { $avg: '$duplicatePercentage' },
        totalWords: { $sum: '$wordCount' },
        totalChars: { $sum: '$textLength' }
      }
    }
  ]);
};

// Static method: Get recent checks for user
plagiarismCheckSchema.statics.getRecentChecks = function (userId, limit = 10) {
  return this.find({ user: userId })
    .select('originalText duplicatePercentage status source fileName createdAt')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Hàm mới 

// Method to determine status based on duplicate percentage
plagiarismCheckSchema.methods.determineStatus = function() {
  if (this.duplicatePercentage > 30) {
    return 'high';
  } else if (this.duplicatePercentage > 15) {
    return 'medium';
  } else {
    return 'low';
  }
};

// Pre-save middleware to set status
plagiarismCheckSchema.pre('save', function(next) {
  if (this.isModified('duplicatePercentage') || this.isNew) {
    this.status = this.determineStatus();
  }
  next();
});

module.exports = mongoose.model('PlagiarismCheck', plagiarismCheckSchema);