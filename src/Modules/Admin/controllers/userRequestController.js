const UserRequest = require('../../UserRequest/userRequestModel');
const CustomError = require('../../../Errors/CustomError');
const mongoose = require('mongoose');
const notificationService = require('../../Notifications/notificationService');

/**
 * Get all user requests with admin filtering and pagination
 * GET /api/admin/user-requests
 */
const getAllUserRequests = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      status,
      priority,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
      userId
    } = req.query;

    // Build filter object
    const filter = { isDeleted: false };
    
    // Type filter
    if (type && ['Lab', 'Document', 'Data'].includes(type)) {
      filter.type = type;
    }
    
    // Status filter
    if (status && ['Pending', 'In Progress', 'Approved', 'Rejected'].includes(status)) {
      filter.status = status;
    }
    
    // Priority filter
    if (priority && ['Low', 'Medium', 'High'].includes(priority)) {
      filter.priority = priority;
    }

    // User filter
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.requestBy = userId;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'labDetails.nature': { $regex: search, $options: 'i' } },
        { 'documentDetails.title': { $regex: search, $options: 'i' } },
        { 'documentDetails.author': { $regex: search, $options: 'i' } },
        { 'dataDetails.title': { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const validSortFields = ['createdAt', 'updatedAt', 'title', 'status', 'priority', 'type'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [userRequests, totalCount] = await Promise.all([
      UserRequest.find(filter)
        .populate('requestBy', 'firstName lastName email collegeName department graduationStatus profilePicture')
        .populate('adminResponse.respondedBy', 'fullName email role')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      UserRequest.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
      success: true,
      message: 'User requests retrieved successfully',
      data: {
        requests: userRequests,
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
    console.error('Get all user requests error:', error);
    next(new CustomError('Failed to retrieve user requests.', 500));
  }
};

/**
 * Get a specific user request by ID
 * GET /api/admin/user-requests/:id
 */
const getUserRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid request ID format.', 400));
    }

    // Find the request
    const userRequest = await UserRequest.findOne({ _id: id, isDeleted: false })
      .populate('requestBy', 'firstName lastName email collegeName department graduationStatus profilePicture points')
      .populate('adminResponse.respondedBy', 'fullName email role');

    if (!userRequest) {
      return next(new CustomError('User request not found.', 404));
    }

    res.status(200).json({
      success: true,
      message: 'User request retrieved successfully',
      data: {
        request: userRequest
      }
    });

  } catch (error) {
    console.error('Get user request by ID error:', error);
    next(new CustomError('Failed to retrieve user request.', 500));
  }
};

/**
 * Update user request status
 * PATCH /api/admin/user-requests/:id/status
 */
const updateUserRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, responseMessage } = req.body;
    const currentAdmin = req.admin;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid request ID format.', 400));
    }

    // Validate status
    if (!status || !['Pending', 'In Progress', 'Approved', 'Rejected'].includes(status)) {
      return next(new CustomError('Invalid status. Must be one of: Pending, In Progress, Approved, Rejected.', 400));
    }

    // Find the request
    const userRequest = await UserRequest.findOne({ _id: id, isDeleted: false });
    if (!userRequest) {
      return next(new CustomError('User request not found.', 404));
    }

    // Update the request
    const updateData = {
      status,
      updatedAt: new Date()
    };

    // Add admin response if provided
    if (responseMessage || status !== 'Pending') {
      updateData.adminResponse = {
        respondedBy: currentAdmin._id,
        responseMessage: responseMessage || `Status updated to ${status}`,
        responseDate: new Date()
      };
    }

    const updatedRequest = await UserRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('requestBy', 'firstName lastName email collegeName department')
    .populate('adminResponse.respondedBy', 'fullName email role');

    // If requestBy is not populated, fetch it separately
    if (!updatedRequest.requestBy) {
      const originalRequest = await UserRequest.findById(id);
      if (originalRequest?.requestBy) {
        updatedRequest.requestBy = originalRequest.requestBy;
      }
    }

    // Send notification to request creator when status is Approved
    if (status === 'Approved' && updatedRequest.requestBy) {
      try {
        const requestCreatorId = updatedRequest.requestBy._id || updatedRequest.requestBy;
        const requestTitle = updatedRequest.title || updatedRequest.documentDetails?.title || 'Your request';
        const adminName = currentAdmin.fullName || currentAdmin.email || 'Admin';

        await notificationService.createNotification({
          recipient: requestCreatorId,
          recipientModel: 'Teacher', // Students/Users are stored in Teacher model
          type: 'REQUEST_APPROVED',
          title: 'Request Approved! 🎉',
          message: `Your request "${requestTitle}" has been approved. We will notify you about further updates.`,
          relatedEntity: {
            entityType: 'UserRequest',
            entityId: id
          },
          triggeredBy: currentAdmin._id,
          priority: 'high',
          actionUrl: `/user-dashboard/request`,
          metadata: {
            requestTitle,
            requestType: updatedRequest.type,
            approvedBy: adminName,
            responseMessage: responseMessage || `Status updated to ${status}`
          }
        });

        console.log(`[NOTIFICATION SENT] Request approval notification sent to user: ${requestCreatorId}`);
      } catch (notificationError) {
        // Log error but don't fail the status update
        console.error('[NOTIFICATION ERROR] Failed to send request approval notification:', notificationError);
      }
    }

    // Send notification to request creator when status is Rejected
    if (status === 'Rejected' && updatedRequest.requestBy) {
      try {
        const requestCreatorId = updatedRequest.requestBy._id || updatedRequest.requestBy;
        const requestTitle = updatedRequest.title || updatedRequest.documentDetails?.title || 'Your request';
        const adminName = currentAdmin.fullName || currentAdmin.email || 'Admin';

        await notificationService.createNotification({
          recipient: requestCreatorId,
          recipientModel: 'Teacher',
          type: 'REQUEST_REJECTED',
          title: 'Request Status Update',
          message: `Your request "${requestTitle}" has been reviewed. ${responseMessage || 'Please check the details for more information.'}`,
          relatedEntity: {
            entityType: 'UserRequest',
            entityId: id
          },
          triggeredBy: currentAdmin._id,
          priority: 'medium',
          actionUrl: `/user-dashboard/request`,
          metadata: {
            requestTitle,
            requestType: updatedRequest.type,
            rejectedBy: adminName,
            responseMessage: responseMessage || `Status updated to ${status}`
          }
        });

        console.log(`[NOTIFICATION SENT] Request rejection notification sent to user: ${requestCreatorId}`);
      } catch (notificationError) {
        console.error('[NOTIFICATION ERROR] Failed to send request rejection notification:', notificationError);
      }
    }

    // Log the action
    console.log(`[USER REQUEST STATUS UPDATED] ${new Date().toISOString()} - Request: ${id} - Status: ${status} - By: ${currentAdmin.email} (${currentAdmin.role})`);

    res.status(200).json({
      success: true,
      message: `User request ${status.toLowerCase()} successfully`,
      data: {
        request: updatedRequest
      }
    });

  } catch (error) {
    console.error('Update user request status error:', error);
    next(new CustomError('Failed to update user request status.', 500));
  }
};

/**
 * Update user request details
 * PATCH /api/admin/user-requests/:id
 */
const updateUserRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, priority, type, ...typeSpecificData } = req.body;
    const currentAdmin = req.admin;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid request ID format.', 400));
    }

    // Find the request
    const userRequest = await UserRequest.findOne({ _id: id, isDeleted: false });
    if (!userRequest) {
      return next(new CustomError('User request not found.', 404));
    }

    // Prepare update object
    const updateData = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority && ['Low', 'Medium', 'High'].includes(priority)) {
      updateData.priority = priority;
    }
    if (type && ['Lab', 'Document', 'Data'].includes(type)) {
      updateData.type = type;
    }

    // Handle type-specific data
    if (type === 'Lab' && typeSpecificData.labDetails) {
      updateData.labDetails = typeSpecificData.labDetails;
    } else if (type === 'Document' && typeSpecificData.documentDetails) {
      updateData.documentDetails = typeSpecificData.documentDetails;
    } else if (type === 'Data' && typeSpecificData.dataDetails) {
      updateData.dataDetails = typeSpecificData.dataDetails;
    }

    updateData.updatedAt = new Date();

    const updatedRequest = await UserRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('requestBy', 'firstName lastName email collegeName department')
    .populate('adminResponse.respondedBy', 'fullName email role');

    // Log the action
    console.log(`[USER REQUEST UPDATED] ${new Date().toISOString()} - Request: ${id} - By: ${currentAdmin.email} (${currentAdmin.role})`);

    res.status(200).json({
      success: true,
      message: 'User request updated successfully',
      data: {
        request: updatedRequest
      }
    });

  } catch (error) {
    console.error('Update user request error:', error);
    next(new CustomError('Failed to update user request.', 500));
  }
};

/**
 * Delete (soft delete) user request
 * DELETE /api/admin/user-requests/:id
 */
const deleteUserRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;
    const currentAdmin = req.admin;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid request ID format.', 400));
    }

    // Find the request
    const userRequest = await UserRequest.findOne({ _id: id, isDeleted: false });
    if (!userRequest) {
      return next(new CustomError('User request not found.', 404));
    }

    let result;
    
    if (permanent === 'true' && currentAdmin.role === 'SuperAdmin') {
      // Permanent deletion (only SuperAdmins can do this)
      result = await UserRequest.findByIdAndDelete(id);
      console.log(`[USER REQUEST PERMANENTLY DELETED] ${new Date().toISOString()} - Request: ${id} - By: ${currentAdmin.email} (${currentAdmin.role})`);
    } else {
      // Soft delete
      result = await UserRequest.findByIdAndUpdate(
        id,
        { 
          isDeleted: true,
          deletedAt: new Date()
        },
        { new: true }
      );
      console.log(`[USER REQUEST DELETED] ${new Date().toISOString()} - Request: ${id} - By: ${currentAdmin.email} (${currentAdmin.role})`);
    }

    res.status(200).json({
      success: true,
      message: permanent === 'true' ? 'User request permanently deleted' : 'User request deleted successfully',
      data: null
    });

  } catch (error) {
    console.error('Delete user request error:', error);
    next(new CustomError('Failed to delete user request.', 500));
  }
};

/**
 * Get user request statistics
 * GET /api/admin/user-requests/stats
 */
const getUserRequestStats = async (req, res, next) => {
  try {
    const { dateFrom, dateTo } = req.query;

    // Build date filter
    const dateFilter = { isDeleted: false };
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {};
      if (dateFrom) dateFilter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) dateFilter.createdAt.$lte = new Date(dateTo);
    }

    // Get overview statistics
    const overviewStats = await UserRequest.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          pendingRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
          },
          inProgressRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] }
          },
          approvedRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] }
          },
          rejectedRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] }
          },
          fulfilledRequests: {
            $sum: { $cond: [{ $eq: ['$isFulfilled', true] }, 1, 0] }
          }
        }
      }
    ]);

    // Get statistics by type
    const typeStats = await UserRequest.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get statistics by priority
    const priorityStats = await UserRequest.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await UserRequest.aggregate([
      { 
        $match: { 
          isDeleted: false,
          createdAt: { $gte: thirtyDaysAgo }
        } 
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    const stats = {
      overview: overviewStats[0] || {
        totalRequests: 0,
        pendingRequests: 0,
        inProgressRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        fulfilledRequests: 0
      },
      byType: typeStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byPriority: priorityStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recentActivity: recentActivity
    };

    res.status(200).json({
      success: true,
      message: 'User request statistics retrieved successfully',
      data: {
        stats
      }
    });

  } catch (error) {
    console.error('Get user request stats error:', error);
    next(new CustomError('Failed to retrieve user request statistics.', 500));
  }
};

/**
 * Bulk operations on user requests
 * POST /api/admin/user-requests/bulk
 */
const bulkUserRequestOperations = async (req, res, next) => {
  try {
    const { operation, requestIds, data } = req.body;
    const currentAdmin = req.admin;

    // Only SuperAdmins and Moderators can perform bulk operations
    if (!['SuperAdmin', 'Moderator'].includes(currentAdmin.role)) {
      return next(new CustomError('Only SuperAdmins and Moderators can perform bulk operations.', 403));
    }

    if (!operation || !requestIds || !Array.isArray(requestIds)) {
      return next(new CustomError('Operation and requestIds array are required.', 400));
    }

    // Validate ObjectIds
    const validIds = requestIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== requestIds.length) {
      return next(new CustomError('Some request IDs are invalid.', 400));
    }

    let result;
    let message;

    switch (operation) {
      case 'approve':
        result = await UserRequest.updateMany(
          { _id: { $in: validIds }, isDeleted: false },
          { 
            $set: { 
              status: 'Approved',
              'adminResponse.respondedBy': currentAdmin._id,
              'adminResponse.responseMessage': data?.responseMessage || 'Bulk approved',
              'adminResponse.responseDate': new Date(),
              updatedAt: new Date()
            }
          }
        );
        message = `${result.modifiedCount} requests approved successfully`;
        break;

      case 'reject':
        result = await UserRequest.updateMany(
          { _id: { $in: validIds }, isDeleted: false },
          { 
            $set: { 
              status: 'Rejected',
              'adminResponse.respondedBy': currentAdmin._id,
              'adminResponse.responseMessage': data?.responseMessage || 'Bulk rejected',
              'adminResponse.responseDate': new Date(),
              updatedAt: new Date()
            }
          }
        );
        message = `${result.modifiedCount} requests rejected successfully`;
        break;

      case 'inProgress':
        result = await UserRequest.updateMany(
          { _id: { $in: validIds }, isDeleted: false },
          { 
            $set: { 
              status: 'In Progress',
              'adminResponse.respondedBy': currentAdmin._id,
              'adminResponse.responseMessage': data?.responseMessage || 'Bulk set to in progress',
              'adminResponse.responseDate': new Date(),
              updatedAt: new Date()
            }
          }
        );
        message = `${result.modifiedCount} requests set to in progress successfully`;
        break;

      case 'delete':
        result = await UserRequest.updateMany(
          { _id: { $in: validIds }, isDeleted: false },
          { 
            $set: { 
              isDeleted: true,
              deletedAt: new Date()
            }
          }
        );
        message = `${result.modifiedCount} requests deleted successfully`;
        break;

      case 'updatePriority':
        if (!data || !data.priority || !['Low', 'Medium', 'High'].includes(data.priority)) {
          return next(new CustomError('Valid priority is required for priority update operation.', 400));
        }
        result = await UserRequest.updateMany(
          { _id: { $in: validIds }, isDeleted: false },
          { 
            $set: { 
              priority: data.priority,
              updatedAt: new Date()
            }
          }
        );
        message = `${result.modifiedCount} requests priority updated successfully`;
        break;

      default:
        return next(new CustomError('Invalid operation. Supported operations: approve, reject, inProgress, delete, updatePriority.', 400));
    }

    // Log the bulk operation
    console.log(`[BULK USER REQUEST OPERATION] ${new Date().toISOString()} - Operation: ${operation} - Count: ${result.modifiedCount} - By: ${currentAdmin.email} (${currentAdmin.role})`);

    res.status(200).json({
      success: true,
      message,
      data: {
        operation,
        affectedCount: result.modifiedCount,
        totalRequested: validIds.length
      }
    });

  } catch (error) {
    console.error('Bulk user request operations error:', error);
    next(new CustomError('Failed to perform bulk operation.', 500));
  }
};

/**
 * Assign user request to admin
 * PATCH /api/admin/user-requests/:id/assign
 */
const assignUserRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const currentAdmin = req.admin;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid request ID format.', 400));
    }

    if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo)) {
      return next(new CustomError('Invalid admin ID format.', 400));
    }

    // Find the request
    const userRequest = await UserRequest.findOne({ _id: id, isDeleted: false });
    if (!userRequest) {
      return next(new CustomError('User request not found.', 404));
    }

    // Update assignment
    const updateData = {
      assignedTo: assignedTo || null,
      updatedAt: new Date()
    };

    const updatedRequest = await UserRequest.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('requestBy', 'firstName lastName email collegeName department')
    .populate('assignedTo', 'fullName email role')
    .populate('adminResponse.respondedBy', 'fullName email role');

    // Log the action
    console.log(`[USER REQUEST ASSIGNED] ${new Date().toISOString()} - Request: ${id} - Assigned to: ${assignedTo || 'Unassigned'} - By: ${currentAdmin.email} (${currentAdmin.role})`);

    res.status(200).json({
      success: true,
      message: assignedTo ? 'User request assigned successfully' : 'User request unassigned successfully',
      data: {
        request: updatedRequest
      }
    });

  } catch (error) {
    console.error('Assign user request error:', error);
    next(new CustomError('Failed to assign user request.', 500));
  }
};

module.exports = {
  getAllUserRequests,
  getUserRequestById,
  updateUserRequestStatus,
  updateUserRequest,
  deleteUserRequest,
  getUserRequestStats,
  bulkUserRequestOperations,
  assignUserRequest
}; 