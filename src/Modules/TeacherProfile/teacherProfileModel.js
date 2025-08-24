const mongoose = require("mongoose");

const teacherProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true
    },
    userType: {
      type: String,
      default: "Teacher",
      immutable: true
    },
    // Personal Information
    personalInfo: {
      firstName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
      },
      email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
      },
      phoneNumber: {
        type: String,
        required: true,
        trim: true
      },
      dateOfBirth: {
        type: Date
      },
      gender: {
        type: String,
        enum: ["male", "female", "other", "prefer-not-to-say"]
      },
      profilePicture: {
        type: String // URL to profile image
      }
    },
    // Address Information
    address: {
      street: {
        type: String,
        required: true,
        trim: true
      },
      city: {
        type: String,
        required: true,
        trim: true
      },
      state: {
        type: String,
        required: true,
        trim: true
      },
      country: {
        type: String,
        required: true,
        trim: true
      },
      postalCode: {
        type: String,
        required: true,
        trim: true
      },
      permanentAddress: {
        sameAsAbove: {
          type: Boolean,
          default: true
        },
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String
      }
    },
    // Professional Information
    professional: {
      currentPosition: {
        type: String,
        required: true,
        trim: true
      },
      institution: {
        type: String,
        required: true,
        trim: true
      },
      department: {
        type: String,
        trim: true
      },
      experience: {
        type: Number,
        required: true,
        min: 0
      },
      specialization: {
        type: String,
        required: true,
        trim: true
      },
      skills: [{
        type: String,
        trim: true
      }],
      professionalSummary: {
        type: String,
        required: true,
        minlength: 50,
        maxlength: 1000
      },
      linkedinProfile: {
        type: String,
        trim: true
      },
      researchInterests: {
        type: String,
        trim: true
      },
      publications: {
        type: String,
        trim: true
      },
      certifications: [{
        name: {
          type: String,
          required: true,
          trim: true
        },
        issuingOrganization: {
          type: String,
          required: true,
          trim: true
        },
        issueDate: Date,
        expiryDate: Date,
        credentialId: {
          type: String,
          trim: true
        }
      }],
      resume: {
        type: String // URL to resume file
      }
    },
    // Bank Account Information
    bankDetails: {
      bankName: {
        type: String,
        required: true,
        trim: true
      },
      accountHolderName: {
        type: String,
        required: true,
        trim: true
      },
      accountNumber: {
        type: String,
        required: true,
        trim: true
      },
      ifscCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
      },
      accountType: {
        type: String,
        required: true,
        enum: ["savings", "current", "salary"]
      },
      branchName: {
        type: String,
        trim: true
      },
      branchAddress: {
        type: String,
        trim: true
      }
    },
    // Profile Status
    profileStatus: {
      type: String,
      enum: ["incomplete", "pending", "approved", "rejected"],
      default: "incomplete"
    },
    isProfileComplete: {
      type: Boolean,
      default: false
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    submittedAt: {
      type: Date
    },
    approvedAt: {
      type: Date
    },
    rejectionReasons: [{
      type: String,
      trim: true
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { 
    timestamps: true,
    versionKey: false
  }
);

// Indexes for better query performance
teacherProfileSchema.index({ userId: 1 });
teacherProfileSchema.index({ "personalInfo.email": 1 });
teacherProfileSchema.index({ profileStatus: 1 });
teacherProfileSchema.index({ isActive: 1, isDeleted: 1 });

// Pre-save middleware to calculate completion percentage and update status
teacherProfileSchema.pre('save', function(next) {
  this.completionPercentage = this.calculateCompletionPercentage();
  this.isProfileComplete = this.completionPercentage === 100;
  
  // Auto-update profile status based on completion
  if (this.completionPercentage === 100 && this.profileStatus === 'incomplete') {
    this.profileStatus = 'pending';
    this.submittedAt = new Date();
  } else if (this.completionPercentage < 100 && this.profileStatus === 'pending') {
    // If completion drops below 100%, revert to incomplete
    this.profileStatus = 'incomplete';
    this.submittedAt = undefined;
  }
  
  next();
});

// Method to calculate profile completion percentage
teacherProfileSchema.methods.calculateCompletionPercentage = function() {
  let completedFields = 0;
  let totalFields = 22; // Total required fields for completion

  // Personal Info (6 fields)
  if (this.personalInfo.firstName) completedFields++;
  if (this.personalInfo.lastName) completedFields++;
  if (this.personalInfo.email) completedFields++;
  if (this.personalInfo.phoneNumber) completedFields++;
  if (this.personalInfo.dateOfBirth) completedFields++;
  if (this.personalInfo.gender) completedFields++;

  // Address (5 fields)
  if (this.address.street) completedFields++;
  if (this.address.city) completedFields++;
  if (this.address.state) completedFields++;
  if (this.address.country) completedFields++;
  if (this.address.postalCode) completedFields++;

  // Professional (6 fields)
  if (this.professional.currentPosition) completedFields++;
  if (this.professional.institution) completedFields++;
  if (this.professional.experience !== undefined) completedFields++;
  if (this.professional.specialization) completedFields++;
  if (this.professional.skills && this.professional.skills.length > 0) completedFields++;
  if (this.professional.professionalSummary) completedFields++;

  // Bank Details (5 fields)
  if (this.bankDetails.bankName) completedFields++;
  if (this.bankDetails.accountHolderName) completedFields++;
  if (this.bankDetails.accountNumber) completedFields++;
  if (this.bankDetails.ifscCode) completedFields++;
  if (this.bankDetails.accountType) completedFields++;

  return Math.round((completedFields / totalFields) * 100);
};

// Method to update profile status based on completion
teacherProfileSchema.methods.updateProfileStatus = function() {
  this.completionPercentage = this.calculateCompletionPercentage();
  this.isProfileComplete = this.completionPercentage === 100;
  
  // Auto-update profile status based on completion
  if (this.completionPercentage === 100 && this.profileStatus === 'incomplete') {
    this.profileStatus = 'pending';
    this.submittedAt = new Date();
  } else if (this.completionPercentage < 100 && this.profileStatus === 'pending') {
    // If completion drops below 100%, revert to incomplete
    this.profileStatus = 'incomplete';
    this.submittedAt = undefined;
  }
  
  return this;
};

const TeacherProfile = mongoose.model("TeacherProfile", teacherProfileSchema);
module.exports = TeacherProfile; 