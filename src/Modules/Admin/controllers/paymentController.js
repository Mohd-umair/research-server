const CustomError = require('../../../Errors/CustomError');
const successResponse = require('../../../Utils/apiResponse');
const asyncHandler = require('../../../Utils/asyncHandler');
const PaymentModel = require('../../Payment/paymentModel');
const StudentModel = require('../../Students/studentModel');
const TeacherProfileModel = require('../../TeacherProfile/teacherProfileModel');
const ConsultancyCardModel = require('../../ConsultancyCard/consultancyCardModel');
const DatabaseService = require('../../../Service/DbService');

const paymentModel = new DatabaseService(PaymentModel);

const paymentController = {
  /**
   * Get all payments with pagination and filtering
   */
  getAllPayments: asyncHandler(async (req, res, next) => {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      transactionType = '',
      dateFrom = '',
      dateTo = '',
      minAmount = '',
      maxAmount = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { razorpayOrderId: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status) {
      query.paymentStatus = status;
    }

    // Transaction type filter
    if (transactionType) {
      query.transactionType = transactionType;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo);
      }
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) {
        query.amount.$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        query.amount.$lte = parseFloat(maxAmount);
      }
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Populate options
    const populateOptions = [
      { path: 'studentId', select: 'firstName lastName email' },
      { path: 'teacherId', select: 'personalInfo professional' },
      { path: 'consultancyId', select: 'title description' },
      { path: 'referenceId', select: 'title courseName' }
    ];

    // Get payments with pagination
    const payments = await paymentModel.getAllDocuments(query, {
      populate: populateOptions,
      sort: sortBy,
      skip: skip.toString(),
      limit: parseInt(limit).toString()
    });

    // Get total count
    const totalCount = await paymentModel.totalCounts(query);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    return successResponse({
      res,
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage
        }
      },
      message: 'Payments retrieved successfully'
    });
  }),

  /**
   * Get payment by ID
   */
  getPaymentById: asyncHandler(async (req, res, next) => {
    const { paymentId } = req.params;

    const populateOptions = [
      { path: 'studentId', select: 'firstName lastName email phoneNumber collegeName department graduationStatus dob profilePicture address' },
      { path: 'teacherId', select: 'personalInfo professional' },
      { path: 'consultancyId', select: 'title description pricing' },
      { path: 'referenceId', select: 'title courseName' }
    ];

    const payment = await paymentModel.getDocumentById(
      { _id: paymentId },
      populateOptions
    );

    if (!payment) {
      throw new CustomError(404, 'Payment not found');
    }

    return successResponse({
      res,
      data: payment,
      message: 'Payment retrieved successfully'
    });
  }),

  /**
   * Update payment status
   */
  updatePaymentStatus: asyncHandler(async (req, res, next) => {
    const { paymentId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      throw new CustomError(400, 'Status is required');
    }

    const validStatuses = ['Pending', 'Completed', 'completed', 'Failed', 'Refunded'];
    if (!validStatuses.includes(status)) {
      throw new CustomError(400, 'Invalid payment status');
    }

    const updateData = { paymentStatus: status };
    if (notes) {
      updateData.notes = notes;
    }

    const updatedPayment = await paymentModel.updateDocument(
      { _id: paymentId },
      updateData
    );

    if (!updatedPayment) {
      throw new CustomError(404, 'Payment not found');
    }

    return successResponse({
      res,
      data: updatedPayment,
      message: 'Payment status updated successfully'
    });
  }),

  /**
   * Process refund
   */
  processRefund: asyncHandler(async (req, res, next) => {
    const { paymentId } = req.params;
    const { refundAmount, reason } = req.body;

    if (!refundAmount || refundAmount <= 0) {
      throw new CustomError(400, 'Valid refund amount is required');
    }

    // Get the payment
    const payment = await paymentModel.getDocumentById({ _id: paymentId });
    if (!payment) {
      throw new CustomError(404, 'Payment not found');
    }

    if (payment.paymentStatus === 'Refunded') {
      throw new CustomError(400, 'Payment has already been refunded');
    }

    if (refundAmount > payment.amount) {
      throw new CustomError(400, 'Refund amount cannot exceed original payment amount');
    }

    // Update payment status to refunded
    const updateData = {
      paymentStatus: 'Refunded',
      refundAmount,
      refundReason: reason || 'Admin refund',
      refundedAt: new Date(),
      refundedBy: req.adminId
    };

    const updatedPayment = await paymentModel.updateDocument(
      { _id: paymentId },
      updateData
    );

    return successResponse({
      res,
      data: updatedPayment,
      message: 'Refund processed successfully'
    });
  }),

  /**
   * Delete payment (soft delete)
   */
  deletePayment: asyncHandler(async (req, res, next) => {
    const { paymentId } = req.params;

    const payment = await paymentModel.getDocumentById({ _id: paymentId });
    if (!payment) {
      throw new CustomError(404, 'Payment not found');
    }

    // Soft delete by marking as deleted
    await paymentModel.updateDocument(
      { _id: paymentId },
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.adminId }
    );

    return successResponse({
      res,
      message: 'Payment deleted successfully'
    });
  }),

  /**
   * Get payment statistics
   */
  getPaymentStats: asyncHandler(async (req, res, next) => {
    // Get total payments
    const totalPayments = await paymentModel.totalCounts({});

    // Get payments by status
    const completedPayments = await paymentModel.totalCounts({ paymentStatus: { $in: ['Completed', 'completed'] } });
    const pendingPayments = await paymentModel.totalCounts({ paymentStatus: 'Pending' });
    const failedPayments = await paymentModel.totalCounts({ paymentStatus: 'Failed' });
    const refundedPayments = await paymentModel.totalCounts({ paymentStatus: 'Refunded' });

    // Get total amount
    const totalAmountResult = await paymentModel.aggregatePipeline([
      { $match: { paymentStatus: { $in: ['Completed', 'completed'] } } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
    ]);
    const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;

    // Get average amount
    const averageAmount = completedPayments > 0 ? totalAmount / completedPayments : 0;

    // Get monthly stats for the last 12 months
    const monthlyStats = await paymentModel.aggregatePipeline([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Get transaction type stats
    const transactionTypeStats = await paymentModel.aggregatePipeline([
      {
        $group: {
          _id: '$transactionType',
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    return successResponse({
      res,
      data: {
        totalPayments,
        totalAmount,
        completedPayments,
        pendingPayments,
        failedPayments,
        refundedPayments,
        averageAmount,
        monthlyStats: monthlyStats.map(stat => ({
          month: `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}`,
          count: stat.count,
          amount: stat.amount
        })),
        transactionTypeStats: transactionTypeStats.map(stat => ({
          type: stat._id,
          count: stat.count,
          amount: stat.amount
        }))
      },
      message: 'Payment statistics retrieved successfully'
    });
  }),

  /**
   * Export payments to CSV
   */
  exportPayments: asyncHandler(async (req, res, next) => {
    const {
      search = '',
      status = '',
      transactionType = '',
      dateFrom = '',
      dateTo = ''
    } = req.query;

    // Build query (same as getAllPayments)
    const query = {};

    if (search) {
      query.$or = [
        { razorpayOrderId: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.paymentStatus = status;
    }

    if (transactionType) {
      query.transactionType = transactionType;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo);
      }
    }

    // Get all payments for export
    const payments = await paymentModel.getAllDocuments(query, {
      populate: [
        { path: 'studentId', select: 'firstName lastName email phoneNumber collegeName department graduationStatus' },
        { path: 'teacherId', select: 'personalInfo professional' },
        { path: 'consultancyId', select: 'title' }
      ],
      sort: 'createdAt'
    });

    // Handle empty payments
    if (!payments || payments.length === 0) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=payments_${new Date().toISOString().split('T')[0]}.csv`);
      res.send('No payments found');
      return;
    }

    // Convert to CSV format
    const csvData = payments.map(payment => ({
      'Transaction ID': payment.transactionId || 'N/A',
      'Order ID': payment.razorpayOrderId,
      'Student': payment.studentId ? `${payment.studentId.firstName} ${payment.studentId.lastName}` : 'Guest',
      'Student Email': payment.studentId?.email || 'N/A',
      'Teacher': payment.teacherId ? `${payment.teacherId.personalInfo?.firstName} ${payment.teacherId.personalInfo?.lastName}` : 'N/A',
      'Service': payment.consultancyId?.title || payment.transactionType,
      'Amount': payment.amount,
      'Currency': payment.currency,
      'Status': payment.paymentStatus,
      'Type': payment.transactionType,
      'Payment Method': payment.paymentMethod || 'N/A',
      'Created At': new Date(payment.createdAt).toLocaleString(),
      'Updated At': new Date(payment.updatedAt).toLocaleString()
    }));

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=payments_${new Date().toISOString().split('T')[0]}.csv`);

    // Convert to CSV string
    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n');

    res.send(csvString);
  })
};

module.exports = paymentController; 