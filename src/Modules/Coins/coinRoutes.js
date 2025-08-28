const express = require('express');
const router = express.Router();
const CoinController = require('./coinController');
const { verifyToken } = require('../../Utils/utils');

// All routes require authentication
router.use(verifyToken);

// Get user's coin balance
router.get('/balance', CoinController.getUserCoins);

// Check if user can create a request (has enough coins)
router.get('/check-request-creation', CoinController.checkRequestCreationBalance);

// Process request creation (deduct coins)
router.post('/process-request-creation', CoinController.processRequestCreation);

// Process request fulfillment (add coins to fulfiller)
router.post('/process-request-fulfillment', CoinController.processRequestFulfillment);

// Admin routes (for managing coins)
router.post('/add', CoinController.addCoins);
router.post('/deduct', CoinController.deductCoins);

module.exports = router;
