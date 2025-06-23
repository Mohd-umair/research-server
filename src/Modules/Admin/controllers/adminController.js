const Admin = require('../models/Admin');
const CustomError = require('../../../Errors/CustomError');
const mongoose = require('mongoose');

/**
 * Create a new admin
 * POST /api/admin/users/create
 */
const createAdmin = async (req, res, next) => {
  try {
    const { email, password, fullName, role = 'Viewer' } = req.body;
    const createdBy = req.admin._id;

    // Validation
    if (!email || !password || !fullName) {
      return next(new CustomError('Email, password, and full name are required.', 400));
    }

    if (password.length < 8) {
      return next(new CustomError('Password must be at least 8 characters long.', 400));
    }

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existingAdmin) {
      return next(new CustomError('An admin with this email already exists.', 409));
    }

    // Role validation and permission check
    const validRoles = ['SuperAdmin', 'Moderator', 'Viewer'];
    if (!validRoles.includes(role)) {
      return next(new CustomError(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400));
    }

    // Check if current admin can create this role
    const currentAdmin = req.admin;
    if (currentAdmin.role !== 'SuperAdmin') {
      return next(new CustomError('Only SuperAdmins can create new admin accounts.', 403));
    }

    // SuperAdmins can create other SuperAdmins, but let's add a warning
    if (role === 'SuperAdmin') {
      console.log(`[WARNING] SuperAdmin ${currentAdmin.email} is creating another SuperAdmin account: ${email}`);
    }

    // Create the admin
    const newAdmin = await Admin.createAdmin({
      email: email.toLowerCase().trim(),
      password,
      fullName: fullName.trim(),
      role,
      isActive: true
    }, createdBy);

    // Log the creation
    console.log(`[ADMIN CREATED] ${new Date().toISOString()} - Created: ${newAdmin.email} (${newAdmin.role}) - By: ${currentAdmin.email} (${currentAdmin.role})`);

    // Remove password from response
    const adminResponse = newAdmin.toJSON();

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        admin: adminResponse
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return next(new CustomError('An admin with this email already exists.', 409));
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return next(new CustomError(`Validation error: ${messages.join(', ')}`, 400));
    }

    next(new CustomError('Failed to create admin.', 500));
  }
};

/**
 * Get all admins with pagination and filtering
 * GET /api/admin/users
 */
const getAllAdmins = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (role && ['SuperAdmin', 'Moderator', 'Viewer'].includes(role)) {
      filter.role = role;
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Role-based filtering for non-SuperAdmins
    const currentAdmin = req.admin;
    if (currentAdmin.role === 'Moderator') {
      // Moderators can only see Viewers and themselves
      filter.$or = [
        { role: 'Viewer' },
        { _id: currentAdmin._id }
      ];
    } else if (currentAdmin.role === 'Viewer') {
      // Viewers can only see themselves
      filter._id = currentAdmin._id;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Max 50 items per page
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const validSortFields = ['createdAt', 'updatedAt', 'fullName', 'email', 'role', 'lastLogin'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [admins, totalCount] = await Promise.all([
      Admin.find(filter)
        .populate('createdBy', 'fullName email role')
        .populate('updatedBy', 'fullName email role')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Admin.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
      success: true,
      message: 'Admins retrieved successfully',
      data: {
        admins,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage,
          hasPrevPage
        }
      }
    });

  } catch (error) {
    console.error('Get all admins error:', error);
    next(new CustomError('Failed to retrieve admins.', 500));
  }
};

/**
 * Get a specific admin by ID
 * GET /api/admin/users/:id
 */
const getAdminById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentAdmin = req.admin;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid admin ID format.', 400));
    }

    // Find the admin
    const admin = await Admin.findById(id)
      .populate('createdBy', 'fullName email role')
      .populate('updatedBy', 'fullName email role');

    if (!admin) {
      return next(new CustomError('Admin not found.', 404));
    }

    // Permission check
    if (currentAdmin.role === 'Viewer' && admin._id.toString() !== currentAdmin._id.toString()) {
      return next(new CustomError('You can only view your own profile.', 403));
    }

    if (currentAdmin.role === 'Moderator') {
      const canView = admin.role === 'Viewer' || admin._id.toString() === currentAdmin._id.toString();
      if (!canView) {
        return next(new CustomError('You can only view Viewer accounts and your own profile.', 403));
      }
    }

    res.status(200).json({
      success: true,
      message: 'Admin retrieved successfully',
      data: {
        admin
      }
    });

  } catch (error) {
    console.error('Get admin by ID error:', error);
    next(new CustomError('Failed to retrieve admin.', 500));
  }
};

/**
 * Update an admin
 * PATCH /api/admin/users/:id
 */
const updateAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, role, isActive } = req.body;
    const currentAdmin = req.admin;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid admin ID format.', 400));
    }

    // Find the target admin
    const targetAdmin = await Admin.findById(id);
    if (!targetAdmin) {
      return next(new CustomError('Admin not found.', 404));
    }

    // Check permissions using the middleware function
    if (req.canModifyTarget) {
      const permissionCheck = await req.canModifyTarget(targetAdmin);
      if (!permissionCheck.allowed) {
        return next(new CustomError(permissionCheck.reason, 403));
      }
    }

    // Prepare update object
    const updateData = {};
    
    if (fullName !== undefined) {
      if (!fullName.trim()) {
        return next(new CustomError('Full name cannot be empty.', 400));
      }
      updateData.fullName = fullName.trim();
    }

    if (role !== undefined) {
      const validRoles = ['SuperAdmin', 'Moderator', 'Viewer'];
      if (!validRoles.includes(role)) {
        return next(new CustomError(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400));
      }

      // Additional role change validation
      if (role === 'SuperAdmin' && currentAdmin.role !== 'SuperAdmin') {
        return next(new CustomError('Only SuperAdmins can promote others to SuperAdmin.', 403));
      }

      if (targetAdmin.role === 'SuperAdmin' && role !== 'SuperAdmin' && currentAdmin.role !== 'SuperAdmin') {
        return next(new CustomError('Only SuperAdmins can demote other SuperAdmins.', 403));
      }

      updateData.role = role;
    }

    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') {
        return next(new CustomError('isActive must be a boolean value.', 400));
      }

      // Prevent self-deactivation
      if (targetAdmin._id.toString() === currentAdmin._id.toString() && !isActive) {
        return next(new CustomError('You cannot deactivate your own account.', 400));
      }

      updateData.isActive = isActive;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return next(new CustomError('No valid fields provided for update.', 400));
    }

    // Add updatedBy field
    updateData.updatedBy = currentAdmin._id;

    // Update the admin
    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('createdBy', 'fullName email role')
     .populate('updatedBy', 'fullName email role');

    // Log the update
    console.log(`[ADMIN UPDATED] ${new Date().toISOString()} - Updated: ${updatedAdmin.email} (${updatedAdmin.role}) - By: ${currentAdmin.email} (${currentAdmin.role}) - Changes: ${JSON.stringify(updateData)}`);

    res.status(200).json({
      success: true,
      message: 'Admin updated successfully',
      data: {
        admin: updatedAdmin
      }
    });

  } catch (error) {
    console.error('Update admin error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return next(new CustomError(`Validation error: ${messages.join(', ')}`, 400));
    }

    next(new CustomError('Failed to update admin.', 500));
  }
};

/**
 * Delete (deactivate) an admin
 * DELETE /api/admin/users/:id
 */
const deleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;
    const currentAdmin = req.admin;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid admin ID format.', 400));
    }

    // Find the target admin
    const targetAdmin = await Admin.findById(id);
    if (!targetAdmin) {
      return next(new CustomError('Admin not found.', 404));
    }

    // Check permissions
    if (req.canModifyTarget) {
      const permissionCheck = await req.canModifyTarget(targetAdmin);
      if (!permissionCheck.allowed) {
        return next(new CustomError(permissionCheck.reason, 403));
      }
    }

    // Prevent self-deletion
    if (targetAdmin._id.toString() === currentAdmin._id.toString()) {
      return next(new CustomError('You cannot delete your own account.', 400));
    }

    let result;
    
    if (permanent === 'true' && currentAdmin.role === 'SuperAdmin') {
      // Permanent deletion (only SuperAdmins can do this)
      result = await Admin.findByIdAndDelete(id);
      console.log(`[ADMIN PERMANENTLY DELETED] ${new Date().toISOString()} - Deleted: ${targetAdmin.email} (${targetAdmin.role}) - By: ${currentAdmin.email} (${currentAdmin.role})`);
    } else {
      // Soft delete (deactivate)
      result = await Admin.findByIdAndUpdate(
        id,
        { 
          $set: { 
            isActive: false,
            updatedBy: currentAdmin._id
          }
        },
        { new: true }
      );
      console.log(`[ADMIN DEACTIVATED] ${new Date().toISOString()} - Deactivated: ${targetAdmin.email} (${targetAdmin.role}) - By: ${currentAdmin.email} (${currentAdmin.role})`);
    }

    res.status(200).json({
      success: true,
      message: permanent === 'true' ? 'Admin permanently deleted' : 'Admin deactivated successfully',
      data: {
        admin: result
      }
    });

  } catch (error) {
    console.error('Delete admin error:', error);
    next(new CustomError('Failed to delete admin.', 500));
  }
};

/**
 * Get admin statistics
 * GET /api/admin/users/stats
 */
const getAdminStats = async (req, res, next) => {
  try {
    const currentAdmin = req.admin;

    // Only SuperAdmins and Moderators can view stats
    if (!['SuperAdmin', 'Moderator'].includes(currentAdmin.role)) {
      return next(new CustomError('Access denied. Insufficient permissions.', 403));
    }

    // Build filter based on role
    let matchFilter = {};
    if (currentAdmin.role === 'Moderator') {
      matchFilter = { role: 'Viewer' };
    }

    const stats = await Admin.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalAdmins: { $sum: 1 },
          activeAdmins: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactiveAdmins: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          },
          superAdmins: {
            $sum: { $cond: [{ $eq: ['$role', 'SuperAdmin'] }, 1, 0] }
          },
          moderators: {
            $sum: { $cond: [{ $eq: ['$role', 'Moderator'] }, 1, 0] }
          },
          viewers: {
            $sum: { $cond: [{ $eq: ['$role', 'Viewer'] }, 1, 0] }
          },
          recentLogins: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    '$lastLogin',
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const adminStats = stats[0] || {
      totalAdmins: 0,
      activeAdmins: 0,
      inactiveAdmins: 0,
      superAdmins: 0,
      moderators: 0,
      viewers: 0,
      recentLogins: 0
    };

    res.status(200).json({
      success: true,
      message: 'Admin statistics retrieved successfully',
      data: {
        stats: adminStats
      }
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    next(new CustomError('Failed to retrieve admin statistics.', 500));
  }
};

/**
 * Bulk admin operations
 * POST /api/admin/users/bulk
 */
const bulkAdminOperations = async (req, res, next) => {
  try {
    const { operation, adminIds, data } = req.body;
    const currentAdmin = req.admin;

    // Only SuperAdmins can perform bulk operations
    if (currentAdmin.role !== 'SuperAdmin') {
      return next(new CustomError('Only SuperAdmins can perform bulk operations.', 403));
    }

    if (!operation || !adminIds || !Array.isArray(adminIds)) {
      return next(new CustomError('Operation and adminIds array are required.', 400));
    }

    // Validate ObjectIds
    const validIds = adminIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== adminIds.length) {
      return next(new CustomError('Some admin IDs are invalid.', 400));
    }

    let result;

    switch (operation) {
      case 'activate':
        result = await Admin.updateMany(
          { _id: { $in: validIds } },
          { $set: { isActive: true, updatedBy: currentAdmin._id } }
        );
        break;

      case 'deactivate':
        // Prevent self-deactivation
        const filteredIds = validIds.filter(id => id !== currentAdmin._id.toString());
        result = await Admin.updateMany(
          { _id: { $in: filteredIds } },
          { $set: { isActive: false, updatedBy: currentAdmin._id } }
        );
        break;

      case 'updateRole':
        if (!data || !data.role || !['SuperAdmin', 'Moderator', 'Viewer'].includes(data.role)) {
          return next(new CustomError('Valid role is required for role update operation.', 400));
        }
        result = await Admin.updateMany(
          { _id: { $in: validIds } },
          { $set: { role: data.role, updatedBy: currentAdmin._id } }
        );
        break;

      default:
        return next(new CustomError('Invalid operation. Supported operations: activate, deactivate, updateRole.', 400));
    }

    // Log bulk operation
    console.log(`[ADMIN BULK OPERATION] ${new Date().toISOString()} - Operation: ${operation} - Count: ${result.modifiedCount} - By: ${currentAdmin.email} (${currentAdmin.role})`);

    res.status(200).json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Bulk admin operations error:', error);
    next(new CustomError('Bulk operation failed.', 500));
  }
};

module.exports = {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  getAdminStats,
  bulkAdminOperations
}; 