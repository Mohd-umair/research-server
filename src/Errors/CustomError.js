class CustomError extends Error {
  constructor(status,message) {
    super(message);
    this.statusCode = status || 500;
    this.status = status >= 400 && status < 500 ? "Fail" : "Error";
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}


module.exports = CustomError;