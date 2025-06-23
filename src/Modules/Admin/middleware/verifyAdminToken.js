const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const CustomError = require('../../../Errors/CustomError');

/**
 * Middleware to verify admin JWT token and attach admin to request
 */
const verifyAdminToken = async (req, res, next) => {
  try {
    const token = extractTokenFromRequest(req);
    
    if (!token) {
      return next(new CustomError('Access denied. No token provided.', 401));
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret');
    
    // Check if the decoded token has the required admin fields
    if (!decoded.adminId || !decoded.email || !decoded.role) {
      return next(new CustomError('Invalid token format.', 401));
    }

    // Find the admin in database to ensure they still exist and are active
    const admin = await Admin.findById(decoded.adminId).select('+password');
    
    if (!admin) {
      return next(new CustomError('Admin account not found.', 401));
    }

    if (!admin.isActive) {
      return next(new CustomError('Admin account is deactivated.', 401));
    }

    if (admin.isLocked) {
      return next(new CustomError('Admin account is temporarily locked due to multiple failed login attempts.', 423));
    }

    // Remove password from admin object before attaching to request
    admin.password = undefined;
    
    // Attach admin to request object
    req.admin = admin;
    req.adminId = admin._id;
    req.adminRole = admin.role;
    req.adminPermissions = admin.permissions;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new CustomError('Invalid token.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new CustomError('Token has expired.', 401));
    }
    
    // Log unexpected errors for debugging
    console.error('Admin token verification error:', error);
    return next(new CustomError('Token verification failed.', 401));
  }
};

/**
 * Extract token from Authorization header or cookies
 */
const extractTokenFromRequest = (req) => {
  let token = null;

  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
  }
  
  // If no Bearer token, check cookies
  if (!token && req.cookies && req.cookies.adminToken) {
    token = req.cookies.adminToken;
  }

  // Check custom header (for API clients)
  if (!token && req.headers['x-admin-token']) {
    token = req.headers['x-admin-token'];
  }

  return token;
};

/**
 * Optional middleware - won't throw error if no token, but will attach admin if valid token exists
 */
const optionalAdminAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromRequest(req);
    
    if (!token) {
      return next(); // Continue without admin
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret');
    
    if (decoded.adminId) {
      const admin = await Admin.findById(decoded.adminId);
      
      if (admin && admin.isActive && !admin.isLocked) {
        admin.password = undefined;
        req.admin = admin;
        req.adminId = admin._id;
        req.adminRole = admin.role;
        req.adminPermissions = admin.permissions;
      }
    }

    next();
  } catch (error) {
    // In optional auth, we don't throw errors for invalid tokens
    next();
  }
};

module.exports = {
  verifyAdminToken,
  optionalAdminAuth,
  extractTokenFromRequest
}; 