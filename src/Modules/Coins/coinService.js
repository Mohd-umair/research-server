const CoinModel = require('./coinModel');

const CoinService = {
  /**
   * Get user's coin balance
   */
  getUserCoins: async (data) => {
    const { userId, userType } = data;
    
    // Determine user model based on userType
    const userModel = userType === 'student' ? 'Student' : 'Profile';
    
    let coinRecord = await CoinModel.findOne({ user: userId, userModel });
    
    // If no coin record exists, create one with default coins
    if (!coinRecord) {
      coinRecord = await CoinModel.create({
        user: userId,
        userModel,
        coins: 100 // Default 100 coins
      });
    }
    
    return {
      success: true,
      data: {
        userId,
        userType,
        coins: coinRecord.coins,
        lastUpdated: coinRecord.lastUpdated
      }
    };
  },

  /**
   * Deduct coins from user account
   */
  deductCoins: async (data) => {
    const { userId, userType, amount } = data;
    
    // Determine user model based on userType
    const userModel = userType === 'student' ? 'Student' : 'Profile';
    
    let coinRecord = await CoinModel.findOne({ user: userId, userModel });
    
    // If no coin record exists, create one with default coins
    if (!coinRecord) {
      coinRecord = await CoinModel.create({
        user: userId,
        userModel,
        coins: 100 // Default 100 coins
      });
    }
    
    // Check if user has enough coins
    if (!coinRecord.hasEnoughCoins(amount)) {
      return {
        success: false,
        message: `Insufficient coins. You have ${coinRecord.coins} coins but need ${amount} coins.`
      };
    }
    
    // Deduct coins
    const deducted = coinRecord.deductCoins(amount);
    if (!deducted) {
      return {
        success: false,
        message: 'Failed to deduct coins'
      };
    }
    
    await coinRecord.save();
    
    return {
      success: true,
      data: {
        userId,
        userType,
        coinsDeducted: amount,
        remainingCoins: coinRecord.coins,
        message: `Successfully deducted ${amount} coins. Remaining balance: ${coinRecord.coins} coins.`
      }
    };
  },

  /**
   * Add coins to user account
   */
  addCoins: async (data) => {
    const { userId, userType, amount } = data;
    
    console.log('🪙 CoinService.addCoins called with:', {
      userId,
      userType,
      amount
    });
    
    // Determine user model based on userType
    const userModel = userType === 'student' ? 'Student' : 'Profile';
    
    console.log('🪙 CoinService.addCoins - userModel determined:', userModel);
    
    let coinRecord = await CoinModel.findOne({ user: userId, userModel });
    
    console.log('🪙 CoinService.addCoins - existing coin record:', coinRecord ? 'Found' : 'Not found');
    
    // If no coin record exists, create one
    if (!coinRecord) {
      console.log('🪙 CoinService.addCoins - creating new coin record with 100 coins');
      coinRecord = await CoinModel.create({
        user: userId,
        userModel,
        coins: 100 // Start with 100 coins
      });
      console.log('🪙 CoinService.addCoins - new coin record created with balance:', coinRecord.coins);
    }
    
    console.log('🪙 CoinService.addCoins - current balance before adding:', coinRecord.coins);
    
    // Add coins
    coinRecord.addCoins(amount);
    await coinRecord.save();
    
    console.log('🪙 CoinService.addCoins - new balance after adding:', coinRecord.coins);
    
    const result = {
      success: true,
      data: {
        userId,
        userType,
        coinsAdded: amount,
        totalCoins: coinRecord.coins,
        message: `Successfully added ${amount} coins. Total balance: ${coinRecord.coins} coins.`
      }
    };
    
    console.log('🪙 CoinService.addCoins - returning result:', result);
    
    return result;
  },

  /**
   * Check if user has enough coins
   */
  checkCoinBalance: async (data) => {
    const { userId, userType, requiredAmount } = data;
    
    // Determine user model based on userType
    const userModel = userType === 'student' ? 'Student' : 'Profile';
    
    let coinRecord = await CoinModel.findOne({ user: userId, userModel });
    
    // If no coin record exists, create one with default coins
    if (!coinRecord) {
      coinRecord = await CoinModel.create({
        user: userId,
        userModel,
        coins: 100 // Default 100 coins
      });
    }
    
    const hasEnough = coinRecord.hasEnoughCoins(requiredAmount);
    
    return {
      success: true,
      data: {
        userId,
        userType,
        currentCoins: coinRecord.coins,
        requiredAmount,
        hasEnoughCoins: hasEnough,
        message: hasEnough 
          ? `You have enough coins (${coinRecord.coins} >= ${requiredAmount})`
          : `Insufficient coins. You have ${coinRecord.coins} but need ${requiredAmount}`
      }
    };
  },

  /**
   * Get coin balance for request creation (specifically for Document type requests)
   */
  getRequestCreationBalance: async (data) => {
    const { userId, userType } = data;
    const requestCost = 10; // Cost for creating a request
    
    // Determine user model based on userType
    const userModel = userType === 'student' ? 'Student' : 'Profile';
    
    let coinRecord = await CoinModel.findOne({ user: userId, userModel });
    
    // If no coin record exists, create one with default coins
    if (!coinRecord) {
      coinRecord = await CoinModel.create({
        user: userId,
        userModel,
        coins: 100 // Default 100 coins
      });
    }
    
    const canCreateRequest = coinRecord.hasEnoughCoins(requestCost);
    
    return {
      success: true,
      data: {
        userId,
        userType,
        currentCoins: coinRecord.coins,
        requestCost,
        canCreateRequest,
        message: canCreateRequest 
          ? `You can create a request. Cost: ${requestCost} coins, Balance: ${coinRecord.coins} coins`
          : `Cannot create request. You need ${requestCost} coins but have ${coinRecord.coins} coins`
      }
    };
  },

  /**
   * Process request creation (deduct coins)
   */
  processRequestCreation: async (data) => {
    const { userId, userType } = data;
    const requestCost = 10; // Cost for creating a request
    
    return await CoinService.deductCoins({
      userId,
      userType,
      amount: requestCost
    });
  },

  /**
   * Process request fulfillment (add coins to fulfiller)
   */
  processRequestFulfillment: async (data) => {
    const { fulfillerId, fulfillerType } = data;
    const fulfillmentReward = 10; // Reward for fulfilling a request
    
    console.log('🪙 CoinService.processRequestFulfillment called with:', {
      fulfillerId,
      fulfillerType,
      fulfillmentReward
    });
    
    const result = await CoinService.addCoins({
      userId: fulfillerId,
      userType: fulfillerType,
      amount: fulfillmentReward
    });
    
    console.log('🪙 CoinService.processRequestFulfillment result:', result);
    
    return result;
  },

  /**
   * Get all coin balances with pagination and search (admin only)
   */
  getAllCoinBalances: async (data) => {
    const { page = 1, limit = 10, searchQuery = '', userType = 'all' } = data;
    
    const skip = (page - 1) * limit;
    
    // Build match conditions
    const matchConditions = {};
    if (userType !== 'all') {
      matchConditions.userModel = userType === 'student' ? 'Student' : 'Profile';
    }
    
    // Build lookup conditions for user details
    const lookupConditions = [];
    if (userType === 'all' || userType === 'student') {
      lookupConditions.push({
        $lookup: {
          from: 'students',
          localField: 'user',
          foreignField: '_id',
          as: 'studentDetails'
        }
      });
    }
    if (userType === 'all' || userType === 'expert') {
      lookupConditions.push({
        $lookup: {
          from: 'profiles',
          localField: 'user',
          foreignField: '_id',
          as: 'profileDetails'
        }
      });
    }
    
    // Build aggregation pipeline
    const pipeline = [
      { $match: matchConditions },
      ...lookupConditions,
      {
        $addFields: {
          userDetails: {
            $cond: {
              if: { $eq: ['$userModel', 'Student'] },
              then: { $arrayElemAt: ['$studentDetails', 0] },
              else: { $arrayElemAt: ['$profileDetails', 0] }
            }
          }
        }
      },
      {
        $project: {
          userId: '$user',
          userType: {
            $cond: {
              if: { $eq: ['$userModel', 'Student'] },
              then: 'student',
              else: 'expert'
            }
          },
          coins: 1,
          lastUpdated: 1,
          userName: {
            $cond: {
              if: { $eq: ['$userModel', 'Student'] },
              then: { $concat: ['$userDetails.firstName', ' ', '$userDetails.lastName'] },
              else: '$userDetails.name'
            }
          },
          userEmail: '$userDetails.email'
        }
      }
    ];
    
    // Add search filter if provided
    if (searchQuery) {
      pipeline.unshift({
        $match: {
          $or: [
            { 'userDetails.firstName': { $regex: searchQuery, $options: 'i' } },
            { 'userDetails.lastName': { $regex: searchQuery, $options: 'i' } },
            { 'userDetails.name': { $regex: searchQuery, $options: 'i' } },
            { 'userDetails.email': { $regex: searchQuery, $options: 'i' } }
          ]
        }
      });
    }
    
    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await CoinModel.aggregate(countPipeline);
    const totalCount = countResult.length > 0 ? countResult[0].total : 0;
    
    // Get paginated results
    const resultsPipeline = [
      ...pipeline,
      { $sort: { lastUpdated: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];
    
    const balances = await CoinModel.aggregate(resultsPipeline);
    
    return {
      success: true,
      data: {
        balances,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  },

  /**
   * Get coin statistics (admin only)
   */
  getCoinStatistics: async () => {
    const stats = await CoinModel.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalCoins: { $sum: '$coins' },
          averageCoins: { $avg: '$coins' },
          minCoins: { $min: '$coins' },
          maxCoins: { $max: '$coins' }
        }
      }
    ]);
    
    const userTypeStats = await CoinModel.aggregate([
      {
        $group: {
          _id: '$userModel',
          count: { $sum: 1 },
          totalCoins: { $sum: '$coins' },
          averageCoins: { $avg: '$coins' }
        }
      }
    ]);
    
    const lowBalanceUsers = await CoinModel.countDocuments({ coins: { $lt: 50 } });
    const criticalBalanceUsers = await CoinModel.countDocuments({ coins: { $lt: 10 } });
    
    return {
      success: true,
      data: {
        overview: stats[0] || {
          totalUsers: 0,
          totalCoins: 0,
          averageCoins: 0,
          minCoins: 0,
          maxCoins: 0
        },
        byUserType: userTypeStats,
        lowBalanceUsers,
        criticalBalanceUsers
      }
    };
  }
};

module.exports = CoinService;
