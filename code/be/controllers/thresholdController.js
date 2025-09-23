const Threshold = require("../models/Threshold");
const { logAction } = require("../utils/auditLogger");

// Get current system thresholds
const getThresholds = async (req, res) => {
  try {
    const thresholds = await Threshold.getCurrentThresholds();
    
    res.json({
      success: true,
      thresholds: {
        sentenceThreshold: thresholds.sentenceThreshold,
        highDuplicationThreshold: thresholds.highDuplicationThreshold,
        documentComparisonThreshold: thresholds.documentComparisonThreshold,
      },
      lastUpdated: thresholds.updatedAt,
      updatedBy: thresholds.updatedBy,
      notes: thresholds.notes,
    });
  } catch (error) {
    console.error("Get thresholds error:", error);
    res.status(500).json({
      success: false,
      error: "Không thể lấy cấu hình ngưỡng",
      details: error.message,
    });
  }
};

// Update system thresholds (admin only)
const updateThresholds = async (req, res) => {
  try {
    const { sentenceThreshold, highDuplicationThreshold, documentComparisonThreshold, notes } = req.body;
    const userId = req.user.id;

    // Validate input
    if (
      sentenceThreshold === undefined ||
      highDuplicationThreshold === undefined ||
      documentComparisonThreshold === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: "Thiếu thông tin ngưỡng",
        details: "Cần cung cấp đầy đủ 3 loại ngưỡng",
      });
    }

    // Validate ranges
    const validateRange = (value, name) => {
      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 100) {
        throw new Error(`${name} phải là số trong khoảng 0-100`);
      }
      return num;
    };

    const validatedThresholds = {
      sentenceThreshold: validateRange(sentenceThreshold, "Ngưỡng câu"),
      highDuplicationThreshold: validateRange(highDuplicationThreshold, "Ngưỡng trùng lặp cao"),
      documentComparisonThreshold: validateRange(documentComparisonThreshold, "Ngưỡng so sánh tài liệu"),
    };

    // Get current thresholds for comparison
    const currentThresholds = await Threshold.getCurrentThresholds();
    
    // Check if there are any changes
    const hasChanges = 
      currentThresholds.sentenceThreshold !== validatedThresholds.sentenceThreshold ||
      currentThresholds.highDuplicationThreshold !== validatedThresholds.highDuplicationThreshold ||
      currentThresholds.documentComparisonThreshold !== validatedThresholds.documentComparisonThreshold;

    if (!hasChanges) {
      return res.json({
        success: true,
        message: "Không có thay đổi nào được thực hiện",
        thresholds: validatedThresholds,
      });
    }

    // Create new threshold record
    const newThreshold = new Threshold({
      ...validatedThresholds,
      updatedBy: userId,
      notes: notes || `Cập nhật ngưỡng bởi ${req.user.name}`,
    });

    await newThreshold.save();

    // Log audit action
    await logAction({
      req,
      actorId: userId,
      actorName: req.user.name,
      action: "UPDATE_THRESHOLDS",
      targetType: "Threshold",
      targetId: newThreshold._id,
      targetName: "System Thresholds",
      metadata: {
        oldThresholds: {
          sentenceThreshold: currentThresholds.sentenceThreshold,
          highDuplicationThreshold: currentThresholds.highDuplicationThreshold,
          documentComparisonThreshold: currentThresholds.documentComparisonThreshold,
        },
        newThresholds: validatedThresholds,
        notes: notes,
      },
    });

    res.json({
      success: true,
      message: "Cập nhật ngưỡng thành công",
      thresholds: validatedThresholds,
      lastUpdated: newThreshold.updatedAt,
    });
  } catch (error) {
    console.error("Update thresholds error:", error);
    
    // Handle validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        error: "Dữ liệu không hợp lệ",
        details: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: "Không thể cập nhật cấu hình ngưỡng",
      details: error.message,
    });
  }
};

// Get threshold history (admin only)
const getThresholdHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const thresholds = await Threshold.find()
      .populate("updatedBy", "name email")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Threshold.countDocuments();

    res.json({
      success: true,
      thresholds,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get threshold history error:", error);
    res.status(500).json({
      success: false,
      error: "Không thể lấy lịch sử thay đổi ngưỡng",
      details: error.message,
    });
  }
};

// Reset thresholds to default (admin only)
const resetThresholds = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notes } = req.body;

    const defaultThresholds = {
      sentenceThreshold: 50,
      highDuplicationThreshold: 30,
      documentComparisonThreshold: 20,
    };

    // Get current thresholds for audit log
    const currentThresholds = await Threshold.getCurrentThresholds();

    // Create new threshold record with defaults
    const newThreshold = new Threshold({
      ...defaultThresholds,
      updatedBy: userId,
      notes: notes || `Đặt lại ngưỡng mặc định bởi ${req.user.name}`,
    });

    await newThreshold.save();

    // Log audit action
    await logAction({
      req,
      actorId: userId,
      actorName: req.user.name,
      action: "RESET_THRESHOLDS",
      targetType: "Threshold",
      targetId: newThreshold._id,
      targetName: "System Thresholds",
      metadata: {
        oldThresholds: {
          sentenceThreshold: currentThresholds.sentenceThreshold,
          highDuplicationThreshold: currentThresholds.highDuplicationThreshold,
          documentComparisonThreshold: currentThresholds.documentComparisonThreshold,
        },
        newThresholds: defaultThresholds,
        notes: notes,
      },
    });

    res.json({
      success: true,
      message: "Đặt lại ngưỡng mặc định thành công",
      thresholds: defaultThresholds,
      lastUpdated: newThreshold.updatedAt,
    });
  } catch (error) {
    console.error("Reset thresholds error:", error);
    res.status(500).json({
      success: false,
      error: "Không thể đặt lại ngưỡng mặc định",
      details: error.message,
    });
  }
};

module.exports = {
  getThresholds,
  updateThresholds,
  getThresholdHistory,
  resetThresholds,
};