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
    },
    dob: {type: String},


    isActive: {
      type: Boolean,
      default: false,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Create the model
const Student = mongoose.model("Student", studentSchema);

module.exports = Student;
