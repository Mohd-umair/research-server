const { body } = require("express-validator");

const ProfileValidationSchema = [
  body("firstName")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters")
    .trim(),
    
  body("lastName")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .trim(),
    
  body("phoneNumber")
    .optional()
    .isMobilePhone()
    .withMessage("Please provide a valid phone number"),
    
  body("collegeName")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("College name must be between 2 and 100 characters")
    .trim(),
    
  body("department")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Department must be between 2 and 100 characters")
    .trim(),
    
  body("graduationStatus")
    .optional()
    .isIn(["UG", "PG", "PhD", ""])
    .withMessage("Graduation status must be UG, PG, PhD, or empty"),
    
  body("dob")
    .optional()
    .isISO8601()
    .withMessage("Date of birth must be a valid date")
    .custom((value) => {
      const today = new Date();
      const birthDate = new Date(value);
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 16 || age > 100) {
        throw new Error("Age must be between 16 and 100 years");
      }
      return true;
    }),
    
  body("address.street")
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage("Street address must be between 5 and 200 characters")
    .trim(),
    
  body("address.city")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("City must be between 2 and 50 characters")
    .trim(),
    
  body("address.state")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("State must be between 2 and 50 characters")
    .trim(),
    
  body("address.country")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Country must be between 2 and 50 characters")
    .trim(),
    
  body("address.postalCode")
    .optional()
    .isLength({ min: 3, max: 10 })
    .withMessage("Postal code must be between 3 and 10 characters")
    .trim(),
];

module.exports = ProfileValidationSchema; 