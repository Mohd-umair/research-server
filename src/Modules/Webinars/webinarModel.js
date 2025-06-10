const mongoose = require("mongoose");

const webinarSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profiles",
    required: true,
  },
  webinarTitle: {
    type: String,
    required: true,
    trim: true,
  },
  WebinarBanner:{
    type: String,
    required: true,
    trim: true
  },
  webinarDate: {
    type: String,
    required: true,
    trim: true,
  },
  webinarTime: {
    type: String,
    required: true,
    trim: true,
  },
  webinarSpeaker: {
    type: String,
    trim: true,
  },
  webinarSponsor: {
    type: String,
    trim: true,
  },
  webinarLocation: {
    type: String,
    trim: true,
  },
  webinarMode: {
    type: String,
    required: true,
    trim: true,
  },
  webinarDescription: {
    type: String,
    required: true,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  isDelete: {
    type: Boolean,
    default: false,
  },
},{
  timestamps: true
});



const WebinarModel = new mongoose.model("Webinar", webinarSchema);

module.exports = WebinarModel;
