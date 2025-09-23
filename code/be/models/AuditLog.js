const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String },
    action: {
      type: String,
      required: true,
      enum: [
        "upload_document",
        "update_document",
        "delete_document",
        "download_document",
        "create_user",
        "delete_user",
        "update_user_role",
        "toggle_user_status",
        "reset_user_password",
        "UPDATE_THRESHOLDS",
        "RESET_THRESHOLDS",
        "FILTER_PLAGIARISM_HISTORY",
        "CLEAR_PLAGIARISM_HISTORY_FILTERS",
        "EXPORT_PLAGIARISM_HISTORY",
        "VIEW_PLAGIARISM_HISTORY_DETAILS",
      ],
    },
    targetType: {
      type: String,
      enum: ["document", "user", "system", "Threshold"],
      default: "system",
    },
    targetId: { type: String },
    targetName: { type: String },
    metadata: { type: Object },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

// Indexes for performance optimization
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorName: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ createdAt: -1, action: 1 }); // Compound index for date + action filtering
AuditLogSchema.index({ createdAt: -1, actorName: 1 }); // Compound index for date + user filtering

module.exports = mongoose.model("AuditLog", AuditLogSchema);
