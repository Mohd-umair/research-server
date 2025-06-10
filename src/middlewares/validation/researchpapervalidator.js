const { check } = require("express-validator");

const researchPaperValidationSchema = [
  check("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .withMessage("Title must be a string")
    .trim(),

  check("DOI_number")
    .notEmpty()
    .withMessage("DOI_number is required")
    .isString()
    .withMessage("DOI_number must be a string")
    .trim(),

  check("abstract")
    .optional()
    .isString()
    .withMessage("Abstract must be a string")
    .trim(),

  check("fileUrl")
    .optional()
    .isString()
    .withMessage("FileUrl must be a string")
    .trim()
    .isURL()
    .withMessage("FileUrl must be a valid URL"),

  check("referenceCount")
    .optional()
    .isInt({ min: 0 })
    .withMessage("ReferenceCount must be a non-negative integer"),

  check("publisher")
    .optional()
    .isString()
    .withMessage("Publisher must be a string")
    .trim(),

  check("type")
    .optional()
    .isString()
    .withMessage("Type must be a string"),

  check("isDelete")
    .optional()
    .isBoolean()
    .withMessage("IsDelete must be a boolean"),
];

module.exports = researchPaperValidationSchema;
