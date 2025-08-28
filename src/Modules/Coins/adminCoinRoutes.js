const express = require('express');
const router = express.Router();
const adminCoinController = require('./adminCoinController');
const { verifyToken } = require('../../Utils/utils');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get all coin balances with pagination and search
router.post('/all-balances', adminCoinController.getAllCoinBalances);

// Add coins to a user
router.post('/add', adminCoinController.addCoins);

// Deduct coins from a user
router.post('/deduct', adminCoinController.deductCoins);

// Get coin balance for a specific user
router.get('/balance/:userId/:userType', adminCoinController.getUserCoinBalance);

// Get coin statistics
router.get('/statistics', adminCoinController.getCoinStatistics);

module.exports = router;
