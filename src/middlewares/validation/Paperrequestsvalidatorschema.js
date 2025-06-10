const { check } = require("express-validator");

const paperRequestValidationSchema = [
  check("requestBy")
    .notEmpty()
    .withMessage("RequestBy is required")
    .isMongoId()
    .withMessage("RequestBy must be a valid MongoDB ObjectId"),

  check("paperDetail")
    .notEmpty()
    .withMessage("PaperDetail is required")
    .isObject()
    .withMessage("PaperDetail must be an object"),

  check("fileUrl")
    .optional()
    .isString()
    .withMessage("FileUrl must be a string"),

  check("requestStatus")
    .optional()
    .isIn(["pending", "approved", "inProgress", "rejected"])
    .withMessage(
      "RequestStatus must be one of the following: pending, approved, inProgress, rejected"
    ),

  check("fulfilledBy")
    .optional()
    .isMongoId()
    .withMessage("FulfilledBy must be a valid MongoDB ObjectId"),

  check("DOI_number")
    .notEmpty()
    .withMessage("DOI_number is required")
    .isString()
    .withMessage("DOI_number must be a string"),

  check("isDelete")
    .optional()
    .isBoolean()
    .withMessage("isDelete must be a boolean"),
];

module.exports = paperRequestValidationSchema;
