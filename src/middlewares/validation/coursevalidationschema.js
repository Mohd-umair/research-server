const { check } = require("express-validator");

const courseValidationSchema = [
  check("courseName")
    .notEmpty()
    .withMessage("Course name is required")
    .isString()
    .withMessage("Course name must be a string")
    .isLength({ min: 3 })
    .withMessage("Course name must be at least 3 characters long"),

  check("courseDescription")
    .notEmpty()
    .withMessage("Course description is required")
    .isString()
    .withMessage("Course description must be a string")
    .isLength({ min: 10 })
    .withMessage("Course description must be at least 10 characters long"),

  check("price")
    .notEmpty()
    .withMessage("Price is required")
    .isNumeric()
    .withMessage("Price must be a number")
    .custom((value) => value >= 0)
    .withMessage("Price cannot be negative"),

  check("courseThumbnail")
    .notEmpty()
    .withMessage("Course thumbnail URL is required")
    .isString()
    .withMessage("Course thumbnail must be a string"),

  check("courseBanner")
    .notEmpty()
    .withMessage("Course banner URL is required")
    .isString()
    .withMessage("Course banner must be a string"),

  check("instructor")
    .optional()
    .isMongoId()
    .withMessage("Instructor must be a valid MongoDB ObjectId"),

  check("createdBy")
    .notEmpty()
    .withMessage("CreatedBy is required")
    .isMongoId()
    .withMessage("CreatedBy must be a valid MongoDB ObjectId"),

  check("enrolledCount")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Enrolled count must be a non-negative integer"),

  check("courseLanguage")
    .notEmpty()
    .withMessage("Course language is required")
    .isString()
    .withMessage("Course language must be a string"),

  check("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  check("isDelete")
    .optional()
    .isBoolean()
    .withMessage("isDelete must be a boolean"),
];

module.exports = courseValidationSchema;
