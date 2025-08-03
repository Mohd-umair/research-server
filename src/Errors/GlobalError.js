const CustomError = require("./CustomError");

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
  const msg = `Invalid value for ${err.path}: ${err.value}!`;
  return new CustomError(msg, 400);
};

const duplicateKeyErrorHandler = (err) => {
  const name = err.keyValue.name;
  const msg = `There is already a movie with name ${name}. Please use another name!`;

  return new CustomError(msg, 400);
};

const validationErrorHandler = (err) => {
  const errors = Object.values(err.errors).map((val) => val.message);
  const errorMessages = errors.join(". ");
  const msg = `Invalid input data: ${errorMessages}`;

  return new CustomError(msg, 400);
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
    return res.status(validStatusCode).json({
      success: false,
      status: validStatusCode,
      message: error.message || 'Something went wrong',
      stackTrace: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  } catch (responseError) {
    console.error("Error sending error response:", responseError);
    // Fallback to basic error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Internal server error'
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