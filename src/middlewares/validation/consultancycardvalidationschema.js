const { check } = require("express-validator");

const consultancyCardValidationSchema = [
  check("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .withMessage("Title must be a string")
    .isLength({ min: 3 })
    .withMessage("Title must be at least 3 characters long"),

  check("description")
    .optional()
    .isString()
    .withMessage("Description must be a string"),

  check("pricing.single")
    .optional()
    .isString()
    .withMessage("Pricing for single must be a string"),

  check("pricing.project")
    .optional()
    .isString()
    .withMessage("Pricing for project must be a string"),

];

module.exports = consultancyCardValidationSchema;
