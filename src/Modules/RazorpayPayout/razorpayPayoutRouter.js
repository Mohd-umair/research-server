const express = require("express");
const router = express.Router();
const verifyToken = require("../../Utils/utils").verifyToken;
const {
  createContact,
  createFundAccount,
  createPayoutProfile,
  getPayoutProfileStatus,
  updatePayoutProfile,
  deactivatePayoutProfile,
  validateBankAccount
} = require("./razorpayPayoutCtrl");

// Contact management
router.post("/create-contact", verifyToken, createContact);

// Fund account management
router.post("/create-fund-account", verifyToken, createFundAccount);

// Complete payout profile management
router.post("/create-payout-profile", verifyToken, createPayoutProfile);
router.get("/payout-profile-status", verifyToken, getPayoutProfileStatus);
router.put("/update-payout-profile", verifyToken, updatePayoutProfile);
router.delete("/deactivate-payout-profile", verifyToken, deactivatePayoutProfile);

// Bank account validation
router.post("/validate-bank-account", verifyToken, validateBankAccount);

module.exports = router; 