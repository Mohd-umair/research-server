const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"]
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email address"]
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, "Phone number cannot exceed 20 characters"]
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      maxlength: [200, "Subject cannot exceed 200 characters"]
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"]
    },
    category: {
      type: String,
      enum: ["General", "Technical Support", "Payment", "Course", "Research", "Collaboration", "Other"],
      default: "General"
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium"
    },
    status: {
      type: String,
      enum: ["New", "In Progress", "Resolved", "Closed"],
      default: "New"
    },
    source: {
      type: String,
      enum: ["Website", "Email", "Phone", "Social Media"],
      default: "Website"
    },
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    // Admin response
    adminResponse: {
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher"
      },
      responseMessage: String,
      responseDate: Date,
      isPublic: {
        type: Boolean,
        default: false
      }
    },
    // Additional metadata
    metadata: {
      pageUrl: String,
      referrer: String,
      userType: {
        type: String,
        enum: ["Guest", "Student", "Teacher", "Admin"],
        default: "Guest"
      }
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ category: 1 });
contactSchema.index({ createdAt: -1 });
contactSchema.index({ priority: 1 });

// Virtual for formatted date
contactSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Pre-save middleware to set priority based on category
contactSchema.pre('save', function(next) {
  if (this.category === 'Payment' || this.category === 'Technical Support') {
    this.priority = 'High';
  }
  next();
});

const Contact = mongoose.model("Contact", contactSchema);
module.exports = Contact;
