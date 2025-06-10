const mongoose = require("mongoose");

const TeacherCollaborationSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: true,
      trim: true 
    },
    description: { 
      type: String, 
      required: true 
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for better query performance
TeacherCollaborationSchema.index({ createdBy: 1 });
TeacherCollaborationSchema.index({ title: 'text', description: 'text' });
TeacherCollaborationSchema.index({ isDeleted: 1, isActive: 1 });

const TeacherCollaboration = mongoose.model("TeacherCollaboration", TeacherCollaborationSchema);
module.exports = TeacherCollaboration; 