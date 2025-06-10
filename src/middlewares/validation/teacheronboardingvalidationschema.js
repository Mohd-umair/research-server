const { check } = require("express-validator");

const teacherValidationSchema = [
  check("firstName")
    .notEmpty()
    .withMessage("First name is required")
    .isString()
    .withMessage("First name must be a string")
    .trim(),

  check("lastName")
    .notEmpty()
    .withMessage("Last name is required")
    .isString()
    .withMessage("Last name must be a string")
    .trim(),

  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email must be valid")
    .trim()
    .normalizeEmail(),

  check("onboardingStatus")
    .optional()
    .isIn(["approved", "rejected", "pending"])
    .withMessage("Onboarding status must be 'approved', 'rejected', or 'pending'"),

  check("phoneNumber")
    .notEmpty()
    .withMessage("Phone number is required")
    .isString()
    .withMessage("Phone number must be a string")
    .matches(/^\d{10}$/)
    .withMessage("Phone number must be exactly 10 digits long"),

  check("experience")
    .optional()
    .isString()
    .withMessage("Experience must be a string"),

  check("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

module.exports = teacherValidationSchema;
