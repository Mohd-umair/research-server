const mongoose = require("mongoose");
const CollaborationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    userType: {
      type: String,
      enum: ["USER", "TEACHER"],
      required: true,
      default: "USER"
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Collaboration = mongoose.model("Collaboration", CollaborationSchema);
module.exports = Collaboration;
