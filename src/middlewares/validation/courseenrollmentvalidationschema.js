const { check } = require("express-validator");

const enrollmentValidationSchema = [
  check("studentId")
    .notEmpty()
    .withMessage("Student ID is required")
    .isMongoId()
    .withMessage("Student ID must be a valid MongoDB ObjectId"),

  check("courseId")
    .notEmpty()
    .withMessage("Course ID is required")
    .isMongoId()
    .withMessage("Course ID must be a valid MongoDB ObjectId"),

  check("paymentId")
    .notEmpty()
    .withMessage("Payment ID is required")
    .isMongoId()
    .withMessage("Payment ID must be a valid MongoDB ObjectId"),

  check("isEnrolled")
    .optional()
    .isBoolean()
    .withMessage("isEnrolled must be a boolean"),

  check("enrolledAt")
    .optional()
    .isString()
    .withMessage("enrolledAt must be a string"),
];

module.exports = enrollmentValidationSchema;
