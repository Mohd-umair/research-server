const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profiles",
    required: true,
  },
  type: {
    type: String,
    required: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  objective: {
    type: String,
    required: true,
    trim: true,
  },
  speakers: [{
    type: String,
    trim: true,
  }],
  organizerName: {
    type: String,
    required: true,
    trim: true,
  },
  startDateTime: {
    type: Date,
    required: true,
  },
  endDateTime: {
    type: Date,
    required: true,
  },
  modeOfConduct: {
    type: String,
    required: true,
    trim: true,
  },
  modeOfRegistration: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Cancelled', 'Completed'],
    default: 'Draft',
  },
  attendees: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isDelete: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true
});

const EventModel = new mongoose.model("Event", eventSchema);

module.exports = EventModel; 