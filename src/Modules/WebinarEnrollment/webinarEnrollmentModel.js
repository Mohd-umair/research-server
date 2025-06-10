const mongoose = require("mongoose");

const webinarEnrollment = new mongoose.Schema({
    webinarId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:"Webinars",
      require: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Students",
      require: true,
    },
  });

  const webinarEnrollmentModel = new mongoose.model("WebinarEnrollments", webinarEnrollment);

  module.exports = webinarEnrollmentModel;