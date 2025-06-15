const { body } = require("express-validator");

const SignupValidationSchema = [
  body("firstName")
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2 })
    .withMessage("First name must be at least 2 characters long"),
  
  body("lastName")
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2 })
    .withMessage("Last name must be at least 2 characters long"),
  
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number"),
  
  body("phoneNumber")
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage("Please provide a valid phone number"),
  
  body("collegeName")
    .optional()
    .isLength({ min: 2 })
    .withMessage("College name must be at least 2 characters long"),
  
  body("department")
    .optional()
    .isLength({ min: 2 })
    .withMessage("Department must be at least 2 characters long"),
  
  body("graduationStatus")
    .optional()
    .isIn(["UG", "PG", "PhD"])
    .withMessage("Graduation status must be UG, PG, or PhD"),
  
  body("dob")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid date of birth")
];

const SignInValidationSchema = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  
  body("password")
    .notEmpty()
    .withMessage("Password is required")
];

const ProfileValidationSchema = [
  body("firstName")
    .optional()
    .isLength({ min: 2 })
    .withMessage("First name must be at least 2 characters long"),
  
  body("lastName")
    .optional()
    .isLength({ min: 2 })
    .withMessage("Last name must be at least 2 characters long"),
  
  body("phoneNumber")
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage("Please provide a valid phone number"),
  
  body("collegeName")
    .optional()
    .isLength({ min: 2 })
    .withMessage("College name must be at least 2 characters long"),
  
  body("department")
    .optional()
    .isLength({ min: 2 })
    .withMessage("Department must be at least 2 characters long"),
  
  body("graduationStatus")
    .optional()
    .isIn(["UG", "PG", "PhD"])
    .withMessage("Graduation status must be UG, PG, or PhD"),
  
  body("dob")
    .optional()
    .isISO8601()
    .withMessage("Please provide a valid date of birth"),
  
  body("profilePicture")
    .optional()
    .isString()
    .withMessage("Profile picture must be a valid URL or path")
];

module.exports = {
  SignupValidationSchema,
  SignInValidationSchema,
  ProfileValidationSchema
}; 