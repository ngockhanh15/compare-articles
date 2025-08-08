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
      ],
    },
    targetType: {
      type: String,
      enum: ["document", "user", "system"],
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

AuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", AuditLogSchema);
