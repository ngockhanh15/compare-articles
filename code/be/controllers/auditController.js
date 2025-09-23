const AuditLog = require("../models/AuditLog");
const { logAction } = require("../utils/auditLogger");

// POST /api/audit-logs - Create audit log from frontend
exports.createLog = async (req, res) => {
  try {
    const { action, targetType, targetId, targetName, metadata } = req.body;

    if (!action) {
      return res.status(400).json({ 
        success: false, 
        error: "Action is required" 
      });
    }

    await logAction({
      req,
      action,
      targetType,
      targetId,
      targetName,
      metadata,
    });

    res.json({
      success: true,
      message: "Audit log created successfully"
    });
  } catch (err) {
    console.error("Create audit log error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Không thể tạo audit log" 
    });
  }
};

// GET /api/audit-logs?page=1&limit=5&user=...&action=...&fromDate=...&toDate=...
exports.listLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "5", 10);
    const skip = (page - 1) * limit;

    // Build filter query
    const filter = {};

    // Filter by user (search in actorName)
    if (req.query.user && req.query.user.trim()) {
      filter.actorName = { $regex: req.query.user.trim(), $options: 'i' };
    }

    // Filter by action
    if (req.query.action && req.query.action.trim()) {
      filter.action = req.query.action.trim();
    }

    // Filter by date range
    if (req.query.fromDate || req.query.toDate) {
      filter.createdAt = {};
      
      if (req.query.fromDate) {
        const fromDate = new Date(req.query.fromDate);
        fromDate.setHours(0, 0, 0, 0); // Start of day
        filter.createdAt.$gte = fromDate;
      }
      
      if (req.query.toDate) {
        const toDate = new Date(req.query.toDate);
        toDate.setHours(23, 59, 59, 999); // End of day
        filter.createdAt.$lte = toDate;
      }
    }

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .populate("actor", "name email role"),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items.map((l) => ({
        id: l._id,
        actorName: l.actorName || l.actor?.name || "System",
        action: l.action,
        targetType: l.targetType,
        targetName: l.targetName,
        targetId: l.targetId,
        createdAt: l.createdAt,
        metadata: l.metadata || {},
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("List audit logs error:", err);
    res.status(500).json({ success: false, error: "Không thể lấy lịch sử hoạt động" });
  }
};
