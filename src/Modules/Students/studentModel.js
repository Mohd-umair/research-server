const mongoose = require("mongoose");

// Define the schema
const studentSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },
    userType: {
      type: String,
      enum: ["BOT", "USER"],
      default: "USER",
    },
    // emailVerificationToken: String,
    // emailVerificationTokenExpires: Date,
    password: {
      type: String,
      required: true,
      // minlength: 6,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    points: {
      type: Number,
      default: 100,
    },
    collegeName: {
      type: String,
    },
    department: {
      type: String,
    },
    graduationStatus: {
      type: String,
      enum: ["UG", "PG", "PhD", ""],
      default: ""
    },
    dob: {
      type: String
    },
    profilePicture: {
      type: String, // URL to profile image
      default: ""
    },
    // Address Information (optional for students)
    address: {
      street: {
        type: String,
        trim: true
      },
      city: {
        type: String,
        trim: true
      },
      state: {
        type: String,
        trim: true
      },
      country: {
        type: String,
        trim: true
      },
      postalCode: {
        type: String,
        trim: true
      }
    },

    isActive: {
      type: Boolean,
      default: false,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
    // Password reset fields
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Method to get profile completion percentage
studentSchema.methods.getProfileCompletionPercentage = function() {
  let completedFields = 0;
  let totalFields = 8; // Total fields for basic profile completion

  // Required fields for profile completion
  if (this.firstName) completedFields++;
  if (this.lastName) completedFields++;
  if (this.email) completedFields++;
  if (this.phoneNumber) completedFields++;
  if (this.collegeName) completedFields++;
  if (this.department) completedFields++;
  if (this.graduationStatus) completedFields++;
  if (this.dob) completedFields++;

  return Math.round((completedFields / totalFields) * 100);
};

// Method to get missing profile fields
studentSchema.methods.getMissingProfileFields = function() {
  const missingFields = [];
  
  if (!this.firstName) missingFields.push('firstName');
  if (!this.lastName) missingFields.push('lastName');
  if (!this.phoneNumber) missingFields.push('phoneNumber');
  if (!this.collegeName) missingFields.push('collegeName');
  if (!this.department) missingFields.push('department');
  if (!this.graduationStatus) missingFields.push('graduationStatus');
  if (!this.dob) missingFields.push('dob');

  return missingFields;
};

// Create the model
const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
