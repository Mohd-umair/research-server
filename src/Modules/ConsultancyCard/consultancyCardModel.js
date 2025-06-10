const mongoose = require("mongoose");

const consultancyCardSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    category: {type: Number, required: true},
    pricing: {
      single: { type: String },
      project: { type: String },
    },
    imagePath: { type: String },
    isActive: { type: Boolean, default: true },
    isDelete: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const ConsultancyCard = mongoose.model(
  "ConsultancyCard",
  consultancyCardSchema
);

module.exports = ConsultancyCard;
