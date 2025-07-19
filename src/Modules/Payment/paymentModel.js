const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const paymentSchema = new Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Made optional for guest payments
    },

    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeacherProfile",
      required: false, // For consultancy payments
    },

    consultancyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConsultancyCard",
      required: false, // For consultancy payments
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
      enum: ["courseEnroll", "hireTeacher", "consultancy_booking", "other"],
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ["Pending", "Completed", "completed", "Failed", "Refunded"],
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
      enum: ["Course", "ConsultancyCard", "Webinar", "TeacherProfile"], // Added TeacherProfile
      required: function () {
        return this.transactionType !== "other";
      },
    },
    
    // Additional fields for consultancy payments
    paymentDetails: {
      type: Schema.Types.Mixed, // Store Razorpay response details
      required: false,
    },
    
    consultancyType: {
      type: String,
      enum: ["hourly_consultation", "project_consultation", "research_guidance"],
      required: false,
    },
    
    sessionStatus: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "rescheduled"],
      default: "scheduled",
      required: false,
    },
    
    sessionDetails: {
      scheduledAt: {
        type: Date,
        required: false,
      },
      duration: {
        type: Number, // in minutes
        default: 60,
        required: false,
      },
      meetingLink: {
        type: String,
        required: false,
      },
      notes: {
        type: String,
        required: false,
      }
    }
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
