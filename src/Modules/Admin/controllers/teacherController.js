const Teacher = require('../../Teachers/teacherModel');
const TeacherProfile = require('../../TeacherProfile/teacherProfileModel');
const CustomError = require('../../../Errors/CustomError');
const mongoose = require('mongoose');
const notificationService = require('../../Notifications/notificationService');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * Get all teachers with pagination, filtering, and profile data
 * GET /api/admin/teachers
 */
const getAllTeachers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      isApproved,
      isActive,
      profileStatus,
      department,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object for Teacher collection
    const teacherFilter = {};
    
    if (isApproved !== undefined) {
      teacherFilter.isApproved = isApproved === 'true';
    }
    
    if (isActive !== undefined) {
      teacherFilter.isActive = isActive === 'true';
    }

    // Don't include deleted teachers
    teacherFilter.isDelete = false;

    // Search functionality
    if (search) {
      teacherFilter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const validSortFields = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'email', 'experience', 'isApproved', 'isActive'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    // First, get teachers with basic filters
    const teachers = await Teacher.find(teacherFilter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Get teacher IDs for profile lookup
    const teacherIds = teachers.map(teacher => teacher._id);

    // Get teacher profiles for these teachers
    let profileFilter = { userId: { $in: teacherIds } };
    
    // Add profile-specific filters
    if (profileStatus && ['incomplete', 'pending', 'approved', 'rejected'].includes(profileStatus)) {
      profileFilter.profileStatus = profileStatus;
    }
    
    if (department) {
      profileFilter['professional.department'] = { $regex: department, $options: 'i' };
    }

    const teacherProfiles = await TeacherProfile.find(profileFilter).lean();

    // Create a map of profiles by userId for easy lookup
    const profileMap = {};
    teacherProfiles.forEach(profile => {
      profileMap[profile.userId.toString()] = profile;
    });

    // Combine teacher data with profile data
    const enrichedTeachers = teachers.map(teacher => {
      const profile = profileMap[teacher._id.toString()];
      
      return {
        // Basic teacher info
        _id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        name: teacher.name || `${teacher.firstName} ${teacher.lastName}`,
        email: teacher.email,
        phoneNumber: teacher.phoneNumber,
        contactNumber: teacher.contactNumber,
        qualification: teacher.qualification,
        experience: teacher.experience,
        aboutTeacher: teacher.aboutTeacher,
        profileImage: teacher.profileImage,
        username: teacher.username,
        isApproved: teacher.isApproved,
        isActive: teacher.isActive,
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt,
        
        // Profile information (if exists)
        profile: profile ? {
          profileStatus: profile.profileStatus,
          completionPercentage: profile.completionPercentage,
          isProfileComplete: profile.isProfileComplete,
          personalInfo: profile.personalInfo,
          address: profile.address,
          professional: profile.professional,
          bankDetails: profile.bankDetails ? {
            bankName: profile.bankDetails.bankName,
            accountHolderName: profile.bankDetails.accountHolderName,
            accountType: profile.bankDetails.accountType,
            branchName: profile.bankDetails.branchName
            // Sensitive info like account number and IFSC are excluded for security
          } : null,
          submittedAt: profile.submittedAt,
          approvedAt: profile.approvedAt,
          rejectionReasons: profile.rejectionReasons
        } : null,
        
        // Computed fields
        hasProfile: !!profile,
        currentPosition: profile?.professional?.currentPosition || 'Not specified',
        institution: profile?.professional?.institution || 'Not specified',
        department: profile?.professional?.department || 'Not specified',
        specialization: profile?.professional?.specialization || 'Not specified',
        profilePicture: profile?.personalInfo?.profilePicture || teacher.profileImage,
        status: getTeacherStatus(teacher, profile)
      };
    });

    // Apply additional filters that depend on profile data
    let filteredTeachers = enrichedTeachers;
    
    if (profileStatus || department) {
      filteredTeachers = enrichedTeachers.filter(teacher => {
        if (profileStatus && teacher.profile?.profileStatus !== profileStatus) {
          return false;
        }
        if (department && !teacher.department.toLowerCase().includes(department.toLowerCase())) {
          return false;
        }
        return true;
      });
    }

    // Get total count with all filters applied
    const totalCount = await Teacher.countDocuments(teacherFilter);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
      success: true,
      message: 'Teachers retrieved successfully',
      data: {
        teachers: filteredTeachers,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage,
          hasPrevPage
        },
        filters: {
          search: search || '',
          isApproved: isApproved || '',
          isActive: isActive || '',
          profileStatus: profileStatus || '',
          department: department || ''
        }
      }
    });

  } catch (error) {
    console.error('Get all teachers error:', error);
    next(new CustomError('Failed to retrieve teachers.', 500));
  }
};

/**
 * Get a specific teacher by ID with complete profile data
 * GET /api/admin/teachers/:id
 */
const getTeacherById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid teacher ID format.', 400));
    }

    // Find the teacher
    const teacher = await Teacher.findOne({ 
      _id: id, 
      isDelete: false 
    }).lean();

    if (!teacher) {
      return next(new CustomError('Teacher not found.', 404));
    }

    // Find the teacher's profile
    const teacherProfile = await TeacherProfile.findOne({ 
      userId: id 
    }).lean();

    // Combine data
    const enrichedTeacher = {
      // Basic teacher info
      _id: teacher._id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      name: teacher.name || `${teacher.firstName} ${teacher.lastName}`,
      email: teacher.email,
      phoneNumber: teacher.phoneNumber,
      contactNumber: teacher.contactNumber,
      qualification: teacher.qualification,
      experience: teacher.experience,
      aboutTeacher: teacher.aboutTeacher,
      profileImage: teacher.profileImage,
      username: teacher.username,
      isApproved: teacher.isApproved,
      isActive: teacher.isActive,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
      
      // Complete profile information
      profile: teacherProfile,
      
      // Computed fields
      hasProfile: !!teacherProfile,
      currentPosition: teacherProfile?.professional?.currentPosition || 'Not specified',
      institution: teacherProfile?.professional?.institution || 'Not specified',
      department: teacherProfile?.professional?.department || 'Not specified',
      specialization: teacherProfile?.professional?.specialization || 'Not specified',
      profilePicture: teacherProfile?.personalInfo?.profilePicture || teacher.profileImage,
      status: getTeacherStatus(teacher, teacherProfile)
    };

    res.status(200).json({
      success: true,
      message: 'Teacher retrieved successfully',
      data: {
        teacher: enrichedTeacher
      }
    });

  } catch (error) {
    console.error('Get teacher by ID error:', error);
    next(new CustomError('Failed to retrieve teacher.', 500));
  }
};

/**
 * Update teacher status (approve/reject, activate/deactivate)
 * PATCH /api/admin/teachers/:id
 */
const updateTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isApproved, isActive, rejectionReasons } = req.body;
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid teacher ID format.', 400));
    }

    // Find the teacher
    const teacher = await Teacher.findOne({  _id: id,  isDelete: false  });

    if (!teacher) {
      return next(new CustomError('Teacher not found.', 404));
    }

    // Update teacher fields
    const updateData = {};
    if (isApproved !== undefined) {
      updateData.isApproved = isApproved;
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    // Update teacher
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    // Update teacher profile if exists
    const teacherProfile = await TeacherProfile.findOne({ userId: id });
    if (teacherProfile) {
      const profileUpdateData = {};
      
      if (isApproved === true) {
        profileUpdateData.profileStatus = 'approved';
        profileUpdateData.approvedAt = new Date();
        profileUpdateData.rejectionReasons = [];
      } else if (isApproved === false) {
        profileUpdateData.profileStatus = 'rejected';
        profileUpdateData.approvedAt = null;
        if (rejectionReasons && Array.isArray(rejectionReasons)) {
          profileUpdateData.rejectionReasons = rejectionReasons;
        }
      }

      if (Object.keys(profileUpdateData).length > 0) {
        await TeacherProfile.findByIdAndUpdate(
          teacherProfile._id,
          profileUpdateData,
          { new: true }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: 'Teacher updated successfully',
      data: {
        teacher: updatedTeacher
      }
    });

  } catch (error) {
    console.error('Update teacher error:', error);
    next(new CustomError('Failed to update teacher.', 500));
  }
};

/**
 * Delete (soft delete) a teacher
 * DELETE /api/admin/teachers/:id
 */
const deleteTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid teacher ID format.', 400));
    }

    // Soft delete the teacher
    const teacher = await Teacher.findByIdAndUpdate(
      id,
      { 
        isDelete: true,
        isActive: false,
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!teacher) {
      return next(new CustomError('Teacher not found.', 404));
    }

    // Also update the profile to inactive
    await TeacherProfile.findOneAndUpdate(
      { userId: id },
      { 
        isActive: false,
        isDeleted: true
      }
    );

    res.status(200).json({
      success: true,
      message: 'Teacher deleted successfully',
      data: {
        teacher: {
          _id: teacher._id,
          email: teacher.email,
          isDelete: teacher.isDelete,
          deletedAt: teacher.deletedAt
        }
      }
    });

  } catch (error) {
    console.error('Delete teacher error:', error);
    next(new CustomError('Failed to delete teacher.', 500));
  }
};

/**
 * Get teacher statistics
 * GET /api/admin/teachers/stats
 */
const getTeacherStats = async (req, res, next) => {
  try {
    // Basic teacher counts
    const [
      totalTeachers,
      activeTeachers,
      approvedTeachers,
      pendingApproval,
      teachersWithProfiles,
      completedProfiles
    ] = await Promise.all([
      Teacher.countDocuments({ isDelete: false }),
      Teacher.countDocuments({ isDelete: false, isActive: true }),
      Teacher.countDocuments({ isDelete: false, isApproved: true }),
      Teacher.countDocuments({ isDelete: false, isApproved: false }),
      TeacherProfile.countDocuments({ isDeleted: false }),
      TeacherProfile.countDocuments({ isDeleted: false, isProfileComplete: true })
    ]);

    // Profile status breakdown
    const profileStatusBreakdown = await TeacherProfile.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$profileStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    // Department breakdown
    const departmentBreakdown = await TeacherProfile.aggregate([
      { $match: { isDeleted: false, 'professional.department': { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$professional.department',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Recent signups (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentSignups = await Teacher.countDocuments({
      isDelete: false,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Calculate percentages
    const activePercentage = totalTeachers > 0 ? Math.round((activeTeachers / totalTeachers) * 100) : 0;
    const approvalPercentage = totalTeachers > 0 ? Math.round((approvedTeachers / totalTeachers) * 100) : 0;
    const profileCompletionPercentage = teachersWithProfiles > 0 ? Math.round((completedProfiles / teachersWithProfiles) * 100) : 0;

    res.status(200).json({
      success: true,
      message: 'Teacher statistics retrieved successfully',
      data: {
        overview: {
          totalTeachers,
          activeTeachers,
          approvedTeachers,
          pendingApproval,
          teachersWithProfiles,
          completedProfiles,
          recentSignups
        },
        profileStatusBreakdown,
        departmentBreakdown,
        percentages: {
          activePercentage,
          approvalPercentage,
          profileCompletionPercentage
        }
      }
    });

  } catch (error) {
    console.error('Get teacher stats error:', error);
    next(new CustomError('Failed to retrieve teacher statistics.', 500));
  }
};

/**
 * Bulk operations on teachers
 * POST /api/admin/teachers/bulk
 */
const bulkTeacherOperations = async (req, res, next) => {
  try {
    const { operation, teacherIds, updateData } = req.body;

    if (!operation || !Array.isArray(teacherIds) || teacherIds.length === 0) {
      return next(new CustomError('Operation and teacher IDs are required.', 400));
    }

    // Validate teacher IDs
    const invalidIds = teacherIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return next(new CustomError('Invalid teacher ID format in the list.', 400));
    }

    let result;
    let affectedCount = 0;

    switch (operation) {
      case 'approve':
        result = await Teacher.updateMany(
          { _id: { $in: teacherIds }, isDelete: false },
          { isApproved: true }
        );
        await TeacherProfile.updateMany(
          { userId: { $in: teacherIds } },
          { profileStatus: 'approved', approvedAt: new Date(), rejectionReasons: [] }
        );
        affectedCount = result.modifiedCount;
        break;

      case 'reject':
        result = await Teacher.updateMany(
          { _id: { $in: teacherIds }, isDelete: false },
          { isApproved: false }
        );
        await TeacherProfile.updateMany(
          { userId: { $in: teacherIds } },
          { 
            profileStatus: 'rejected', 
            approvedAt: null,
            rejectionReasons: updateData?.rejectionReasons || ['Bulk rejection by admin']
          }
        );
        affectedCount = result.modifiedCount;
        break;

      case 'activate':
        result = await Teacher.updateMany(
          { _id: { $in: teacherIds }, isDelete: false },
          { isActive: true }
        );
        await TeacherProfile.updateMany(
          { userId: { $in: teacherIds } },
          { isActive: true }
        );
        affectedCount = result.modifiedCount;
        break;

      case 'deactivate':
        result = await Teacher.updateMany(
          { _id: { $in: teacherIds }, isDelete: false },
          { isActive: false }
        );
        await TeacherProfile.updateMany(
          { userId: { $in: teacherIds } },
          { isActive: false }
        );
        affectedCount = result.modifiedCount;
        break;

      case 'delete':
        result = await Teacher.updateMany(
          { _id: { $in: teacherIds } },
          { isDelete: true, isActive: false, deletedAt: new Date() }
        );
        await TeacherProfile.updateMany(
          { userId: { $in: teacherIds } },
          { isActive: false, isDeleted: true }
        );
        affectedCount = result.modifiedCount;
        break;

      default:
        return next(new CustomError('Invalid operation. Supported operations: approve, reject, activate, deactivate, delete.', 400));
    }

    res.status(200).json({
      success: true,
      message: `Bulk ${operation} operation completed successfully`,
      data: {
        operation,
        requestedCount: teacherIds.length,
        affectedCount
      }
    });

  } catch (error) {
    console.error('Bulk teacher operations error:', error);
    next(new CustomError('Failed to perform bulk operation.', 500));
  }
};

/**
 * Helper function to determine teacher status
 */
function getTeacherStatus(teacher, profile) {
  if (!teacher.isActive) return 'inactive';
  if (teacher.isDelete) return 'deleted';
  if (!teacher.isApproved) return 'pending_approval';
  if (!profile) return 'no_profile';
  if (profile.profileStatus === 'rejected') return 'profile_rejected';
  if (profile.profileStatus === 'pending') return 'profile_pending';
  if (profile.profileStatus === 'incomplete') return 'profile_incomplete';
  if (profile.profileStatus === 'approved') return 'approved';
  return 'unknown';
}

/**
 * Approve a teacher
 * PUT /api/admin/teachers/:id/approve
 */
const approveTeacher = async (req, res, next) => {
  console.log(`[CONTROLLER DEBUG] approveTeacher function called for ID: ${req.params.id}`);
  console.log(`[CONTROLLER DEBUG] Admin: ${req.admin?.email || 'Unknown'}`);
  console.log(`[CONTROLLER DEBUG] Request body:`, req.body);
  
  try {
    const { id } = req.params;
    const { approvalNote } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid teacher ID format.', 400));
    }

    // Find the teacher
    const teacher = await Teacher.findOne({ _id: id, isDelete: false });
    if (!teacher) {
      return next(new CustomError('Teacher not found.', 404));
    }

    // Update teacher approval status
    teacher.isApproved = true;
    await teacher.save();

    // Update teacher profile if exists
    const profile = await TeacherProfile.findOne({ userId: id });
    if (profile) {
      profile.profileStatus = 'approved';
      profile.approvedAt = new Date();
      profile.rejectionReasons = [];
      if (approvalNote) {
        profile.adminNotes = profile.adminNotes || [];
        profile.adminNotes.push({
          note: approvalNote,
          addedBy: req.admin._id,
          addedAt: new Date(),
          type: 'approval'
        });
      }
      await profile.save();
    }

    // Send notification to the approved teacher
    console.log(`[DEBUG] About to send notification for teacher: ${teacher.email} (ID: ${teacher._id})`);
    try {
      const notification = await notificationService.createTeacherApprovalNotification({
        teacherId: teacher._id,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        adminId: req.admin._id,
      });
      console.log(`[NOTIFICATION SENT] Teacher approval notification sent to: ${teacher.email}`);
      console.log(`[NOTIFICATION DETAILS] ID: ${notification._id}, Title: ${notification.title}`);
    } catch (notificationError) {
      console.error('❌ Failed to send teacher approval notification:', notificationError);
      console.error('❌ Error details:', notificationError.message);
      console.error('❌ Stack trace:', notificationError.stack);
      // Don't fail the approval process if notification fails
    }

    // Log the action
    console.log(`[TEACHER APPROVED] ${new Date().toISOString()} - Teacher: ${teacher.email} - By: ${req.admin.email} (${req.admin.role})`);

    res.status(200).json({
      success: true,
      message: 'Teacher approved successfully',
      data: {
        teacher: {
          _id: teacher._id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          email: teacher.email,
          isApproved: teacher.isApproved,
          isActive: teacher.isActive
        }
      }
    });

  } catch (error) {
    console.error('Approve teacher error:', error);
    next(new CustomError('Failed to approve teacher.', 500));
  }
};

/**
 * Reject a teacher
 * PUT /api/admin/teachers/:id/reject
 */
const rejectTeacher = async (req, res, next) => {
  console.log(`[CONTROLLER DEBUG] rejectTeacher function called for ID: ${req.params.id}`);
  console.log(`[CONTROLLER DEBUG] Admin: ${req.admin?.email || 'Unknown'}`);
  console.log(`[CONTROLLER DEBUG] Request body:`, req.body);
  
  try {
    const { id } = req.params;
    const { rejectionReasons, rejectionNote } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid teacher ID format.', 400));
    }

    if (!rejectionReasons || !Array.isArray(rejectionReasons) || rejectionReasons.length === 0) {
      return next(new CustomError('At least one rejection reason is required.', 400));
    }

    // Find the teacher
    const teacher = await Teacher.findOne({ _id: id, isDelete: false });
    if (!teacher) {
      return next(new CustomError('Teacher not found.', 404));
    }

    // Update teacher approval status
    teacher.isApproved = false;
    await teacher.save();

    // Update teacher profile if exists
    const profile = await TeacherProfile.findOne({ userId: id });
    if (profile) {
      profile.profileStatus = 'rejected';
      profile.approvedAt = null;
      profile.rejectionReasons = rejectionReasons;
      if (rejectionNote) {
        profile.adminNotes = profile.adminNotes || [];
        profile.adminNotes.push({
          note: rejectionNote,
          addedBy: req.admin._id,
          addedAt: new Date(),
          type: 'rejection'
        });
      }
      await profile.save();
    }

    // Send notification to the rejected teacher
    console.log(`[DEBUG] About to send rejection notification for teacher: ${teacher.email} (ID: ${teacher._id})`);
    try {
      const notification = await notificationService.createTeacherRejectionNotification({
        teacherId: teacher._id,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        adminId: req.admin._id,
        rejectionReasons: rejectionReasons,
      });
      console.log(`[NOTIFICATION SENT] Teacher rejection notification sent to: ${teacher.email}`);
      console.log(`[NOTIFICATION DETAILS] ID: ${notification._id}, Title: ${notification.title}`);
    } catch (notificationError) {
      console.error('❌ Failed to send teacher rejection notification:', notificationError);
      console.error('❌ Error details:', notificationError.message);
      console.error('❌ Stack trace:', notificationError.stack);
      // Don't fail the rejection process if notification fails
    }

    // Log the action
    console.log(`[TEACHER REJECTED] ${new Date().toISOString()} - Teacher: ${teacher.email} - Reasons: ${rejectionReasons.join(', ')} - By: ${req.admin.email} (${req.admin.role})`);

    res.status(200).json({
      success: true,
      message: 'Teacher rejected successfully',
      data: {
        teacher: {
          _id: teacher._id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          email: teacher.email,
          isApproved: teacher.isApproved,
          isActive: teacher.isActive
        },
        rejectionReasons
      }
    });

  } catch (error) {
    console.error('Reject teacher error:', error);
    next(new CustomError('Failed to reject teacher.', 500));
  }
};

/**
 * Activate a teacher
 * PUT /api/admin/teachers/:id/activate
 */
const activateTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { activationNote } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid teacher ID format.', 400));
    }

    // Find the teacher
    const teacher = await Teacher.findOne({ _id: id, isDelete: false });
    if (!teacher) {
      return next(new CustomError('Teacher not found.', 404));
    }

    // Update teacher active status
    teacher.isActive = true;
    await teacher.save();

    // Update teacher profile if exists
    const profile = await TeacherProfile.findOne({ userId: id });
    if (profile) {
      profile.isActive = true;
      if (activationNote) {
        profile.adminNotes = profile.adminNotes || [];
        profile.adminNotes.push({
          note: activationNote,
          addedBy: req.admin._id,
          addedAt: new Date(),
          type: 'activation'
        });
      }
      await profile.save();
    }

    // Log the action
    console.log(`[TEACHER ACTIVATED] ${new Date().toISOString()} - Teacher: ${teacher.email} - By: ${req.admin.email} (${req.admin.role})`);

    res.status(200).json({
      success: true,
      message: 'Teacher activated successfully',
      data: {
        teacher: {
          _id: teacher._id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          email: teacher.email,
          isApproved: teacher.isApproved,
          isActive: teacher.isActive
        }
      }
    });

  } catch (error) {
    console.error('Activate teacher error:', error);
    next(new CustomError('Failed to activate teacher.', 500));
  }
};

/**
 * Deactivate a teacher
 * PUT /api/admin/teachers/:id/deactivate
 */
const deactivateTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deactivationNote } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid teacher ID format.', 400));
    }

    // Find the teacher
    const teacher = await Teacher.findOne({ _id: id, isDelete: false });
    if (!teacher) {
      return next(new CustomError('Teacher not found.', 404));
    }

    // Update teacher active status
    teacher.isActive = false;
    await teacher.save();

    // Update teacher profile if exists
    const profile = await TeacherProfile.findOne({ userId: id });
    if (profile) {
      profile.isActive = false;
      if (deactivationNote) {
        profile.adminNotes = profile.adminNotes || [];
        profile.adminNotes.push({
          note: deactivationNote,
          addedBy: req.admin._id,
          addedAt: new Date(),
          type: 'deactivation'
        });
      }
      await profile.save();
    }

    // Log the action
    console.log(`[TEACHER DEACTIVATED] ${new Date().toISOString()} - Teacher: ${teacher.email} - By: ${req.admin.email} (${req.admin.role})`);

    res.status(200).json({
      success: true,
      message: 'Teacher deactivated successfully',
      data: {
        teacher: {
          _id: teacher._id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          email: teacher.email,
          isApproved: teacher.isApproved,
          isActive: teacher.isActive
        }
      }
    });

  } catch (error) {
    console.error('Deactivate teacher error:', error);
    next(new CustomError('Failed to deactivate teacher.', 500));
  }
};

/**
 * Download teacher resume
 * GET /api/admin/teachers/:id/resume
 */
const downloadResume = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new CustomError('Invalid teacher ID format.', 400));
    }

    // Find the teacher profile
    const teacherProfile = await TeacherProfile.findOne({ 
      userId: id,
      isDeleted: false
    });

    if (!teacherProfile) {
      return next(new CustomError('Teacher profile not found.', 404));
    }

    // Check if resume exists
    if (!teacherProfile.professional?.resume) {
      return next(new CustomError('No resume uploaded for this teacher.', 404));
    }

    const resumeUrl = teacherProfile.professional.resume;
    console.log('Resume URL from database:', resumeUrl);
    
    // Check if it's a Cloudinary URL
    if (resumeUrl.includes('cloudinary.com')) {
      // For Cloudinary URLs, fetch the file and serve it
      const url = new URL(resumeUrl);
      const protocol = url.protocol === 'https:' ? https : http;
      
      const request = protocol.get(url, (response) => {
        if (response.statusCode === 200) {
          // Set headers for file download
          res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${path.basename(resumeUrl)}"`);
          res.setHeader('Content-Length', response.headers['content-length']);
          
          // Pipe the response to our response
          response.pipe(res);
        } else {
          next(new CustomError('Failed to fetch resume from Cloudinary.', 500));
        }
      });

      request.on('error', (error) => {
        console.error('Error fetching from Cloudinary:', error);
        next(new CustomError('Error downloading resume file.', 500));
      });

      request.setTimeout(30000, () => {
        request.destroy();
        next(new CustomError('Timeout while downloading resume.', 500));
      });
    } else {
      // Handle case where we have just a filename or local path
      // For now, return an error since we don't have the full Cloudinary URL
      return next(new CustomError('Resume file URL is not properly configured. Please contact support.', 500));
    }

  } catch (error) {
    console.error('Download resume error:', error);
    next(new CustomError('Failed to download resume.', 500));
  }
};

module.exports = {
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  getTeacherStats,
  bulkTeacherOperations,
  approveTeacher,
  rejectTeacher,
  activateTeacher,
  deactivateTeacher,
  downloadResume
}; 