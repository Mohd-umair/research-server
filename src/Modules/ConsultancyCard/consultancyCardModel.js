const mongoose = require("mongoose");

const consultancyCardSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      // SECURITY: This field is automatically set from the JWT token in the controller
      // Users cannot set or modify this field directly - it's always the logged-in user's ID
    },
    title: { type: String, required: true },
    description: { type: String },
    category: {type: Number, required: true},
    pricing: {
      single: { type: String },
      project: { type: String },
    },
    imagePath: { type: String },
    isActive: { type: Boolean, default: true },
    isDelete: { type: Boolean, default: false },
    
    // Approval workflow fields
    isApproved: { 
      type: Boolean, 
      default: false,
      index: true // Add index for faster queries
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'draft'],
      default: 'pending',
      index: true
    },
    submittedAt: { 
      type: Date, 
      default: Date.now 
    },
    lastModified: { 
      type: Date, 
      default: Date.now 
    },
    approvedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Teacher"
    },
    approvedAt: { 
      type: Date 
    },
    rejectionReason: { 
      type: String 
    }
  },
  {
    timestamps: true,
  }
);

// Middleware to update lastModified on save
consultancyCardSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastModified = new Date();
  }
  next();
});

// Indexes for better query performance
consultancyCardSchema.index({ teacherId: 1, isApproved: 1 });
consultancyCardSchema.index({ status: 1, createdAt: -1 });
consultancyCardSchema.index({ isApproved: 1, isActive: 1, isDelete: 1 });

const ConsultancyCard = mongoose.model(
  "ConsultancyCard",
  consultancyCardSchema
);

module.exports = ConsultancyCard;
