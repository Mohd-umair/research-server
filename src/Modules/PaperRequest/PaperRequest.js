const mongoose = require("mongoose");

const paperRequestSchema = new mongoose.Schema(
  {
    requestBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
    paperDetail: {
      type: Object,
    },
    fileUrl: {
      type: String,
      default: "",
    },
    requestStatus: {
      type: String,
      enum: ["pending", "approved", "inProgress", "rejected"],
      default: "pending",
    },
    fulfilledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
    DOI_number: {
      type: String,
      required: true,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);
const PaperRequest = new mongoose.model("PaperRequest", paperRequestSchema);
module.exports = PaperRequest;
