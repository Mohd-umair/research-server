const { check } = require("express-validator");

const SigninvalidationSchema = [
  check("email")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),
  check("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

module.exports =  SigninvalidationSchema;
