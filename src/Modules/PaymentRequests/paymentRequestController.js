const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const paymentRequestService = require("./paymentRequestService");

const paymentRequestController = {
  // Get all payment requests (Admin only)
  getAllPaymentRequests: asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 10, status } = req.query;
    
    console.log('Get all payment requests endpoint hit with query:', { page, limit, status });
    
    const result = await paymentRequestService.getAll({ 
      page: parseInt(page), 
      limit: parseInt(limit),
      status
    });
    
    return successResponse({ 
      res: res, 
      data: result.paymentRequests,
      count: result.pagination.totalCount,
      pagination: result.pagination,
      msg: "Payment requests retrieved successfully"
    });
  }),

  // Get payment request by ID (Admin only)
  getPaymentRequestById: asyncHandler(async (req, res, next) => {
    const { requestId } = req.params;
    
    console.log('Get payment request by ID endpoint hit for request:', requestId);
    
    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "Request ID is required"
      });
    }

    const result = await paymentRequestService.getById({ requestId });
    
    return successResponse({ 
      res: res, 
      data: result,
      msg: "Payment request retrieved successfully"
    });
  }),

  // Update payment request status (Admin only)
  updatePaymentRequestStatus: asyncHandler(async (req, res, next) => {
    const { requestId } = req.params;
    const { status, adminNotes } = req.body;
    const processedBy = req.admin._id; // Admin ID
    
    console.log('Update payment request status endpoint hit:', { requestId, status, adminNotes, processedBy });
    
    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "Request ID is required"
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const result = await paymentRequestService.updateStatus({ 
      requestId, 
      status, 
      adminNotes,
      processedBy 
    });
    
    return successResponse({ 
      res: res, 
      data: result,
      msg: "Payment request status updated successfully"
    });
  }),

  // Get payment request statistics (Admin only)
  getPaymentRequestStats: asyncHandler(async (req, res, next) => {
    console.log('Get payment request stats endpoint hit');
    
    const result = await paymentRequestService.getStats();
    
    return successResponse({ 
      res: res, 
      data: result,
      msg: "Payment request statistics retrieved successfully"
    });
  }),

  // Get teacher's payment requests (Teacher only)
  getTeacherPaymentRequests: asyncHandler(async (req, res, next) => {
    const { teacherId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const decodedUser = req.decodedUser;
    
    console.log('Get teacher payment requests endpoint hit for teacher:', teacherId);
    
    // Verify teacher can only access their own requests
    if (decodedUser.role !== 'admin' && decodedUser._id.toString() !== teacherId) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own payment requests"
      });
    }

    if (!teacherId) {
      return res.status(400).json({
        success: false,
        message: "Teacher ID is required"
      });
    }

    const result = await paymentRequestService.getTeacherRequests({ 
      teacherId, 
      page: parseInt(page), 
      limit: parseInt(limit) 
    });
    
    return successResponse({ 
      res: res, 
      data: result.paymentRequests,
      count: result.pagination.totalCount,
      pagination: result.pagination,
      msg: "Teacher payment requests retrieved successfully"
    });
  }),
};

module.exports = paymentRequestController;
