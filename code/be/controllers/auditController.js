const AuditLog = require("../models/AuditLog");

// GET /api/audit-logs?page=1&limit=5
exports.listLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "5", 10);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      AuditLog.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .populate("actor", "name email role"),
      AuditLog.countDocuments({}),
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
