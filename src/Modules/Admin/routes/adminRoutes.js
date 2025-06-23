const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');

// Import middleware
const { verifyAdminToken, optionalAdminAuth } = require('../middleware/verifyAdminToken');
const { 
  requireRole, 
  requirePermission, 
  requireSuperAdmin, 
  requireModerator, 
  requireAnyAdmin,
  requireCustomCheck,
  canModifyAdmin,
  logAdminAction 
} = require('../middleware/requireRole');

// Import validation middleware (assuming you have one)
const { validateAdminLogin, validateAdminCreation, validateAdminUpdate } = require('../../../validators/adminValidators');

// =============================================================================
// PUBLIC ROUTES (No authentication required)
// =============================================================================

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/auth/login', validateAdminLogin, authController.login);

// =============================================================================
// PROTECTED ROUTES (Authentication required)
// =============================================================================

/**
 * @route   GET /api/admin/auth/me
 * @desc    Get current admin profile
 * @access  Private (Any Admin)
 */
router.get('/auth/me', verifyAdminToken, authController.getProfile);

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Admin logout
 * @access  Private (Any Admin)
 */
router.post('/auth/logout', verifyAdminToken, logAdminAction, authController.logout);

/**
 * @route   POST /api/admin/auth/refresh
 * @desc    Refresh admin token
 * @access  Private (Any Admin)
 */
router.post('/auth/refresh', verifyAdminToken, authController.refreshToken);

/**
 * @route   GET /api/admin/auth/verify
 * @desc    Verify admin token
 * @access  Private (Any Admin)
 */
router.get('/auth/verify', verifyAdminToken, authController.verifyToken);

/**
 * @route   POST /api/admin/auth/change-password
 * @desc    Change admin password
 * @access  Private (Any Admin)
 */
router.post('/auth/change-password', verifyAdminToken, logAdminAction, authController.changePassword);

// =============================================================================
// ADMIN MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   POST /api/admin/users/create
 * @desc    Create new admin user
 * @access  Private (SuperAdmin only)
 */
router.post('/users/create', 
  verifyAdminToken,
  requireSuperAdmin,
  validateAdminCreation,
  logAdminAction,
  adminController.createAdmin
);

/**
 * @route   GET /api/admin/users
 * @desc    Get all admin users with pagination and filtering
 * @access  Private (SuperAdmin: all, Moderator: viewers + self, Viewer: self only)
 */
router.get('/users',
  verifyAdminToken,
  requireAnyAdmin,
  adminController.getAllAdmins
);

/**
 * @route   GET /api/admin/users/stats
 * @desc    Get admin statistics
 * @access  Private (SuperAdmin and Moderator)
 */
router.get('/users/stats',
  verifyAdminToken,
  requireRole(['SuperAdmin', 'Moderator']),
  adminController.getAdminStats
);

/**
 * @route   POST /api/admin/users/bulk
 * @desc    Bulk operations on admin users
 * @access  Private (SuperAdmin only)
 */
router.post('/users/bulk',
  verifyAdminToken,
  requireSuperAdmin,
  logAdminAction,
  adminController.bulkAdminOperations
);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get specific admin user by ID
 * @access  Private (SuperAdmin: any, Moderator: viewers + self, Viewer: self only)
 */
router.get('/users/:id',
  verifyAdminToken,
  requireAnyAdmin,
  adminController.getAdminById
);

/**
 * @route   PATCH /api/admin/users/:id
 * @desc    Update admin user
 * @access  Private (Based on role hierarchy)
 */
router.patch('/users/:id',
  verifyAdminToken,
  requireAnyAdmin,
  canModifyAdmin,
  validateAdminUpdate,
  logAdminAction,
  adminController.updateAdmin
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete (deactivate) admin user
 * @access  Private (Based on role hierarchy)
 */
router.delete('/users/:id',
  verifyAdminToken,
  requireAnyAdmin,
  canModifyAdmin,
  logAdminAction,
  adminController.deleteAdmin
);

// =============================================================================
// PERMISSION-BASED ROUTES (Examples)
// =============================================================================

/**
 * @route   GET /api/admin/dashboard
 * @desc    Admin dashboard data
 * @access  Private (Any Admin)
 */
router.get('/dashboard',
  verifyAdminToken,
  requireAnyAdmin,
  (req, res) => {
    const admin = req.admin;
    
    res.json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: {
        admin: {
          fullName: admin.fullName,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions,
          lastLogin: admin.lastLogin
        },
        timestamp: new Date().toISOString()
      }
    });
  }
);

/**
 * @route   GET /api/admin/system/logs
 * @desc    Get system logs
 * @access  Private (SuperAdmin and Moderator with specific permission)
 */
router.get('/system/logs',
  verifyAdminToken,
  requireCustomCheck((admin) => {
    return admin.role === 'SuperAdmin' || 
           (admin.role === 'Moderator' && admin.permissions.includes('view_logs'));
  }),
  (req, res) => {
    // This would typically fetch actual logs
    res.json({
      success: true,
      message: 'System logs retrieved successfully',
      data: {
        logs: [
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Sample log entry',
            source: 'admin-system'
          }
        ]
      }
    });
  }
);

/**
 * @route   POST /api/admin/system/settings
 * @desc    Update system settings
 * @access  Private (SuperAdmin only)
 */
router.post('/system/settings',
  verifyAdminToken,
  requireSuperAdmin,
  logAdminAction,
  (req, res) => {
    // This would typically update system settings
    res.json({
      success: true,
      message: 'System settings updated successfully',
      data: {
        updatedBy: req.admin.email,
        timestamp: new Date().toISOString()
      }
    });
  }
);

// =============================================================================
// HEALTH CHECK AND STATUS ROUTES
// =============================================================================

/**
 * @route   GET /api/admin/health
 * @desc    Admin system health check
 * @access  Public (for monitoring)
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Admin system is healthy',
    data: {
      status: 'operational',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  });
});

/**
 * @route   GET /api/admin/status
 * @desc    Get admin system status
 * @access  Private (Any Admin)
 */
router.get('/status',
  verifyAdminToken,
  requireAnyAdmin,
  (req, res) => {
    res.json({
      success: true,
      message: 'Admin system status retrieved successfully',
      data: {
        authenticated: true,
        admin: {
          role: req.admin.role,
          permissions: req.admin.permissions
        },
        systemTime: new Date().toISOString()
      }
    });
  }
);

// =============================================================================
// ERROR HANDLING MIDDLEWARE (specific to admin routes)
// =============================================================================
router.use((error, req, res, next) => {
  console.error(`[ADMIN ROUTE ERROR] ${new Date().toISOString()}:`, error);
  
  // Log admin-specific errors with context
  if (req.admin) {
    console.error(`[ADMIN CONTEXT] Admin: ${req.admin.email} (${req.admin.role}) - Route: ${req.method} ${req.originalUrl}`);
  }
  
  // Pass error to global error handler
  next(error);
});

module.exports = router; 