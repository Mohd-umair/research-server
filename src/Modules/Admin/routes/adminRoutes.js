const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const studentController = require('../controllers/studentController');
const teacherController = require('../controllers/teacherController');
const userRequestController = require('../controllers/userRequestController');

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

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Admin logout
 * @access  Public
 */
router.post('/auth/logout', authController.logout);

/**
 * @route   POST /api/admin/auth/refresh
 * @desc    Refresh admin token
 * @access  Public
 */
router.post('/auth/refresh', authController.refreshToken);

/**
 * @route   POST /api/admin/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/auth/forgot-password', authController.forgotPassword);

/**
 * @route   POST /api/admin/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/auth/reset-password', authController.resetPassword);

// =============================================================================
// PROTECTED ROUTES (Authentication required)
// =============================================================================

/**
 * @route   GET /api/admin/auth/verify
 * @desc    Verify admin token
 * @access  Private
 */
router.get('/auth/verify', verifyAdminToken, authController.verifyToken);

/**
 * @route   GET /api/admin/auth/profile
 * @desc    Get current admin profile
 * @access  Private
 */
router.get('/auth/profile', verifyAdminToken, authController.getProfile);

/**
 * @route   PATCH /api/admin/auth/profile
 * @desc    Update current admin profile
 * @access  Private
 */
router.patch('/auth/profile', verifyAdminToken, authController.updateProfile);

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
 * @access  Private (SuperAdmin and Moderator only)
 */
router.get('/users/stats',
  verifyAdminToken,
  requireModerator,
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
// STUDENT MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /api/admin/students
 * @desc    Get all active students with pagination and filtering
 * @access  Private (Any Admin)
 */
router.get('/students',
  verifyAdminToken,
  requireAnyAdmin,
  studentController.getAllStudents
);

/**
 * @route   GET /api/admin/students/stats
 * @desc    Get student statistics
 * @access  Private (Any Admin)
 */
router.get('/students/stats',
  verifyAdminToken,
  requireAnyAdmin,
  studentController.getStudentStats
);

/**
 * @route   GET /api/admin/students/:id
 * @desc    Get specific student by ID
 * @access  Private (Any Admin)
 */
router.get('/students/:id',
  verifyAdminToken,
  requireAnyAdmin,
  studentController.getStudentById
);

/**
 * @route   PATCH /api/admin/students/:id
 * @desc    Update student information
 * @access  Private (SuperAdmin and Moderator only)
 */
router.patch('/students/:id',
  verifyAdminToken,
  requireModerator,
  logAdminAction,
  studentController.updateStudent
);

/**
 * @route   DELETE /api/admin/students/:id
 * @desc    Delete (deactivate) student
 * @access  Private (SuperAdmin only)
 */
router.delete('/students/:id',
  verifyAdminToken,
  requireSuperAdmin,
  logAdminAction,
  studentController.deleteStudent
);

/**
 * @route   PATCH /api/admin/students/:id/restore
 * @desc    Restore deleted student
 * @access  Private (SuperAdmin only)
 */
router.patch('/students/:id/restore',
  verifyAdminToken,
  requireSuperAdmin,
  logAdminAction,
  studentController.restoreStudent
);

/**
 * @route   POST /api/admin/students/bulk
 * @desc    Bulk operations on students
 * @access  Private (SuperAdmin only)
 */
router.post('/students/bulk',
  verifyAdminToken,
  requireSuperAdmin,
  logAdminAction,
  studentController.bulkStudentOperations
);

// =============================================================================
// TEACHER MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /api/admin/teachers
 * @desc    Get all teachers with pagination and filtering
 * @access  Private (Any Admin)
 */
router.get('/teachers',
  verifyAdminToken,
  requireAnyAdmin,
  teacherController.getAllTeachers
);

/**
 * @route   GET /api/admin/teachers/stats
 * @desc    Get teacher statistics
 * @access  Private (Any Admin)
 */
router.get('/teachers/stats',
  verifyAdminToken,
  requireAnyAdmin,
  teacherController.getTeacherStats
);

/**
 * @route   GET /api/admin/teachers/:id
 * @desc    Get specific teacher by ID
 * @access  Private (Any Admin)
 */
router.get('/teachers/:id',
  verifyAdminToken,
  requireAnyAdmin,
  teacherController.getTeacherById
);

/**
 * @route   PATCH /api/admin/teachers/:id
 * @desc    Update teacher information
 * @access  Private (SuperAdmin and Moderator only)
 */
router.patch('/teachers/:id',
  verifyAdminToken,
  requireModerator,
  logAdminAction,
  teacherController.updateTeacher
);

/**
 * @route   DELETE /api/admin/teachers/:id
 * @desc    Delete (soft delete) teacher
 * @access  Private (SuperAdmin only)
 */
router.delete('/teachers/:id',
  verifyAdminToken,
  requireSuperAdmin,
  logAdminAction,
  teacherController.deleteTeacher
);

/**
 * @route   PUT /api/admin/teachers/:id/approve
 * @desc    Approve teacher
 * @access  Private (SuperAdmin and Moderator only)
 */
router.put('/teachers/:id/approve',
  verifyAdminToken,
  requireModerator,
  logAdminAction,
  teacherController.approveTeacher
);

/**
 * @route   PUT /api/admin/teachers/:id/reject
 * @desc    Reject teacher
 * @access  Private (SuperAdmin and Moderator only)
 */
router.put('/teachers/:id/reject',
  verifyAdminToken,
  requireModerator,
  logAdminAction,
  teacherController.rejectTeacher
);

/**
 * @route   PUT /api/admin/teachers/:id/activate
 * @desc    Activate teacher
 * @access  Private (SuperAdmin and Moderator only)
 */
router.put('/teachers/:id/activate',
  verifyAdminToken,
  requireModerator,
  logAdminAction,
  teacherController.activateTeacher
);

/**
 * @route   PUT /api/admin/teachers/:id/deactivate
 * @desc    Deactivate teacher
 * @access  Private (SuperAdmin and Moderator only)
 */
router.put('/teachers/:id/deactivate',
  verifyAdminToken,
  requireModerator,
  logAdminAction,
  teacherController.deactivateTeacher
);

/**
 * @route   POST /api/admin/teachers/bulk
 * @desc    Bulk operations on teachers
 * @access  Private (SuperAdmin only)
 */
router.post('/teachers/bulk',
  verifyAdminToken,
  requireSuperAdmin,
  logAdminAction,
  teacherController.bulkTeacherOperations
);

// =============================================================================
// USER REQUEST MANAGEMENT ROUTES
// =============================================================================

/**
 * @route   GET /api/admin/user-requests
 * @desc    Get all user requests with pagination and filtering
 * @access  Private (Any Admin)
 */
router.get('/user-requests',
  verifyAdminToken,
  requireAnyAdmin,
  userRequestController.getAllUserRequests
);

/**
 * @route   GET /api/admin/user-requests/stats
 * @desc    Get user request statistics
 * @access  Private (Any Admin)
 */
router.get('/user-requests/stats',
  verifyAdminToken,
  requireAnyAdmin,
  userRequestController.getUserRequestStats
);

/**
 * @route   POST /api/admin/user-requests/bulk
 * @desc    Bulk operations on user requests
 * @access  Private (SuperAdmin and Moderator only)
 */
router.post('/user-requests/bulk',
  verifyAdminToken,
  requireModerator,
  logAdminAction,
  userRequestController.bulkUserRequestOperations
);

/**
 * @route   GET /api/admin/user-requests/:id
 * @desc    Get specific user request by ID
 * @access  Private (Any Admin)
 */
router.get('/user-requests/:id',
  verifyAdminToken,
  requireAnyAdmin,
  userRequestController.getUserRequestById
);

/**
 * @route   PATCH /api/admin/user-requests/:id
 * @desc    Update user request details
 * @access  Private (SuperAdmin and Moderator only)
 */
router.patch('/user-requests/:id',
  verifyAdminToken,
  requireModerator,
  logAdminAction,
  userRequestController.updateUserRequest
);

/**
 * @route   PATCH /api/admin/user-requests/:id/status
 * @desc    Update user request status
 * @access  Private (Any Admin)
 */
router.patch('/user-requests/:id/status',
  verifyAdminToken,
  requireAnyAdmin,
  userRequestController.updateUserRequestStatus
);

/**
 * @route   PATCH /api/admin/user-requests/:id/assign
 * @desc    Assign user request to admin
 * @access  Private (SuperAdmin and Moderator only)
 */
router.patch('/user-requests/:id/assign',
  verifyAdminToken,
  requireModerator,
  logAdminAction,
  userRequestController.assignUserRequest
);

/**
 * @route   DELETE /api/admin/user-requests/:id
 * @desc    Delete user request
 * @access  Private (SuperAdmin only)
 */
router.delete('/user-requests/:id',
  verifyAdminToken,
  requireSuperAdmin,
  logAdminAction,
  userRequestController.deleteUserRequest
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