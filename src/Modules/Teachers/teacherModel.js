const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: false,
      trim: true,
    },
    qualification: {
      type: String,
      required: false,
      trim: true,
    },
    profileImage: {
      type: String,
      required: false,
    },
    username: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true
    },
    aboutTeacher: {
      type: String,
      trim: true,
    },
    contactNumber: {
      type: String,
      required: false,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    experience: {
      type: Number,
      required: false,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
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
  {
    timestamps: true,
  }
);

const TEACHER =new  mongoose.model("Teacher", teacherSchema);
module.exports = TEACHER;