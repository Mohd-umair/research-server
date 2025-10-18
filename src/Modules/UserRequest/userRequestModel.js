const mongoose = require("mongoose");

const userRequestSchema = new mongoose.Schema(
  {
    requestBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    type: {
      type: String,
      enum: ["Lab", "Document", "Data"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "In Progress"],
      default: "Pending",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    
    // Lab specific fields
    labDetails: {
      nature: {
        type: String,
        enum: [
          "Chemistry Lab",
          "Physics Lab", 
          "Biology Lab",
          "Computer Lab",
          "Engineering Lab",
          "Research Lab"
        ]
      },
      needs: String,
      additionalInfo: String,
    },
    
    // Document specific fields
    documentDetails: {
      doi: String,
      type: {
        type: String,
        enum: [
          "Research Paper",
          "Journal Article", 
          "Conference Paper",
          "Thesis",
          "Book Chapter",
          "Technical Report"
        ]
      },
      title: String,
      publisher: String,
      author: String,
      publishedDate: Date,
    },
    
    // Data specific fields
    dataDetails: {
      type: {
        type: String,
        enum: [
          "Dataset",
          "Database Access",
          "API Access", 
          "Survey Data",
          "Experimental Data",
          "Historical Data"
        ]
      },
      title: String,
      description: String,
    },
    
    // Admin response
    adminResponse: {
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
      },
      responseMessage: String,
      responseDate: Date,
    },
    
    // File attachments
    attachments: [{
      fileName: String,
      fileUrl: String,
      fileType: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Document fulfillment confirmation
    isFulfilled: {
      type: Boolean,
      default: false,
      description: "Whether the user has confirmed that the found document meets their requirements"
    },
    
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for better query performance
userRequestSchema.index({ requestBy: 1 });
userRequestSchema.index({ type: 1 });
userRequestSchema.index({ status: 1 });
userRequestSchema.index({ createdAt: -1 });

const UserRequest = mongoose.model("UserRequest", userRequestSchema);
module.exports = UserRequest; 