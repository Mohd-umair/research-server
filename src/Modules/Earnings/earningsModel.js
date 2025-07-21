const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const earningsTransactionSchema = new Schema(
  {
    expertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeacherProfile",
      required: true,
    },
    consultancyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConsultancyCard",
      required: false,
    },
    collaborationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collaboration",
      required: false,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: false,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "settled", "cancelled"],
      default: "pending",
      required: true,
    },
    type: {
      type: String,
      enum: ["consultancy", "collaboration", "course", "other"],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    settlementDate: {
      type: Date,
      required: false,
    },
    adminNotes: {
      type: String,
      required: false,
    },
    paymentMethod: {
      type: String,
      required: false,
    },
    referenceNumber: {
      type: String,
      required: false,
    },
    consultancy: {
      title: String,
      category: String,
    },
    collaboration: {
      title: String,
      description: String,
    },
    student: {
      firstName: String,
      lastName: String,
      email: String,
    },
    settlementRequested: {
      type: Boolean,
      default: false,
    },
    settlementRequestDate: {
      type: Date,
      required: false,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

earningsTransactionSchema.index({ expertId: 1, status: 1 });
earningsTransactionSchema.index({ expertId: 1, paymentDate: -1 });
earningsTransactionSchema.index({ status: 1, createdAt: -1 });

const EarningsTransaction = mongoose.model("EarningsTransaction", earningsTransactionSchema);

module.exports = EarningsTransaction; 