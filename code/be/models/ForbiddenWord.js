const mongoose = require('mongoose');

const forbiddenWordSchema = new mongoose.Schema({
  word: {
    type: String,
    required: [true, 'Từ khóa là bắt buộc'],
    unique: true, // Mongoose sẽ tự tạo unique index
    lowercase: true,
    trim: true,
    maxlength: [100, 'Từ khóa không được vượt quá 100 ký tự']
  },
  category: {
    type: String,
    enum: [
      'spam',
      'violence',
      'hate',
      'discrimination',
      'harassment',
      'abuse',
      'illegal',
      'other'
    ],
    default: 'other'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    maxlength: [500, 'Mô tả không được vượt quá 500 ký tự']
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// 🔥 Index tối ưu (đã bỏ trùng)
forbiddenWordSchema.index({ category: 1, isActive: 1 }); // compound index
forbiddenWordSchema.index({ severity: 1 });

// ✅ Static methods
forbiddenWordSchema.statics.getActiveWords = function () {
  return this.find({ isActive: true }).select('word category severity');
};

forbiddenWordSchema.statics.getWordsByCategory = function (category) {
  return this.find({ category, isActive: true }).select('word severity');
};

module.exports = mongoose.model('ForbiddenWord', forbiddenWordSchema);
