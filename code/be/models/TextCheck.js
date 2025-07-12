const mongoose = require('mongoose');

const textCheckSchema = new mongoose.Schema({
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
  foundWords: [{
    word: String,
    category: String,
    severity: String,
    positions: [Number] // Vị trí xuất hiện trong text
  }],
  status: {
    type: String,
    enum: ['clean', 'warning', 'blocked'],
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
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// 🔥 Index tối ưu (bỏ duplicate createdAt)
textCheckSchema.index({ user: 1, createdAt: -1 }); // query user + mới nhất
textCheckSchema.index({ status: 1 });
textCheckSchema.index({ source: 1 });
// ❌ bỏ dòng này vì duplicate:
// textCheckSchema.index({ createdAt: -1 });

// ✅ Static method: thống kê cho user
textCheckSchema.statics.getUserStats = function (userId) {
  return this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalWords: { $sum: '$wordCount' },
        totalChars: { $sum: '$textLength' }
      }
    }
  ]);
};

module.exports = mongoose.model('TextCheck', textCheckSchema);
