const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  isDelete: {
    type: Boolean,
    default: true,
  },
  assignment: [{
    name:{
      type: String,
      required: true
    },
    assignmentURL: {
      type: String,
      required: true
    }
  }],
},
{
  timestamps: true,
});

const Assignment = mongoose.model("Assignment", assignmentSchema);
module.exports = Assignment;