const { check } = require("express-validator");

const teacherValidationSchema = [
  // Validate 'name'
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string")
    .trim(),

  // Validate 'qualification'
  check("qualification")
    .notEmpty()
    .withMessage("Qualification is required")
    .isString()
    .withMessage("Qualification must be a string")
    .trim(),

  // Validate 'profileImage' (optional)
  check("profileImage")
    .optional()
    .isString()
    .withMessage("Profile image must be a string"),

  // Validate 'username'
  check("username")
    .notEmpty()
    .withMessage("Username is required")
    .isString()
    .withMessage("Username must be a string")
    .trim(),

  // Validate 'aboutTeacher' (optional)
  check("aboutTeacher")
    .optional()
    .isString()
    .withMessage("About teacher must be a string")
    .trim(),

  // Validate 'contactNumber'
  check("contactNumber")
    .notEmpty()
    .withMessage("Contact number is required")
    .isString()
    .withMessage("Contact number must be a string")
    .matches(/^\d{10}$/)
    .withMessage("Contact number must be exactly 10 digits")
    .trim(),

  // Validate 'experience'
  check("experience")
    .notEmpty()
    .withMessage("Experience is required")
    .isNumeric()
    .withMessage("Experience must be a number")
    .custom((value) => value >= 0)
    .withMessage("Experience must be a positive number"),

  // Validate 'email'
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be valid")
    .trim()
    .normalizeEmail(),

  // Validate 'password'
  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  // Validate 'isActive' (optional)
  check("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),

  // Validate 'isDelete' (optional)
  check("isDelete")
    .optional()
    .isBoolean()
    .withMessage("isDelete must be a boolean"),
];

module.exports = teacherValidationSchema;
