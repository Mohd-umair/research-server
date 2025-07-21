const EarningsTransaction = require("./earningsModel.js");
const DbService = require("../../Service/DbService.js");
const serviceHandler = require("../../Utils/serviceHandler.js");
const CustomError = require("../../Errors/CustomError.js");

const model = new DbService(EarningsTransaction);

const earningsService = {
  // Get earnings summary for a teacher
  getEarningsSummary: serviceHandler(async (expertId) => {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const endOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

    const [
      totalEarnings,
      settledEarnings,
      pendingEarnings,
      cancelledEarnings,
      thisMonthEarnings,
      lastMonthEarnings,
      totalTransactions,
      settledTransactions,
      pendingTransactions
    ] = await Promise.all([
      // Total earnings
      EarningsTransaction.aggregate([
        { $match: { expertId: expertId, status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      
      // Settled earnings
      EarningsTransaction.aggregate([
        { $match: { expertId: expertId, status: "settled" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      
      // Pending earnings
      EarningsTransaction.aggregate([
        { $match: { expertId: expertId, status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      
      // Cancelled earnings
      EarningsTransaction.aggregate([
        { $match: { expertId: expertId, status: "cancelled" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      
      // This month earnings
      EarningsTransaction.aggregate([
        { 
          $match: { 
            expertId: expertId, 
            status: { $ne: "cancelled" },
            paymentDate: { $gte: startOfMonth }
          } 
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      
      // Last month earnings
      EarningsTransaction.aggregate([
        { 
          $match: { 
            expertId: expertId, 
            status: { $ne: "cancelled" },
            paymentDate: { $gte: startOfLastMonth, $lte: endOfLastMonth }
          } 
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      
      // Total transactions count
      EarningsTransaction.countDocuments({ expertId: expertId, status: { $ne: "cancelled" } }),
      
      // Settled transactions count
      EarningsTransaction.countDocuments({ expertId: expertId, status: "settled" }),
      
      // Pending transactions count
      EarningsTransaction.countDocuments({ expertId: expertId, status: "pending" })
    ]);

    return {
      totalEarnings: totalEarnings[0]?.total || 0,
      settledEarnings: settledEarnings[0]?.total || 0,
      pendingEarnings: pendingEarnings[0]?.total || 0,
      cancelledEarnings: cancelledEarnings[0]?.total || 0,
      thisMonthEarnings: thisMonthEarnings[0]?.total || 0,
      lastMonthEarnings: lastMonthEarnings[0]?.total || 0,
      totalTransactions: totalTransactions,
      settledTransactions: settledTransactions,
      pendingTransactions: pendingTransactions
    };
  }),

  // Get transactions with filtering and pagination
  getTransactions: serviceHandler(async (expertId, filters = {}, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    
    // Build match conditions
    const matchConditions = { expertId: expertId };
    
    if (filters.status) {
      matchConditions.status = filters.status;
    }
    
    if (filters.type) {
      matchConditions.type = filters.type;
    }
    
    if (filters.search) {
      matchConditions.$or = [
        { description: { $regex: filters.search, $options: 'i' } },
        { 'consultancy.title': { $regex: filters.search, $options: 'i' } },
        { 'collaboration.title': { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    if (filters.startDate && filters.endDate) {
      matchConditions.paymentDate = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    const [transactions, total] = await Promise.all([
      EarningsTransaction.find(matchConditions)
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      
      EarningsTransaction.countDocuments(matchConditions)
    ]);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }),

  // Get specific transaction
  getTransactionById: serviceHandler(async (transactionId, expertId) => {
    const transaction = await EarningsTransaction.findOne({
      _id: transactionId,
      expertId: expertId
    }).lean();

    if (!transaction) {
      throw new CustomError(404, "Transaction not found");
    }

    return transaction;
  }),

  // Get earnings by date range
  getEarningsByRange: serviceHandler(async (expertId, startDate, endDate) => {
    const earnings = await EarningsTransaction.aggregate([
      {
        $match: {
          expertId: expertId,
          status: { $ne: "cancelled" },
          paymentDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" }
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return earnings;
  }),

  // Get monthly earnings for a year
  getMonthlyEarnings: serviceHandler(async (expertId, year) => {
    const earnings = await EarningsTransaction.aggregate([
      {
        $match: {
          expertId: expertId,
          status: { $ne: "cancelled" },
          paymentDate: {
            $gte: new Date(year, 0, 1),
            $lt: new Date(year + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$paymentDate" }
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return earnings;
  }),

  // Request settlement for pending transactions
  requestSettlement: serviceHandler(async (expertId, transactionIds) => {
    const transactions = await EarningsTransaction.find({
      _id: { $in: transactionIds },
      expertId: expertId,
      status: "pending"
    });

    if (transactions.length !== transactionIds.length) {
      throw new CustomError(400, "Some transactions not found or not eligible for settlement");
    }

    const updatePromises = transactions.map(transaction =>
      EarningsTransaction.findByIdAndUpdate(
        transaction._id,
        {
          settlementRequested: true,
          settlementRequestDate: new Date()
        },
        { new: true }
      )
    );

    const updatedTransactions = await Promise.all(updatePromises);
    return updatedTransactions;
  }),

  // Get settlement history
  getSettlementHistory: serviceHandler(async (expertId, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    const [settlements, total] = await Promise.all([
      EarningsTransaction.find({
        expertId: expertId,
        status: "settled"
      })
        .sort({ settlementDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      
      EarningsTransaction.countDocuments({
        expertId: expertId,
        status: "settled"
      })
    ]);

    return {
      settlements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }),

  // Create earnings transaction (called when payment is made)
  createEarningsTransaction: serviceHandler(async (transactionData) => {
    const transaction = new EarningsTransaction(transactionData);
    const savedTransaction = await transaction.save();
    return savedTransaction;
  }),

  // Update transaction status (for admin settlement processing)
  updateTransactionStatus: serviceHandler(async (transactionId, updateData) => {
    const transaction = await EarningsTransaction.findByIdAndUpdate(
      transactionId,
      updateData,
      { new: true }
    );

    if (!transaction) {
      throw new CustomError(404, "Transaction not found");
    }

    return transaction;
  }),

  // Get pending settlements for admin
  getPendingSettlements: serviceHandler(async (page = 1, limit = 10) => {
    const skip = (page - 1) * limit;

    const [settlements, total] = await Promise.all([
      EarningsTransaction.find({
        status: "pending",
        settlementRequested: true
      })
        .populate('expertId', 'firstName lastName email')
        .sort({ settlementRequestDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      
      EarningsTransaction.countDocuments({
        status: "pending",
        settlementRequested: true
      })
    ]);

    return {
      settlements,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }),

  // Process settlement (admin function)
  processSettlement: serviceHandler(async (transactionId, settlementData) => {
    const transaction = await EarningsTransaction.findByIdAndUpdate(
      transactionId,
      {
        status: "settled",
        settlementDate: new Date(),
        paymentMethod: settlementData.paymentMethod,
        referenceNumber: settlementData.referenceNumber,
        adminNotes: settlementData.adminNotes
      },
      { new: true }
    );

    if (!transaction) {
      throw new CustomError(404, "Transaction not found");
    }

    return transaction;
  }),

  // Bulk settlement processing
  bulkSettlement: serviceHandler(async (transactionIds, settlementData) => {
    const transactions = await EarningsTransaction.find({
      _id: { $in: transactionIds },
      status: "pending"
    });

    if (transactions.length !== transactionIds.length) {
      throw new CustomError(400, "Some transactions not found or not eligible for settlement");
    }

    const updatePromises = transactions.map(transaction =>
      EarningsTransaction.findByIdAndUpdate(
        transaction._id,
        {
          status: "settled",
          settlementDate: new Date(),
          paymentMethod: settlementData.paymentMethod,
          referenceNumber: settlementData.referenceNumber,
          adminNotes: settlementData.adminNotes
        },
        { new: true }
      )
    );

    const updatedTransactions = await Promise.all(updatePromises);
    return updatedTransactions;
  })
};

module.exports = earningsService; 