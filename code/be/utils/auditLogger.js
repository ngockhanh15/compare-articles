const AuditLog = require("../models/AuditLog");

async function logAction({
  req,
  actorId,
  actorName,
  action,
  targetType,
  targetId,
  targetName,
  metadata,
}) {
  try {
    await AuditLog.create({
      actor: actorId || (req?.user && req.user.id),
      actorName: actorName || (req?.user && req.user.name),
      action,
      targetType,
      targetId,
      targetName,
      metadata,
      ipAddress: req?.ip,
      userAgent: req?.get && req.get("User-Agent"),
    });
  } catch (err) {
    console.error("Failed to write audit log:", err.message);
  }
}

module.exports = { logAction };
