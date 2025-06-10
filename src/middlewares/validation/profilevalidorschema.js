const { check } = require("express-validator");

const profileValidationSchema = [
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string"),

  check("qualification")
    .optional()
    .isString()
    .withMessage("Qualification must be a string"),

  check("profileImage")
    .optional()
    .isURL()
    .withMessage("ProfileImage must be a valid URL"),

  check("username")
    .notEmpty()
    .withMessage("Username is required")
    .isString()
    .withMessage("Username must be a string")
    .isLength({ min: 4, max: 50 })
    .withMessage("Username must be between 4 and 50 characters"),

  check("experience")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Experience must be a positive integer"),

  check("phoneNumber")
    .optional()
    .isString()
    .withMessage("PhoneNumber must be a string")
    .isMobilePhone()
    .withMessage("PhoneNumber must be a valid mobile number"),

  check("address.street")
    .optional()
    .isString()
    .withMessage("Street must be a string"),

  check("address.city")
    .optional()
    .isString()
    .withMessage("City must be a string"),

  check("address.state")
    .optional()
    .isString()
    .withMessage("State must be a string"),

  check("address.country")
    .optional()
    .isString()
    .withMessage("Country must be a string"),

  check("address.postalCode")
    .optional()
    .isString()
    .withMessage("PostalCode must be a string"),

  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be a valid email address"),

  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  check("role")
    .notEmpty()
    .withMessage("Role is required")
    .isIn(["ADMIN", "TEACHER"])
    .withMessage("Role must be either ADMIN or TEACHER"),

  check("isActive")
    .optional()
    .isBoolean()
    .withMessage("IsActive must be a boolean"),

  check("isDelete")
    .optional()
    .isBoolean()
    .withMessage("IsDelete must be a boolean"),
];

module.exports = profileValidationSchema;
