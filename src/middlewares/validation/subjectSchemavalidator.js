const { check } = require("express-validator");

const subjectValidationSchema = [
  check("subjectName")
    .notEmpty()
    .withMessage("Subject name is required")
    .isString()
    .withMessage("Subject name must be a string")
    .trim(),

  check("iconImage")
    .optional()
    .isString()
    .withMessage("Icon image must be a string")
    .isURL()
    .withMessage("Icon image must be a valid URL"),

  check("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  check("isDeleted")
    .optional()
    .isBoolean()
    .withMessage("isDeleted must be a boolean"),
];

module.exports = subjectValidationSchema;
