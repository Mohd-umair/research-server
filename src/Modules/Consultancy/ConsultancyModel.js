const mongoose = require("mongoose");

const consultancySchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    cardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConsultancyCard",
      required: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    type: {
      type: String,
      enum: ["single", "project"],
      required: true,
      default:'single'
    },
    status: {
      type: String,
      enum: ["pending", "inProgress", "completed"],
      default: "inProgress",
    },

    isScheduled: {
      type: Boolean,
      default: false,
    },
    isFinished: {
      type: Boolean,
      default: false,
    }, 

    scheduledDate: { type: String },
  },
  {
    timestamps: true,
  }
);

const Consultancy = mongoose.model("Consultancy", consultancySchema);

module.exports = Consultancy;
