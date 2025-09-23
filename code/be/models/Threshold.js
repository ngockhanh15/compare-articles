const mongoose = require("mongoose");

const thresholdSchema = new mongoose.Schema(
  {
    // Ngưỡng câu - xác định khi nào một câu được coi là trùng lặp
    sentenceThreshold: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 50,
    },
    
    // Ngưỡng trùng lặp cao - cảnh báo khi tài liệu có mức trùng lặp cao
    highDuplicationThreshold: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 30,
    },
    
    // Ngưỡng trùng lặp với từng tài liệu - hiển thị kết quả so sánh từng cặp
    documentComparisonThreshold: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 20,
    },
    
    // Metadata
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Cho phép null cho system default
    },
    
    // Ghi chú về thay đổi
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Index để tìm kiếm nhanh
thresholdSchema.index({ updatedAt: -1 });

// Static method để lấy threshold hiện tại
thresholdSchema.statics.getCurrentThresholds = async function() {
  try {
    // Lấy threshold mới nhất
    const threshold = await this.findOne().sort({ updatedAt: -1 });
    
    if (!threshold) {
      // Nếu chưa có threshold nào, tạo mặc định
      const defaultThreshold = new this({
        sentenceThreshold: 50,
        highDuplicationThreshold: 30,
        documentComparisonThreshold: 20,
        updatedBy: null, // System default
        notes: "Default system thresholds"
      });
      
      await defaultThreshold.save();
      return defaultThreshold;
    }
    
    return threshold;
  } catch (error) {
    console.error("Error getting current thresholds:", error);
    throw error;
  }
};

// Static method để lấy chỉ 3 giá trị threshold
thresholdSchema.statics.getThresholdValues = async function() {
  try {
    const threshold = await this.getCurrentThresholds();
    
    return {
      sentenceThreshold: threshold.sentenceThreshold,
      highDuplicationThreshold: threshold.highDuplicationThreshold,
      documentComparisonThreshold: threshold.documentComparisonThreshold
    };
  } catch (error) {
    console.error("Error getting threshold values:", error);
    // Trả về giá trị mặc định nếu có lỗi
    return {
      sentenceThreshold: 50,
      highDuplicationThreshold: 30,
      documentComparisonThreshold: 20
    };
  }
};

// Instance method để validate thresholds
thresholdSchema.methods.validateThresholds = function() {
  const errors = [];
  
  if (this.sentenceThreshold < 0 || this.sentenceThreshold > 100) {
    errors.push("Ngưỡng câu phải trong khoảng 0-100%");
  }
  
  if (this.highDuplicationThreshold < 0 || this.highDuplicationThreshold > 100) {
    errors.push("Ngưỡng trùng lặp cao phải trong khoảng 0-100%");
  }
  
  if (this.documentComparisonThreshold < 0 || this.documentComparisonThreshold > 100) {
    errors.push("Ngưỡng so sánh tài liệu phải trong khoảng 0-100%");
  }
  
  return errors;
};

// Pre-save middleware để validate
thresholdSchema.pre("save", function(next) {
  const errors = this.validateThresholds();
  if (errors.length > 0) {
    const error = new Error(errors.join(", "));
    error.name = "ValidationError";
    return next(error);
  }
  next();
});

module.exports = mongoose.model("Threshold", thresholdSchema);