const { body, validationResult } = require("express-validator");

const validateRequestBody = (req, res, next) => {
  let errorMessage = "";
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    errors.array().map((errorObj, i) => {
      errorMessage += errorObj.msg + "_";
    });
    return res.status(400).json({ msg: errorMessage });
  }
  next();
};


const categoryValidationSchema = [
  body("categoryTitle")
    .trim()
    .notEmpty()
    .withMessage("Category title is required")
    .isLength({ min: 3, max: 20 })
    .withMessage("Category title must be between 3 and 20 characters"),
  body("categoryDescription").trim(),
];

const subcategoryValidationSchema = [
  body("subcategoryTitle")
    .trim()
    .notEmpty()
    .withMessage("Subcategory title is required")
    .isLength({ min: 3, max: 20 })
    .withMessage("Subcategory title must be between 3 and 20 characters"),
  body("subcategoryDescription").trim(),
  body("categoryId").isMongoId().withMessage("Invalid category ID"),
  body("productCount")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Product count must be a non-negative integer"),
];

const productValidationSchema = [
  body("productTitle")
    .trim()
    .notEmpty()
    .withMessage("Product title is required"),
  body("productDescription").trim(),
  body("productImages")
    .isArray({ min: 1 })
    .withMessage("At least one product image is required"),
  body("price").isNumeric().withMessage("Price must be a number"),
  body("quantity")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a non-negative integer"),
  body("subcategoryId")
    .isArray({ min: 1 })
    .withMessage("At least one subcategory ID is required"),
  body("defaultSubcategoryId")
    .isMongoId()
    .withMessage("Invalid default subcategory ID"),
  body("productImpressions")
    .isInt({ min: 0 })
    .withMessage("Product impressions must be a non-negative integer"),
  body("salesPrice")
    .optional()
    .isNumeric()
    .withMessage("Sales price must be a number"),
];

const userValidationSchema = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 4, max: 50 })
    .withMessage("Username must be between 4 and 50 characters"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),
  body("password").notEmpty().withMessage("Password is required"),
  body("description").trim(),
  body("roleId").isMongoId().withMessage("Invalid role ID"),
  body("permissions").isArray().withMessage("Permissions must be an array"),
];



module.exports = {
  validateRequestBody,
  categoryValidationSchema,
  subcategoryValidationSchema,
  productValidationSchema,
  userValidationSchema
};
