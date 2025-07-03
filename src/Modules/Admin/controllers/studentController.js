const Student = require('../../Students/studentModel');
const CustomError = require('../../../Errors/CustomError');
const asyncHandler = require('../../../Utils/asyncHandler');

/**
 * Get all active students with pagination and filtering
 * GET /api/admin/students
 */
const getAllStudents = asyncHandler(async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      department = '',
      graduationStatus = '',
      isActive = '',
      emailVerified = ''
    } = req.query;

    // Convert page and limit to numbers
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Max 50 items per page
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter = {
      isDelete: { $ne: true } // Only non-deleted students (equivalent to deletedAt: null)
    };

    // Add search functionality
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { collegeName: { $regex: search, $options: 'i' } }
      ];
    }

    // Add additional filters
    if (department) {
      filter.department = { $regex: department, $options: 'i' };
    }
    
    if (graduationStatus) {
      filter.graduationStatus = graduationStatus;
    }
    
    if (isActive !== '') {
      filter.isActive = isActive === 'true';
    }
    
    if (emailVerified !== '') {
      filter.emailVerified = emailVerified === 'true';
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute queries in parallel
    const [students, totalCount] = await Promise.all([
      Student.find(filter)
        .select('-password') // Exclude password field
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Student.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Add computed fields
    const studentsWithComputedFields = students.map(student => ({
      ...student,
      fullName: `${student.firstName} ${student.lastName}`,
      profileCompletionPercentage: calculateProfileCompletion(student)
    }));

    res.status(200).json({
      success: true,
      message: 'Students retrieved successfully',
      data: {
        students: studentsWithComputedFields,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          limit: limitNum,
          hasNextPage,
          hasPrevPage
        },
        filters: {
          search,
          department,
          graduationStatus,
          isActive,
          emailVerified
        }
      }
    });

  } catch (error) {
    console.error('Get all students error:', error);
    next(new CustomError('Failed to retrieve students.', 500));
  }
});

/**
 * Get student statistics
 * GET /api/admin/students/stats
 */
const getStudentStats = asyncHandler(async (req, res, next) => {
  try {
    const [
      totalStudents,
      activeStudents,
      verifiedStudents,
      departmentStats,
      graduationStats,
      recentSignups
    ] = await Promise.all([
      // Total students (non-deleted)
      Student.countDocuments({ isDelete: { $ne: true } }),
      
      // Active students
      Student.countDocuments({ isDelete: { $ne: true }, isActive: true }),
      
      // Email verified students
      Student.countDocuments({ isDelete: { $ne: true }, emailVerified: true }),
      
      // Department statistics
      Student.aggregate([
        { $match: { isDelete: { $ne: true } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Graduation status statistics
      Student.aggregate([
        { $match: { isDelete: { $ne: true } } },
        { $group: { _id: '$graduationStatus', count: { $sum: 1 } } }
      ]),
      
      // Recent signups (last 30 days)
      Student.countDocuments({
        isDelete: { $ne: true },
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    res.status(200).json({
      success: true,
      message: 'Student statistics retrieved successfully',
      data: {
        overview: {
          totalStudents,
          activeStudents,
          verifiedStudents,
          recentSignups
        },
        departmentBreakdown: departmentStats,
        graduationStatusBreakdown: graduationStats,
        percentages: {
          activePercentage: totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0,
          verifiedPercentage: totalStudents > 0 ? Math.round((verifiedStudents / totalStudents) * 100) : 0
        }
      }
    });

  } catch (error) {
    console.error('Get student stats error:', error);
    next(new CustomError('Failed to retrieve student statistics.', 500));
  }
});

/**
 * Get specific student by ID
 * GET /api/admin/students/:id
 */
const getStudentById = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    const student = await Student.findOne({
      _id: id,
      isDelete: { $ne: true }
    }).select('-password').lean();

    if (!student) {
      return next(new CustomError('Student not found.', 404));
    }

    // Add computed fields
    const studentWithComputedFields = {
      ...student,
      fullName: `${student.firstName} ${student.lastName}`,
      profileCompletionPercentage: calculateProfileCompletion(student)
    };

    res.status(200).json({
      success: true,
      message: 'Student retrieved successfully',
      data: {
        student: studentWithComputedFields
      }
    });

  } catch (error) {
    console.error('Get student by ID error:', error);
    if (error.name === 'CastError') {
      return next(new CustomError('Invalid student ID format.', 400));
    }
    next(new CustomError('Failed to retrieve student.', 500));
  }
});

/**
 * Update student information
 * PATCH /api/admin/students/:id
 */
const updateStudent = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.password;
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const student = await Student.findOneAndUpdate(
      { _id: id, isDelete: { $ne: true } },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!student) {
      return next(new CustomError('Student not found.', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: {
        student: {
          ...student.toObject(),
          fullName: `${student.firstName} ${student.lastName}`
        }
      }
    });

  } catch (error) {
    console.error('Update student error:', error);
    if (error.name === 'CastError') {
      return next(new CustomError('Invalid student ID format.', 400));
    }
    if (error.name === 'ValidationError') {
      return next(new CustomError('Invalid student data provided.', 400));
    }
    next(new CustomError('Failed to update student.', 500));
  }
});

/**
 * Soft delete student
 * DELETE /api/admin/students/:id
 */
const deleteStudent = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    console.log(id);

    const student = await Student.findOneAndUpdate(
      { _id: id, isDelete: { $ne: true } },
      { 
        $set: { 
          isDelete: true,
          isActive: false,
          deletedAt: new Date()
        }
      },
      { new: true }
    ).select('-password');

    if (!student) {
      return next(new CustomError('Student not found.', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully',
      data: {
        student: {
          id: student._id,
          email: student.email,
          fullName: `${student.firstName} ${student.lastName}`,
          deletedAt: student.deletedAt
        }
      }
    });

  } catch (error) {
    console.error('Delete student error:', error);
    if (error.name === 'CastError') {
      return next(new CustomError('Invalid student ID format.', 400));
    }
    next(new CustomError('Failed to delete student.', 500));
  }
});

/**
 * Restore soft deleted student
 * POST /api/admin/students/:id/restore
 */
const restoreStudent = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    const student = await Student.findOneAndUpdate(
      { _id: id, isDelete: true },
      { 
        $set: { 
          isDelete: false,
          isActive: true
        },
        $unset: { deletedAt: 1 }
      },
      { new: true }
    ).select('-password');

    if (!student) {
      return next(new CustomError('Deleted student not found.', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Student restored successfully',
      data: {
        student: {
          ...student.toObject(),
          fullName: `${student.firstName} ${student.lastName}`
        }
      }
    });

  } catch (error) {
    console.error('Restore student error:', error);
    if (error.name === 'CastError') {
      return next(new CustomError('Invalid student ID format.', 400));
    }
    next(new CustomError('Failed to restore student.', 500));
  }
});

/**
 * Bulk operations on students
 * POST /api/admin/students/bulk
 */
const bulkStudentOperations = asyncHandler(async (req, res, next) => {
  try {
    const { operation, studentIds, updateData = {} } = req.body;

    if (!operation || !Array.isArray(studentIds) || studentIds.length === 0) {
      return next(new CustomError('Invalid bulk operation data.', 400));
    }

    let result;
    const filter = { _id: { $in: studentIds }, isDelete: { $ne: true } };

    switch (operation) {
      case 'delete':
        result = await Student.updateMany(
          filter,
          { 
            $set: { 
              isDelete: true,
              isActive: false,
              deletedAt: new Date()
            }
          }
        );
        break;

      case 'activate':
        result = await Student.updateMany(
          filter,
          { $set: { isActive: true } }
        );
        break;

      case 'deactivate':
        result = await Student.updateMany(
          filter,
          { $set: { isActive: false } }
        );
        break;

      case 'update':
        // Remove sensitive fields
        delete updateData.password;
        delete updateData._id;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        
        result = await Student.updateMany(
          filter,
          { $set: updateData }
        );
        break;

      default:
        return next(new CustomError('Invalid bulk operation.', 400));
    }

    res.status(200).json({
      success: true,
      message: `Bulk ${operation} operation completed successfully`,
      data: {
        operation,
        affectedCount: result.modifiedCount,
        requestedCount: studentIds.length
      }
    });

  } catch (error) {
    console.error('Bulk student operations error:', error);
    next(new CustomError('Failed to perform bulk operation.', 500));
  }
});

/**
 * Helper function to calculate profile completion percentage
 */
const calculateProfileCompletion = (student) => {
  let completedFields = 0;
  const totalFields = 8;

  if (student.firstName) completedFields++;
  if (student.lastName) completedFields++;
  if (student.email) completedFields++;
  if (student.phoneNumber) completedFields++;
  if (student.collegeName) completedFields++;
  if (student.department) completedFields++;
  if (student.graduationStatus) completedFields++;
  if (student.dob) completedFields++;

  return Math.round((completedFields / totalFields) * 100);
};

module.exports = {
  getAllStudents,
  getStudentStats,
  getStudentById,
  updateStudent,
  deleteStudent,
  restoreStudent,
  bulkStudentOperations
}; 