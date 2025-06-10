const { check } = require("express-validator");

const consultancyValidationSchema = [
  check("teacherId")
    .notEmpty()
    .withMessage("Teacher ID is required")
    .isMongoId()
    .withMessage("Teacher ID must be a valid MongoDB ObjectId"),

  check("studentId")
    .notEmpty()
    .withMessage("Student ID is required")
    .isMongoId()
    .withMessage("Student ID must be a valid MongoDB ObjectId"),

  check("cardId")
    .notEmpty()
    .withMessage("Card ID is required")
    .isMongoId()
    .withMessage("Card ID must be a valid MongoDB ObjectId"),

  check("paymentId")
    .optional()
    .isMongoId()
    .withMessage("Payment ID must be a valid MongoDB ObjectId"),

  check("type")
    .notEmpty()
    .withMessage("Type is required")
    .isIn(["single", "project"])
    .withMessage("Type must be 'single' or 'project'"),

  check("status")
    .optional()
    .isIn(["pending", "inProgress", "completed"])
    .withMessage("Status must be 'pending', 'inProgress', or 'completed'"),

  check("isScheduled")
    .optional()
    .isBoolean()
    .withMessage("isScheduled must be a boolean"),

  check("scheduledDate")
    .optional()
    .isISO8601()
    .withMessage("Scheduled date must be in ISO 8601 format"),
];

module.exports = consultancyValidationSchema;
