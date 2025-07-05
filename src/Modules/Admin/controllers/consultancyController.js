const ConsultancyCard = require('../../ConsultancyCard/consultancyCardModel');
const CustomError = require('../../../Errors/CustomError');

/**
 * Get all consultancies for admin management
 * GET /api/admin/consultancies
 */
const getAllConsultancies = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = '', 
      search = '', 
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'teacherProfile.firstName': { $regex: search, $options: 'i' } },
        { 'teacherProfile.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get consultancies with teacher profile populated
    const consultancies = await ConsultancyCard.find(filter)
      .populate('teacherId', 'firstName lastName email profilePicture')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalCount = await ConsultancyCard.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.status(200).json({
      success: true,
      message: 'Consultancies retrieved successfully',
      data: consultancies,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get all consultancies error:', error);
    next(new CustomError('Failed to retrieve consultancies.', 500));
  }
};

/**
 * Get consultancy by ID
 * GET /api/admin/consultancies/:id
 */
const getConsultancyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const consultancy = await ConsultancyCard.findById(id)
      .populate('teacherId', 'firstName lastName email profilePicture phone')
      .populate('approvedBy', 'fullName email')
      .populate('rejectedBy', 'fullName email')
      .lean();

    if (!consultancy) {
      return next(new CustomError('Consultancy not found.', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Consultancy retrieved successfully',
      data: consultancy
    });

  } catch (error) {
    console.error('Get consultancy by ID error:', error);
    next(new CustomError('Failed to retrieve consultancy.', 500));
  }
};

/**
 * Approve consultancy
 * PUT /api/admin/consultancies/:id/approve
 */
const approveConsultancy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comments = '' } = req.body;
    const approvedBy = req.admin._id;

    const consultancy = await ConsultancyCard.findById(id);
    
    if (!consultancy) {
      return next(new CustomError('Consultancy not found.', 404));
    }

    if (consultancy.status === 'approved') {
      return next(new CustomError('Consultancy is already approved.', 400));
    }

    // Update consultancy status
    consultancy.status = 'approved';
    consultancy.isApproved = true;
    consultancy.approvedBy = approvedBy;
    consultancy.approvedAt = new Date();
    consultancy.approvalComments = comments;
    consultancy.rejectionReason = undefined;
    consultancy.rejectedBy = undefined;
    consultancy.rejectedAt = undefined;

    await consultancy.save();

    // Populate the response
    const updatedConsultancy = await ConsultancyCard.findById(id)
      .populate('teacherId', 'firstName lastName email')
      .populate('approvedBy', 'fullName email')
      .lean();

    // Log the action
    console.log(`[ADMIN ACTION] ${new Date().toISOString()} - Consultancy approved: ${id} - By: ${req.admin.email} (${req.admin.role})`);

    res.status(200).json({
      success: true,
      message: 'Consultancy approved successfully',
      data: updatedConsultancy
    });

  } catch (error) {
    console.error('Approve consultancy error:', error);
    next(new CustomError('Failed to approve consultancy.', 500));
  }
};

/**
 * Reject consultancy
 * PUT /api/admin/consultancies/:id/reject
 */
const rejectConsultancy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const rejectedBy = req.admin._id;

    if (!rejectionReason || rejectionReason.trim() === '') {
      return next(new CustomError('Rejection reason is required.', 400));
    }

    const consultancy = await ConsultancyCard.findById(id);
    
    if (!consultancy) {
      return next(new CustomError('Consultancy not found.', 404));
    }

    if (consultancy.status === 'rejected') {
      return next(new CustomError('Consultancy is already rejected.', 400));
    }

    // Update consultancy status
    consultancy.status = 'rejected';
    consultancy.isApproved = false;
    consultancy.rejectedBy = rejectedBy;
    consultancy.rejectedAt = new Date();
    consultancy.rejectionReason = rejectionReason.trim();
    consultancy.approvedBy = undefined;
    consultancy.approvedAt = undefined;
    consultancy.approvalComments = undefined;

    await consultancy.save();

    // Populate the response
    const updatedConsultancy = await ConsultancyCard.findById(id)
      .populate('teacherId', 'firstName lastName email')
      .populate('rejectedBy', 'fullName email')
      .lean();

    // Log the action
    console.log(`[ADMIN ACTION] ${new Date().toISOString()} - Consultancy rejected: ${id} - By: ${req.admin.email} (${req.admin.role}) - Reason: ${rejectionReason}`);

    res.status(200).json({
      success: true,
      message: 'Consultancy rejected successfully',
      data: updatedConsultancy
    });

  } catch (error) {
    console.error('Reject consultancy error:', error);
    next(new CustomError('Failed to reject consultancy.', 500));
  }
};

/**
 * Delete consultancy
 * DELETE /api/admin/consultancies/:id
 */
const deleteConsultancy = async (req, res, next) => {
  try {
    const { id } = req.params;

    const consultancy = await ConsultancyCard.findById(id);
    
    if (!consultancy) {
      return next(new CustomError('Consultancy not found.', 404));
    }

    await ConsultancyCard.findByIdAndDelete(id);

    // Log the action
    console.log(`[ADMIN ACTION] ${new Date().toISOString()} - Consultancy deleted: ${id} - By: ${req.admin.email} (${req.admin.role})`);

    res.status(200).json({
      success: true,
      message: 'Consultancy deleted successfully'
    });

  } catch (error) {
    console.error('Delete consultancy error:', error);
    next(new CustomError('Failed to delete consultancy.', 500));
  }
};

/**
 * Get consultancy statistics
 * GET /api/admin/consultancies/stats
 */
const getConsultancyStats = async (req, res, next) => {
  try {
    const stats = await ConsultancyCard.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalCount = await ConsultancyCard.countDocuments();
    
    // Format stats
    const formattedStats = {
      total: totalCount,
      pending: 0,
      approved: 0,
      rejected: 0
    };

    stats.forEach(stat => {
      if (stat._id) {
        formattedStats[stat._id] = stat.count;
      }
    });

    res.status(200).json({
      success: true,
      message: 'Consultancy statistics retrieved successfully',
      data: formattedStats
    });

  } catch (error) {
    console.error('Get consultancy stats error:', error);
    next(new CustomError('Failed to retrieve consultancy statistics.', 500));
  }
};

module.exports = {
  getAllConsultancies,
  getConsultancyById,
  approveConsultancy,
  rejectConsultancy,
  deleteConsultancy,
  getConsultancyStats
}; 