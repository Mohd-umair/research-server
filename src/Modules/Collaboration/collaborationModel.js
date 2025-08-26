const mongoose = require("mongoose");
const CollaborationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'createdByModel',
      required: true,
    },
    createdByModel: {
      type: String,
      required: true,
      enum: ['Student', 'Teacher']
    },
    userType: {
      type: String,
      enum: ["USER", "TEACHER"],
      required: true,
      default: "USER"
    },
    // Approval status
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
CollaborationSchema.index({ createdBy: 1 });
CollaborationSchema.index({ isApproved: 1 });
CollaborationSchema.index({ isDelete: 1 });
CollaborationSchema.index({ userType: 1 });

const Collaboration = mongoose.model("Collaboration", CollaborationSchema);
module.exports = Collaboration;
