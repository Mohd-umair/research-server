const mongoose = require("mongoose");
const { Schema } = mongoose;

const enrollmentSchema = new Schema({
  studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
  courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  paymentId: {
    type: Schema.Types.ObjectId,
    ref: "Payments",
    required: true,
  },
  isEnrolled: {
    type: Boolean,
    default: false,
  },
  enrolledAt: { type: String },
});

const CourseEnrollment = new mongoose.model(
  "CourseEnrollment",
  enrollmentSchema
);
module.exports = CourseEnrollment;
