const { check } = require("express-validator");

const videoValidationSchema = [
  check("videoTitle")
    .notEmpty()
    .withMessage("Video title is required")
    .isString()
    .withMessage("Video title must be a string")
    .trim(),

  check("videoUrl")
    .notEmpty()
    .withMessage("Video URL is required")
    .isString()
    .withMessage("Video URL must be a valid string")
    .trim()
    .matches(/^(http|https):\/\/[^ "]+$/)
    .withMessage("Video URL must be a valid URL"),

  check("courseId")
    .notEmpty()
    .withMessage("Course ID is required")
    .isMongoId()
    .withMessage("Course ID must be a valid MongoDB ObjectId"),

  check("createdBy")
    .notEmpty()
    .withMessage("Created By field is required")
    .isMongoId()
    .withMessage("Created By must be a valid MongoDB ObjectId"),

  check("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  check("isDelete")
    .optional()
    .isBoolean()
    .withMessage("isDelete must be a boolean"),
];

module.exports = videoValidationSchema;
