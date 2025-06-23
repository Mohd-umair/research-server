const CustomError = require('../../../Errors/CustomError');

/**
 * Middleware to require specific admin roles
 * @param {string|string[]} allowedRoles - Role(s) that can access the route
 * @returns {Function} Express middleware function
 */
const requireRole = (allowedRoles) => {
  // Normalize allowedRoles to array
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    // Check if admin is attached to request (should be done by verifyAdminToken middleware)
    if (!req.admin) {
      return next(new CustomError('Access denied. Admin authentication required.', 401));
    }

    const adminRole = req.admin.role;

    // Check if admin's role is in the allowed roles
    if (!rolesArray.includes(adminRole)) {
      return next(new CustomError(
        `Access denied. Required role(s): ${rolesArray.join(', ')}. Your role: ${adminRole}`,
        403
      ));
    }

    next();
  };
};

/**
 * Middleware to require specific permissions
 * @param {string|string[]} requiredPermissions - Permission(s) required to access the route
 * @returns {Function} Express middleware function
 */
const requirePermission = (requiredPermissions) => {
  // Normalize requiredPermissions to array
  const permissionsArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  
  return (req, res, next) => {
    // Check if admin is attached to request
    if (!req.admin) {
      return next(new CustomError('Access denied. Admin authentication required.', 401));
    }

    const adminPermissions = req.admin.permissions || [];

    // SuperAdmin with '*' permission can access everything
    if (adminPermissions.includes('*')) {
      return next();
    }

    // Check if admin has all required permissions
    const hasAllPermissions = permissionsArray.every(permission => 
      adminPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      const missingPermissions = permissionsArray.filter(permission => 
        !adminPermissions.includes(permission)
      );
      
      return next(new CustomError(
        `Access denied. Missing permission(s): ${missingPermissions.join(', ')}`,
        403
      ));
    }

    next();
  };
};

/**
 * Middleware to require SuperAdmin role specifically
 */
const requireSuperAdmin = requireRole('SuperAdmin');

/**
 * Middleware to require Moderator role or higher (SuperAdmin, Moderator)
 */
const requireModerator = requireRole(['SuperAdmin', 'Moderator']);

/**
 * Middleware to require any admin role (all authenticated admins)
 */
const requireAnyAdmin = (req, res, next) => {
  if (!req.admin) {
    return next(new CustomError('Access denied. Admin authentication required.', 401));
  }
  next();
};

/**
 * Advanced role checking with custom logic
 * @param {Function} checkFunction - Custom function that receives (admin, req) and returns boolean
 * @returns {Function} Express middleware function
 */
const requireCustomCheck = (checkFunction) => {
  return (req, res, next) => {
    if (!req.admin) {
      return next(new CustomError('Access denied. Admin authentication required.', 401));
    }

    try {
      const hasAccess = checkFunction(req.admin, req);
      
      if (!hasAccess) {
        return next(new CustomError('Access denied. Custom authorization check failed.', 403));
      }

      next();
    } catch (error) {
      console.error('Custom authorization check error:', error);
      return next(new CustomError('Authorization check failed.', 500));
    }
  };
};

/**
 * Middleware to check if admin can modify another admin
 * Rules:
 * - SuperAdmin can modify anyone except other SuperAdmins (unless they created them)
 * - Moderator can only modify Viewers
 * - Viewer cannot modify anyone
 */
const canModifyAdmin = (req, res, next) => {
  const currentAdmin = req.admin;
  const targetAdminId = req.params.id || req.body.adminId;

  if (!targetAdminId) {
    return next(new CustomError('Target admin ID is required.', 400));
  }

  // Attach the check to be performed in the route handler
  req.canModifyTarget = async (targetAdmin) => {
    // Cannot modify yourself for certain operations
    if (targetAdmin._id.toString() === currentAdmin._id.toString()) {
      return { allowed: false, reason: 'Cannot modify your own account through this endpoint.' };
    }

    // SuperAdmin rules
    if (currentAdmin.role === 'SuperAdmin') {
      // SuperAdmin can modify anyone they created, or non-SuperAdmins
      if (targetAdmin.role !== 'SuperAdmin' || 
          (targetAdmin.createdBy && targetAdmin.createdBy.toString() === currentAdmin._id.toString())) {
        return { allowed: true };
      }
      return { allowed: false, reason: 'SuperAdmins can only modify SuperAdmins they created.' };
    }

    // Moderator rules
    if (currentAdmin.role === 'Moderator') {
      if (targetAdmin.role === 'Viewer') {
        return { allowed: true };
      }
      return { allowed: false, reason: 'Moderators can only modify Viewer accounts.' };
    }

    // Viewer cannot modify anyone
    return { allowed: false, reason: 'Viewers do not have permission to modify admin accounts.' };
  };

  next();
};

/**
 * Middleware to log admin actions for audit purposes
 */
const logAdminAction = (action) => {
  return (req, res, next) => {
    const admin = req.admin;
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Log the action (in a real app, you'd probably save this to a database)
    console.log(`[ADMIN ACTION] ${timestamp} - Admin: ${admin.email} (${admin.role}) - Action: ${action} - IP: ${ip} - UserAgent: ${userAgent}`);
    
    // You could also save to an audit log collection
    // await AuditLog.create({
    //   adminId: admin._id,
    //   action,
    //   ip,
    //   userAgent,
    //   timestamp: new Date(),
    //   details: {
    //     path: req.path,
    //     method: req.method,
    //     params: req.params,
    //     body: req.body
    //   }
    // });

    next();
  };
};

module.exports = {
  requireRole,
  requirePermission,
  requireSuperAdmin,
  requireModerator,
  requireAnyAdmin,
  requireCustomCheck,
  canModifyAdmin,
  logAdminAction
}; 