const CustomError = require('../Errors/CustomError');

/**
 * Email validation regex
 * Matches most standard email formats
 */
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Password validation rules:
 * - At least 8 characters long
 * - Contains at least one lowercase letter
 * - Contains at least one uppercase letter
 * - Contains at least one number
 * - Contains at least one special character
 */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Helper function to validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidEmail = (email) => {
  return emailRegex.test(email);
};

/**
 * Helper function to validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with isValid and errors
 */
const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Helper function to sanitize and validate full name
 * @param {string} fullName - Full name to validate
 * @returns {object} - Validation result
 */
const validateFullName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') {
    return { isValid: false, error: 'Full name is required' };
  }
  
  const trimmedName = fullName.trim();
  
  if (trimmedName.length < 2) {
    return { isValid: false, error: 'Full name must be at least 2 characters long' };
  }
  
  if (trimmedName.length > 100) {
    return { isValid: false, error: 'Full name must not exceed 100 characters' };
  }
  
  // Allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
  if (!nameRegex.test(trimmedName)) {
    return { isValid: false, error: 'Full name can only contain letters, spaces, hyphens, apostrophes, and periods' };
  }
  
  return { isValid: true, sanitizedName: trimmedName };
};

/**
 * Validate admin login request
 * POST /api/admin/auth/login
 */
const validateAdminLogin = (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    const errors = [];

    // Email validation
    if (!email) {
      errors.push('Email is required');
    } else if (typeof email !== 'string') {
      errors.push('Email must be a string');
    } else if (!isValidEmail(email.trim())) {
      errors.push('Please provide a valid email address');
    }

    // Password validation
    if (!password) {
      errors.push('Password is required');
    } else if (typeof password !== 'string') {
      errors.push('Password must be a string');
    } else if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    // RememberMe validation (optional)
    if (rememberMe !== undefined && typeof rememberMe !== 'boolean') {
      errors.push('RememberMe must be a boolean value');
    }

    if (errors.length > 0) {
      return next(new CustomError(`Validation errors: ${errors.join(', ')}`, 400));
    }

    // Sanitize the input
    req.body.email = email.toLowerCase().trim();
    req.body.rememberMe = Boolean(rememberMe);

    next();
  } catch (error) {
    console.error('Admin login validation error:', error);
    next(new CustomError('Validation failed', 400));
  }
};

/**
 * Validate admin creation request
 * POST /api/admin/users/create
 */
const validateAdminCreation = (req, res, next) => {
  try {
    const { email, password, fullName, role } = req.body;
    const errors = [];

    // Email validation
    if (!email) {
      errors.push('Email is required');
    } else if (typeof email !== 'string') {
      errors.push('Email must be a string');
    } else if (!isValidEmail(email.trim())) {
      errors.push('Please provide a valid email address');
    }

    // Password validation
    if (!password) {
      errors.push('Password is required');
    } else if (typeof password !== 'string') {
      errors.push('Password must be a string');
    } else {
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
      }
    }

    // Full name validation
    if (!fullName) {
      errors.push('Full name is required');
    } else {
      const nameValidation = validateFullName(fullName);
      if (!nameValidation.isValid) {
        errors.push(nameValidation.error);
      } else {
        req.body.fullName = nameValidation.sanitizedName;
      }
    }

    // Role validation
    const validRoles = ['SuperAdmin', 'Moderator', 'Viewer'];
    if (role && !validRoles.includes(role)) {
      errors.push(`Role must be one of: ${validRoles.join(', ')}`);
    }

    if (errors.length > 0) {
      return next(new CustomError(`Validation errors: ${errors.join(', ')}`, 400));
    }

    // Sanitize email
    req.body.email = email.toLowerCase().trim();
    
    // Set default role if not provided
    if (!role) {
      req.body.role = 'Viewer';
    }

    next();
  } catch (error) {
    console.error('Admin creation validation error:', error);
    next(new CustomError('Validation failed', 400));
  }
};

/**
 * Validate admin update request
 * PATCH /api/admin/users/:id
 */
const validateAdminUpdate = (req, res, next) => {
  try {
    const { fullName, role, isActive, email } = req.body;
    const errors = [];

    // Check if at least one field is provided
    const hasFields = fullName !== undefined || role !== undefined || isActive !== undefined || email !== undefined;
    
    if (!hasFields) {
      return next(new CustomError('At least one field must be provided for update', 400));
    }

    // Email validation (if provided)
    if (email !== undefined) {
      if (typeof email !== 'string') {
        errors.push('Email must be a string');
      } else if (!isValidEmail(email.trim())) {
        errors.push('Please provide a valid email address');
      } else {
        req.body.email = email.toLowerCase().trim();
      }
    }

    // Full name validation (if provided)
    if (fullName !== undefined) {
      const nameValidation = validateFullName(fullName);
      if (!nameValidation.isValid) {
        errors.push(nameValidation.error);
      } else {
        req.body.fullName = nameValidation.sanitizedName;
      }
    }

    // Role validation (if provided)
    if (role !== undefined) {
      const validRoles = ['SuperAdmin', 'Moderator', 'Viewer'];
      if (!validRoles.includes(role)) {
        errors.push(`Role must be one of: ${validRoles.join(', ')}`);
      }
    }

    // isActive validation (if provided)
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      errors.push('isActive must be a boolean value');
    }

    if (errors.length > 0) {
      return next(new CustomError(`Validation errors: ${errors.join(', ')}`, 400));
    }

    next();
  } catch (error) {
    console.error('Admin update validation error:', error);
    next(new CustomError('Validation failed', 400));
  }
};

/**
 * Validate password change request
 * POST /api/admin/auth/change-password
 */
const validatePasswordChange = (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const errors = [];

    // Current password validation
    if (!currentPassword) {
      errors.push('Current password is required');
    } else if (typeof currentPassword !== 'string') {
      errors.push('Current password must be a string');
    }

    // New password validation
    if (!newPassword) {
      errors.push('New password is required');
    } else if (typeof newPassword !== 'string') {
      errors.push('New password must be a string');
    } else {
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
      }
    }

    // Confirm password validation
    if (!confirmPassword) {
      errors.push('Password confirmation is required');
    } else if (newPassword !== confirmPassword) {
      errors.push('New password and confirmation password do not match');
    }

    // Check if new password is different from current
    if (currentPassword && newPassword && currentPassword === newPassword) {
      errors.push('New password must be different from current password');
    }

    if (errors.length > 0) {
      return next(new CustomError(`Validation errors: ${errors.join(', ')}`, 400));
    }

    next();
  } catch (error) {
    console.error('Password change validation error:', error);
    next(new CustomError('Validation failed', 400));
  }
};

/**
 * Validate bulk operations request
 * POST /api/admin/users/bulk
 */
const validateBulkOperation = (req, res, next) => {
  try {
    const { operation, adminIds, data } = req.body;
    const errors = [];

    // Operation validation
    const validOperations = ['activate', 'deactivate', 'updateRole'];
    if (!operation) {
      errors.push('Operation is required');
    } else if (!validOperations.includes(operation)) {
      errors.push(`Operation must be one of: ${validOperations.join(', ')}`);
    }

    // Admin IDs validation
    if (!adminIds) {
      errors.push('AdminIds array is required');
    } else if (!Array.isArray(adminIds)) {
      errors.push('AdminIds must be an array');
    } else if (adminIds.length === 0) {
      errors.push('AdminIds array cannot be empty');
    } else if (adminIds.length > 100) {
      errors.push('Cannot process more than 100 admins at once');
    }

    // Data validation for specific operations
    if (operation === 'updateRole') {
      if (!data || !data.role) {
        errors.push('Role is required for updateRole operation');
      } else {
        const validRoles = ['SuperAdmin', 'Moderator', 'Viewer'];
        if (!validRoles.includes(data.role)) {
          errors.push(`Role must be one of: ${validRoles.join(', ')}`);
        }
      }
    }

    if (errors.length > 0) {
      return next(new CustomError(`Validation errors: ${errors.join(', ')}`, 400));
    }

    next();
  } catch (error) {
    console.error('Bulk operation validation error:', error);
    next(new CustomError('Validation failed', 400));
  }
};

/**
 * Validate query parameters for admin listing
 * GET /api/admin/users
 */
const validateAdminQuery = (req, res, next) => {
  try {
    const { page, limit, role, isActive, sortBy, sortOrder } = req.query;
    const errors = [];

    // Page validation
    if (page !== undefined) {
      const pageNum = parseInt(page);
      if (isNaN(pageNum) || pageNum < 1) {
        errors.push('Page must be a positive integer');
      }
    }

    // Limit validation
    if (limit !== undefined) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        errors.push('Limit must be between 1 and 100');
      }
    }

    // Role validation
    if (role !== undefined) {
      const validRoles = ['SuperAdmin', 'Moderator', 'Viewer'];
      if (!validRoles.includes(role)) {
        errors.push(`Role must be one of: ${validRoles.join(', ')}`);
      }
    }

    // isActive validation
    if (isActive !== undefined) {
      if (!['true', 'false'].includes(isActive.toLowerCase())) {
        errors.push('isActive must be true or false');
      }
    }

    // sortBy validation
    if (sortBy !== undefined) {
      const validSortFields = ['createdAt', 'updatedAt', 'fullName', 'email', 'role', 'lastLogin'];
      if (!validSortFields.includes(sortBy)) {
        errors.push(`sortBy must be one of: ${validSortFields.join(', ')}`);
      }
    }

    // sortOrder validation
    if (sortOrder !== undefined) {
      if (!['asc', 'desc'].includes(sortOrder.toLowerCase())) {
        errors.push('sortOrder must be asc or desc');
      }
    }

    if (errors.length > 0) {
      return next(new CustomError(`Validation errors: ${errors.join(', ')}`, 400));
    }

    next();
  } catch (error) {
    console.error('Admin query validation error:', error);
    next(new CustomError('Validation failed', 400));
  }
};

module.exports = {
  validateAdminLogin,
  validateAdminCreation,
  validateAdminUpdate,
  validatePasswordChange,
  validateBulkOperation,
  validateAdminQuery,
  // Export helper functions for reuse
  isValidEmail,
  validatePasswordStrength,
  validateFullName
}; 