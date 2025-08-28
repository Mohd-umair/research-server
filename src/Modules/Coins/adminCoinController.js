const CoinService = require('./coinService');
// Authentication is handled by the router middleware

const adminCoinController = {
  /**
   * Get all coin balances with pagination and search (admin only)
   */
  getAllCoinBalances: async (req, res) => {
    try {
      const { page = 1, limit = 10, searchQuery = '', userType = 'all' } = req.body;
      
      const result = await CoinService.getAllCoinBalances({
        page: parseInt(page),
        limit: parseInt(limit),
        searchQuery,
        userType
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Coin balances fetched successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error fetching coin balances:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  /**
   * Add coins to a user (admin only)
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
        userType,
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
   * Deduct coins from a user (admin only)
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
        userType,
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
  },

  /**
   * Get coin balance for a specific user (admin only)
   */
  getUserCoinBalance: async (req, res) => {
    try {
      const { userId, userType } = req.params;
      
      const result = await CoinService.getUserCoins({
        userId,
        userType
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Coin balance fetched successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error fetching user coin balance:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  },

  /**
   * Get coin statistics (admin only)
   */
  getCoinStatistics: async (req, res) => {
    try {
      const result = await CoinService.getCoinStatistics();

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Coin statistics fetched successfully',
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error fetching coin statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
};

module.exports = adminCoinController;
