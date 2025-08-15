const CustomError = require("./CustomError");
const { 
  AUTH_ERRORS, 
  VALIDATION_ERRORS, 
  DATABASE_ERRORS, 
  GENERAL_ERRORS 
} = require("../Utils/errorMessages");

const developmentError = (error, res) => {
  return res.status(error.statusCode).json({
    status: error.statusCode,
    message: error.message,
    stackTrace: error.stack,
    error: error,
  });
};

const productionError = (err, req, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({ status: err.status, msg: err.message });
  }

  res.status(500).json({
    status: "Error",
    msg: "Something went wrong! Please try again later.",
  });
};

const castErrorHandler = (err) => {
  const msg = VALIDATION_ERRORS.INVALID_VALUE(err.path, err.value);
  return new CustomError(msg, 400);
};

const duplicateKeyErrorHandler = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const msg = VALIDATION_ERRORS.ALREADY_EXISTS(field, value);
  return new CustomError(msg, 400);
};

const validationErrorHandler = (err) => {
  const errors = Object.values(err.errors).map((val) => val.message);
  const errorMessages = errors.join(". ");
  const msg = `Validation failed: ${errorMessages}`;
  return new CustomError(msg, 400);
};

// Enhanced error message mapping
const getErrorMessage = (error) => {
  // Handle specific error types
  if (error.name === 'CastError') {
    return VALIDATION_ERRORS.INVALID_VALUE(error.path, error.value);
  }
  
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(val => val.message);
    return `Validation failed: ${errors.join('. ')}`;
  }
  
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    return VALIDATION_ERRORS.ALREADY_EXISTS(field, value);
  }
  
  if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
    return DATABASE_ERRORS.CONNECTION_FAILED;
  }
  
  if (error.name === 'JsonWebTokenError') {
    return AUTH_ERRORS.TOKEN_INVALID;
  }
  
  if (error.name === 'TokenExpiredError') {
    return AUTH_ERRORS.TOKEN_EXPIRED;
  }
  
  // Handle specific status codes
  switch (error.statusCode) {
    case 400:
      return error.message || GENERAL_ERRORS.BAD_REQUEST;
    case 401:
      return error.message || AUTH_ERRORS.INVALID_CREDENTIALS;
    case 403:
      return error.message || AUTH_ERRORS.INSUFFICIENT_PERMISSIONS;
    case 404:
      return error.message || GENERAL_ERRORS.NOT_FOUND;
    case 409:
      return error.message || GENERAL_ERRORS.CONFLICT;
    case 422:
      return error.message || VALIDATION_ERRORS.VALIDATION_FAILED;
    case 429:
      return GENERAL_ERRORS.RATE_LIMIT_EXCEEDED;
    case 500:
      return GENERAL_ERRORS.INTERNAL_SERVER_ERROR;
    case 502:
      return GENERAL_ERRORS.SERVICE_UNAVAILABLE;
    case 503:
      return GENERAL_ERRORS.SERVICE_UNAVAILABLE;
    default:
      return error.message || GENERAL_ERRORS.UNKNOWN_ERROR;
  }
};

module.exports = (error, req, res, next) => {
  // Ensure we have a valid status code
  const statusCode = error.statusCode || 500;
  const status = error.status || "Error";

  console.log("=== GLOBAL ERROR HANDLER ===");
  console.log("Error object:", error);
  console.log("Error message:", error.message);
  console.log("Error statusCode:", statusCode);
  console.log("Error status:", status);
  console.log("Error type:", typeof statusCode);
  console.log("Error name:", error.name);
  console.log("Error code:", error.code);
  console.log("===========================");

  // Ensure statusCode is a valid number
  let validStatusCode = 500;
  
  if (typeof statusCode === 'number' && statusCode >= 100 && statusCode < 600) {
    validStatusCode = statusCode;
  } else {
    console.log("Invalid status code detected, using 500");
  }

  // Don't send response if headers already sent
  if (res.headersSent) {
    console.log("Headers already sent, cannot send error response");
    return;
  }

  try {
    // Get appropriate error message
    const errorMessage = getErrorMessage(error);
    
    const errorResponse = {
      success: false,
      status: validStatusCode,
      message: errorMessage
    };

    // Add additional details in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stackTrace = error.stack;
      errorResponse.error = {
        name: error.name,
        code: error.code,
        path: error.path,
        value: error.value
      };
    }

    return res.status(validStatusCode).json(errorResponse);
  } catch (responseError) {
    console.error("Error sending error response:", responseError);
    // Fallback to basic error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: GENERAL_ERRORS.INTERNAL_SERVER_ERROR
      });
    }
  }

  if (process.env.NODE_ENV === "X") {
    developmentError(error, res);
  } else if (process.env.NODE_ENV === "production") {
    if (error.name === "CastError") error = castErrorHandler(error);
    if (error.code === 11000) error = duplicateKeyErrorHandler(error);
    if (error.name === "ValidationError") error = validationErrorHandler(error);
    productionError(error, res);
  }
};