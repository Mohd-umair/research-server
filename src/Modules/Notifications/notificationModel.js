const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    // Who receives this notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher", // Can be Student or Teacher
      required: true,
      index: true,
    },
    recipientModel: {
      type: String,
      enum: ["Teacher", "Student"],
      default: "Teacher",
    },
    
    // Notification type
    type: {
      type: String,
      enum: [
        "DOCUMENT_UPLOADED",
        "REQUEST_APPROVED",
        "REQUEST_REJECTED",
        "FULFILLMENT_APPROVED",
        "FULFILLMENT_REJECTED",
        "NEW_REQUEST",
        "NEW_MESSAGE",
        "PAYMENT_RECEIVED",
        "SYSTEM_ALERT",
      ],
      required: true,
    },
    
    // Notification content
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    
    // Related entity information
    relatedEntity: {
      entityType: {
        type: String,
        enum: ["UserRequest", "PaperRequest", "Payment", "Message", "System"],
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    
    // Who triggered this notification (optional)
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },
    
    // Notification status
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    
    // Priority
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    
    // Action URL (optional - where to navigate when clicked)
    actionUrl: {
      type: String,
    },
    
    // Metadata for additional information
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    
    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better performance
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isDeleted: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

// Virtual for time elapsed
notificationSchema.virtual("timeAgo").get(function () {
  const now = new Date();
  const diff = now - this.createdAt;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
});

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
