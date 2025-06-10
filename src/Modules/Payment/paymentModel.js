const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const paymentSchema = new Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
    },
    transactionType: {
      type: String,
      enum: ["courseEnroll", "hireTeacher", "other"],
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ["Pending", "Completed", "Failed", "Refunded"],
      default: "Pending",
    },
    razorpayOrderId: {
      type: String,
      required: true,
    },
    transactionId: {
      type: String,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: function () {
        return this.transactionType !== "other"; // Required unless transactionType is 'other'
      },
      refPath: "referenceModel", // Dynamically selects collection
    },
    referenceModel: {
      type: String,
      enum: ["Course", "ConsultancyCard", "Webinar"], // Collection names
      required: function () {
        return this.transactionType !== "other";
      },
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
