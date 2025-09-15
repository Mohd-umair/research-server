const mongoose = require("mongoose");

const paymentRequestSchema = new mongoose.Schema(
  {
    consultancyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultancy",
      required: true,
    },
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
    amount: {
      type: Number,
      required: true,
    },
    consultancyTitle: {
      type: String,
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    payoutStatus: {
      type: String,
      enum: ["not_initiated", "processing", "completed", "failed"],
      default: "not_initiated",
    },
    payoutId: {
      type: String,
      default: null,
    },
    payoutReferenceId: {
      type: String,
      default: null,
    },
    payoutFailureReason: {
      type: String,
      default: null,
    },
    payoutProcessedAt: {
      type: Date,
      default: null,
    },
    adminCommission: {
      type: Number,
      default: 0,
    },
    teacherAmount: {
      type: Number,
      default: 0,
    },
    commissionPercentage: {
      type: Number,
      default: 15,
    },
  },
  {
    timestamps: true,
  }
);

const PaymentRequest = mongoose.model("PaymentRequest", paymentRequestSchema);

module.exports = PaymentRequest;
