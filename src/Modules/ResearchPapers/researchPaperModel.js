const mongoose = require("mongoose");

const researchPaperSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  DOI_number: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  abstract: {
    type: String,

    trim: true,
  },
  fileUrl: {
    type: String,
    default:"",

    trim: true,
  },
  referenceCount: {
    type: Number,

    min: 0,
  },
  publisher: {
    type: String,

    trim: true,
  },
  type: {
    type: String,
  },
  isDelete: {
    type: Boolean,
    default:false
  }
});
const RESEARCHPAPER = new mongoose.model("ResearchPaper", researchPaperSchema);
module.exports = RESEARCHPAPER;
