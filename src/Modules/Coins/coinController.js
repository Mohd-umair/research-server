const CoinService = require('./coinService');

const CoinController = {
  /**
   * Get user's coin balance
   */
  getUserCoins: async (req, res) => {
    try {
      console.log('🪙 getUserCoins - Request received');
      console.log('🪙 getUserCoins - req.user:', req.user);
      console.log('🪙 getUserCoins - req.decodedUser:', req.decodedUser);
      
      // Try to get user info from either req.user or req.decodedUser
      const userInfo = req.user || req.decodedUser;
      
      if (!userInfo) {
        console.error('❌ getUserCoins - No user info found');
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }
      
      const userId = userInfo.id || userInfo._id;
      const userType = (userInfo.userType || 'user').toLowerCase(); // 'user' -> 'student', 'expert' -> 'expert'
      
      console.log('🪙 getUserCoins - userId:', userId);
      console.log('🪙 getUserCoins - userType:', userType);
      
      const result = await CoinService.getUserCoins({
        userId,
        userType: userType === 'user' ? 'student' : 'expert'
      });
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Coin balance retrieved successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error getting user coins:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  /**
   * Check if user can create a request (has enough coins)
   */
  checkRequestCreationBalance: async (req, res) => {
    try {
      console.log('🪙 checkRequestCreationBalance - Request received');
      console.log('🪙 checkRequestCreationBalance - req.user:', req.user);
      console.log('🪙 checkRequestCreationBalance - req.decodedUser:', req.decodedUser);
      
      // Try to get user info from either req.user or req.decodedUser
      const userInfo = req.user || req.decodedUser;
      
      if (!userInfo) {
        console.error('❌ checkRequestCreationBalance - No user info found');
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }
      
      const userId = userInfo.id || userInfo._id;
      const userType = (userInfo.userType || 'user').toLowerCase();
      
      console.log('🪙 checkRequestCreationBalance - userId:', userId);
      console.log('🪙 checkRequestCreationBalance - userType:', userType);
      
      const result = await CoinService.getRequestCreationBalance({
        userId,
        userType: userType === 'user' ? 'student' : 'expert'
      });
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Balance check completed',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error checking request creation balance:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  /**
   * Process request creation (deduct coins)
   */
  processRequestCreation: async (req, res) => {
    try {
      console.log('🪙 processRequestCreation - Request received');
      console.log('🪙 processRequestCreation - req.user:', req.user);
      console.log('🪙 processRequestCreation - req.decodedUser:', req.decodedUser);
      
      // Try to get user info from either req.user or req.decodedUser
      const userInfo = req.user || req.decodedUser;
      
      if (!userInfo) {
        console.error('❌ processRequestCreation - No user info found');
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }
      
      const userId = userInfo.id || userInfo._id;
      const userType = (userInfo.userType || 'user').toLowerCase();
      
      console.log('🪙 processRequestCreation - userId:', userId);
      console.log('🪙 processRequestCreation - userType:', userType);
      
      const result = await CoinService.processRequestCreation({
        userId,
        userType: userType === 'user' ? 'student' : 'expert'
      });
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Request creation processed successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error processing request creation:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  /**
   * Process request fulfillment (add coins to fulfiller)
   */
  processRequestFulfillment: async (req, res) => {
    try {
      const { fulfillerId, fulfillerType } = req.body;
      
      if (!fulfillerId || !fulfillerType) {
        return res.status(400).json({
          success: false,
          message: 'Fulfiller ID and type are required'
        });
      }
      
      const result = await CoinService.processRequestFulfillment({
        fulfillerId,
        fulfillerType: fulfillerType === 'user' ? 'student' : 'expert'
      });
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Request fulfillment processed successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error processing request fulfillment:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  /**
   * Add coins to user (admin function)
   */
  addCoins: async (req, res) => {
    try {
      const { userId, userType, amount } = req.body;
      
      if (!userId || !userType || !amount) {
        return res.status(400).json({
          success: false,
          message: 'User ID, user type, and amount are required'
        });
      }
      
      const result = await CoinService.addCoins({
        userId,
        userType: userType === 'user' ? 'student' : 'expert',
        amount: parseInt(amount)
      });
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Coins added successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error adding coins:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  /**
   * Deduct coins from user (admin function)
   */
  deductCoins: async (req, res) => {
    try {
      const { userId, userType, amount } = req.body;
      
      if (!userId || !userType || !amount) {
        return res.status(400).json({
          success: false,
          message: 'User ID, user type, and amount are required'
        });
      }
      
      const result = await CoinService.deductCoins({
        userId,
        userType: userType === 'user' ? 'student' : 'expert',
        amount: parseInt(amount)
      });
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Coins deducted successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error deducting coins:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
};

module.exports = CoinController;
