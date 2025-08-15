/**
 * Standardized error messages for consistent user experience
 */

const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "Invalid email or password. Please check your credentials and try again.",
  ACCOUNT_NOT_FOUND: "No account found with this email address. Please check your email or sign up for a new account.",
  ACCOUNT_DELETED: "This account has been permanently deleted and cannot be accessed.",
  ACCOUNT_DEACTIVATED: "Your account has been deactivated. Please contact support for assistance.",
  ACCOUNT_PENDING_APPROVAL: "Your account is pending approval. Please wait for admin approval or contact support.",
  ACCOUNT_LOCKED: "Your account has been temporarily locked due to multiple failed login attempts. Please try again later.",
  PASSWORD_INCORRECT: "The password you entered is incorrect. Please try again.",
  EMAIL_PASSWORD_REQUIRED: "Email and password are required.",
  TOKEN_INVALID: "Invalid authentication token. Please log in again.",
  TOKEN_EXPIRED: "Your session has expired. Please log in again.",
  SESSION_EXPIRED: "Your session has expired. Please log in again.",
  INSUFFICIENT_PERMISSIONS: "You don't have permission to perform this action.",
  TOO_MANY_ATTEMPTS: "Too many failed attempts. Please try again later."
};

const VALIDATION_ERRORS = {
  REQUIRED_FIELD: (field) => `${field} is required.`,
  INVALID_EMAIL: "Please provide a valid email address.",
  INVALID_PHONE: "Please provide a valid phone number.",
  INVALID_FORMAT: (field) => `Invalid format for ${field}.`,
  MIN_LENGTH: (field, min) => `${field} must be at least ${min} characters long.`,
  MAX_LENGTH: (field, max) => `${field} cannot exceed ${max} characters.`,
  PASSWORD_MISMATCH: "Passwords do not match.",
  INVALID_VALUE: (field, value) => `Invalid value for ${field}: ${value}.`,
  ALREADY_EXISTS: (field, value) => `${field} "${value}" already exists. Please use a different value.`,
  INVALID_DATE: "Please provide a valid date.",
  INVALID_FILE_TYPE: "Invalid file type. Please upload a supported file format.",
  FILE_TOO_LARGE: "File size is too large. Please upload a smaller file."
};

const RESOURCE_ERRORS = {
  NOT_FOUND: (resource) => `${resource} not found.`,
  ALREADY_EXISTS: (resource) => `${resource} already exists.`,
  DELETED: (resource) => `${resource} has been deleted.`,
  UNAUTHORIZED: "You are not authorized to access this resource.",
  FORBIDDEN: "Access to this resource is forbidden.",
  CONFLICT: "The resource has been modified by another user. Please refresh and try again.",
  LOCKED: "This resource is currently locked and cannot be modified."
};

const DATABASE_ERRORS = {
  CONNECTION_FAILED: "Database connection error. Please try again later.",
  QUERY_FAILED: "Database query failed. Please try again.",
  TRANSACTION_FAILED: "Database transaction failed. Please try again.",
  DUPLICATE_KEY: (field) => `${field} already exists. Please use a different value.`,
  REFERENCE_ERROR: "Referenced resource does not exist.",
  VALIDATION_FAILED: "Data validation failed. Please check your input."
};

const UPLOAD_ERRORS = {
  FILE_TOO_LARGE: "File size exceeds the maximum allowed limit.",
  INVALID_FILE_TYPE: "File type is not supported. Please upload a valid file.",
  UPLOAD_FAILED: "File upload failed. Please try again.",
  STORAGE_ERROR: "File storage error. Please try again later.",
  MISSING_FILE: "No file was uploaded. Please select a file to upload."
};

const GENERAL_ERRORS = {
  INTERNAL_SERVER_ERROR: "Internal server error. Please try again later.",
  SERVICE_UNAVAILABLE: "Service is temporarily unavailable. Please try again later.",
  BAD_REQUEST: "Bad request. Please check your input and try again.",
  NOT_FOUND: "The requested resource was not found.",
  CONFLICT: "Conflict. The resource already exists or has been modified.",
  RATE_LIMIT_EXCEEDED: "Too many requests. Please wait a moment and try again.",
  MAINTENANCE_MODE: "System is currently under maintenance. Please try again later.",
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  TIMEOUT: "Request timed out. Please try again.",
  UNKNOWN_ERROR: "An unexpected error occurred. Please try again later."
};

const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "Login successful.",
  LOGOUT_SUCCESS: "Logout successful.",
  REGISTRATION_SUCCESS: "Registration successful. Please check your email for verification.",
  PASSWORD_CHANGED: "Password changed successfully.",
  PASSWORD_RESET_SENT: "Password reset link has been sent to your email.",
  PASSWORD_RESET_SUCCESS: "Password has been reset successfully.",
  PROFILE_UPDATED: "Profile updated successfully.",
  DATA_SAVED: "Data saved successfully.",
  DATA_DELETED: "Data deleted successfully.",
  EMAIL_VERIFIED: "Email verified successfully.",
  ACCOUNT_ACTIVATED: "Account activated successfully.",
  APPROVAL_SUCCESS: "Approval successful.",
  REJECTION_SUCCESS: "Rejection successful."
};

module.exports = {
  AUTH_ERRORS,
  VALIDATION_ERRORS,
  RESOURCE_ERRORS,
  DATABASE_ERRORS,
  UPLOAD_ERRORS,
  GENERAL_ERRORS,
  SUCCESS_MESSAGES
}; 