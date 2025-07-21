const asyncHandler = require("../../Utils/asyncHandler");
const earningsService = require("./earningsService");
const successResponse = require("../../Utils/apiResponse");

const earningsCtrl = {
  // Get earnings summary
  getEarningsSummary: asyncHandler(async (req, res, next) => {
    const expertId = req.user.id; // From JWT token
    
    const summary = await earningsService.getEarningsSummary(expertId);
    
    return successResponse({
      res,
      data: summary,
      msg: "Earnings summary retrieved successfully",
    });
  }),

  // Get transactions with filtering
  getTransactions: asyncHandler(async (req, res, next) => {
    const expertId = req.user.id;
    const { 
      status, 
      type, 
      search, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 10 
    } = req.body;

    const filters = { status, type, search, startDate, endDate };
    const result = await earningsService.getTransactions(expertId, filters, parseInt(page), parseInt(limit));
    
    return successResponse({
      res,
      data: result,
      msg: "Transactions retrieved successfully",
    });
  }),

  // Get specific transaction
  getTransactionById: asyncHandler(async (req, res, next) => {
    const expertId = req.user.id;
    const { transactionId } = req.params;

    const transaction = await earningsService.getTransactionById(transactionId, expertId);
    
    return successResponse({
      res,
      data: transaction,
      msg: "Transaction retrieved successfully",
    });
  }),

  // Get earnings by date range
  getEarningsByRange: asyncHandler(async (req, res, next) => {
    const expertId = req.user.id;
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        msg: "Start date and end date are required"
      });
    }

    const earnings = await earningsService.getEarningsByRange(expertId, startDate, endDate);
    
    return successResponse({
      res,
      data: earnings,
      msg: "Earnings by range retrieved successfully",
    });
  }),

  // Get monthly earnings
  getMonthlyEarnings: asyncHandler(async (req, res, next) => {
    const expertId = req.user.id;
    const { year } = req.params;

    if (!year) {
      return res.status(400).json({
        success: false,
        msg: "Year is required"
      });
    }

    const earnings = await earningsService.getMonthlyEarnings(expertId, parseInt(year));
    
    return successResponse({
      res,
      data: earnings,
      msg: "Monthly earnings retrieved successfully",
    });
  }),

  // Request settlement
  requestSettlement: asyncHandler(async (req, res, next) => {
    const expertId = req.user.id;
    const { transactionIds } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        success: false,
        msg: "Transaction IDs array is required"
      });
    }

    const updatedTransactions = await earningsService.requestSettlement(expertId, transactionIds);
    
    return successResponse({
      res,
      data: updatedTransactions,
      msg: "Settlement requested successfully",
    });
  }),

  // Get settlement history
  getSettlementHistory: asyncHandler(async (req, res, next) => {
    const expertId = req.user.id;
    const { page = 1, limit = 10 } = req.body;

    const result = await earningsService.getSettlementHistory(expertId, parseInt(page), parseInt(limit));
    
    return successResponse({
      res,
      data: result,
      msg: "Settlement history retrieved successfully",
    });
  }),

  // Export earnings data
  exportEarnings: asyncHandler(async (req, res, next) => {
    const expertId = req.user.id;
    const { startDate, endDate, format = 'pdf' } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        msg: "Start date and end date are required"
      });
    }

    // Get earnings data for export
    const earnings = await earningsService.getEarningsByRange(expertId, startDate, endDate);
    const transactions = await earningsService.getTransactions(expertId, { startDate, endDate }, 1, 1000);

    const exportData = {
      earnings,
      transactions: transactions.transactions,
      exportDate: new Date(),
      dateRange: { startDate, endDate }
    };

    // For now, return the data as JSON
    // In production, you would generate PDF/Excel files
    return successResponse({
      res,
      data: exportData,
      msg: "Earnings data exported successfully",
    });
  }),

  // Admin: Get pending settlements
  getPendingSettlements: asyncHandler(async (req, res, next) => {
    const { page = 1, limit = 10 } = req.body;

    const result = await earningsService.getPendingSettlements(parseInt(page), parseInt(limit));
    
    return successResponse({
      res,
      data: result,
      msg: "Pending settlements retrieved successfully",
    });
  }),

  // Admin: Process settlement
  processSettlement: asyncHandler(async (req, res, next) => {
    const { transactionId, paymentMethod, referenceNumber, adminNotes } = req.body;

    if (!transactionId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        msg: "Transaction ID and payment method are required"
      });
    }

    const settlementData = {
      paymentMethod,
      referenceNumber,
      adminNotes
    };

    const updatedTransaction = await earningsService.processSettlement(transactionId, settlementData);
    
    return successResponse({
      res,
      data: updatedTransaction,
      msg: "Settlement processed successfully",
    });
  }),

  // Admin: Bulk settlement
  bulkSettlement: asyncHandler(async (req, res, next) => {
    const { transactionIds, paymentMethod, referenceNumber, adminNotes } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({
        success: false,
        msg: "Transaction IDs array is required"
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        msg: "Payment method is required"
      });
    }

    const settlementData = {
      paymentMethod,
      referenceNumber,
      adminNotes
    };

    const updatedTransactions = await earningsService.bulkSettlement(transactionIds, settlementData);
    
    return successResponse({
      res,
      data: updatedTransactions,
      msg: "Bulk settlement processed successfully",
    });
  }),

  // Create earnings transaction (called internally when payment is made)
  createEarningsTransaction: asyncHandler(async (req, res, next) => {
    const transactionData = req.body;

    // Validate required fields
    const requiredFields = ['expertId', 'amount', 'type', 'description', 'paymentDate'];
    const missingFields = requiredFields.filter(field => !transactionData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        msg: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    const transaction = await earningsService.createEarningsTransaction(transactionData);
    
    return successResponse({
      res,
      data: transaction,
      msg: "Earnings transaction created successfully",
    });
  }),

  // Update transaction status (admin function)
  updateTransactionStatus: asyncHandler(async (req, res, next) => {
    const { transactionId, updateData } = req.body;

    if (!transactionId || !updateData) {
      return res.status(400).json({
        success: false,
        msg: "Transaction ID and update data are required"
      });
    }

    const updatedTransaction = await earningsService.updateTransactionStatus(transactionId, updateData);
    
    return successResponse({
      res,
      data: updatedTransaction,
      msg: "Transaction status updated successfully",
    });
  })
};

module.exports = earningsCtrl; 