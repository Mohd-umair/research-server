const { check } = require("express-validator");

const collaborationValidationSchema = [
  check("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .withMessage("Title must be a string")
    .isLength({ min: 3 })
    .withMessage("Title must be at least 3 characters long"),
  
  check("description")
    .notEmpty()
    .withMessage("Description is required")
    .isString()
    .withMessage("Description must be a string")
    .isLength({ min: 10 })
    .withMessage("Description must be at least 10 characters long"),
  
  check("createdBy")
    .notEmpty()
    .withMessage("CreatedBy is required")
    .isMongoId()
    .withMessage("CreatedBy must be a valid MongoDB ObjectId"),

  check("isDelete")
    .optional()
    .isBoolean()
    .withMessage("isDelete must be a boolean"),
];

module.exports = collaborationValidationSchema;
