const { check } = require("express-validator");

const labsValidationSchema = [
  check("title")
    .notEmpty()
    .withMessage("Title is required")
    .isString()
    .withMessage("Title must be a string"),

  check("description")
    .notEmpty()
    .withMessage("Description is required")
    .isString()
    .withMessage("Description must be a string"),

  check("maxStudentsAllowed")
    .notEmpty()
    .withMessage("Maximum number of students allowed is required")
    .isInt({ min: 1 })
    .withMessage("Max students allowed must be a positive integer"),

  check("isPaid")
    .optional()
    .isBoolean()
    .withMessage("isPaid must be a boolean"),

  check("labType")
    .notEmpty()
    .withMessage("Lab type is required")
    .isString()
    .withMessage("Lab type must be a string"),

  check("labLocation")
    .notEmpty()
    .withMessage("Lab location is required")
    .isString()
    .withMessage("Lab location must be a string"),

  check("isAvailable")
    .optional()
    .isBoolean()
    .withMessage("isAvailable must be a boolean"),

  check("status")
    .optional()
    .isIn(["Available", "In Use", "Under Maintenance"])
    .withMessage(
      "Status must be one of the following: Available, In Use, Under Maintenance"
    ),

  check("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number if provided"),

  check("createdBy")
    .notEmpty()
    .withMessage("CreatedBy is required")
    .isMongoId()
    .withMessage("CreatedBy must be a valid MongoDB ObjectId"),

  check("createdByRole")
    .notEmpty()
    .withMessage("CreatedByRole is required")
    .isIn(["Student", "Teacher", "Admin"])
    .withMessage("CreatedByRole must be one of: Student, Teacher, Admin"),

  check("studentRequests")
    .optional()
    .isArray()
    .withMessage("Student requests must be an array")
    .custom((value) => value.every((id) => mongoose.Types.ObjectId.isValid(id)))
    .withMessage("All student requests must be valid MongoDB ObjectIds"),

  check("totalRequests")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Total requests must be a non-negative integer"),

  check("availableSubjects")
    .optional()
    .isArray()
    .withMessage("Available subjects must be an array")
    .custom((value) => value.every((id) => mongoose.Types.ObjectId.isValid(id)))
    .withMessage("All available subjects must be valid MongoDB ObjectIds"),
];

module.exports = labsValidationSchema;
