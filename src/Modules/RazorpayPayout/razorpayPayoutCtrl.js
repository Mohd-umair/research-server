const razorpayPayoutService = require("./razorpayPayoutService");
const asyncHandler = require("../../Utils/asyncHandler");

const createContact = asyncHandler(async (req, res) => {
  console.log("Razorpay Payout Controller: Creating contact");
  try {
    const { name, email, contact, type, reference_id, notes } = req.body;
    const userId = req.user.id;

    const contactData = {
      name,
      email,
      contact,
      type: type || 'vendor',
      reference_id: reference_id || `user_${userId}_${Date.now()}`,
      notes: notes || {}
    };

    const result = await razorpayPayoutService.createContact(contactData);

    res.status(200).json({
      success: true,
      message: "Contact created successfully",
      data: result
    });
  } catch (error) {
    console.error("Razorpay Payout Controller: Error creating contact:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create contact"
    });
  }
});

const createFundAccount = asyncHandler(async (req, res) => {
  console.log("Razorpay Payout Controller: Creating fund account");
  try {
    const { contact_id, account_type, bank_account, vpa, card } = req.body;

    const fundAccountData = {
      contact_id,
      account_type,
      bank_account,
      vpa,
      card
    };

    const result = await razorpayPayoutService.createFundAccount(fundAccountData);

    res.status(200).json({
      success: true,
      message: "Fund account created successfully",
      data: result
    });
  } catch (error) {
    console.error("Razorpay Payout Controller: Error creating fund account:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create fund account"
    });
  }
});

const createPayoutProfile = asyncHandler(async (req, res) => {
  console.log("Razorpay Payout Controller: Creating complete payout profile");
  try {
    const { contact, fundAccount } = req.body;
    
    // Validate user authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication required"
      });
    }
    
    const userId = req.user.id;

    // Validate required data
    if (!contact || !fundAccount) {
      return res.status(400).json({
        success: false,
        message: "Contact and fund account data are required"
      });
    }

    const profileData = {
      contact,
      fundAccount,
      userId
    };

    const result = await razorpayPayoutService.createPayoutProfile(profileData);

    // Check if result is valid
    if (!result) {
      return res.status(500).json({
        success: false,
        message: "Failed to create payout profile - no result returned"
      });
    }

    // Handle case where Razorpay is not available
    if (result.message && result.message.includes("Razorpay SDK not available")) {
      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          contactId: result.contactId,
          fundAccountId: result.fundAccountId,
          isActive: result.isActive,
          message: result.message
        }
      });
    }

    res.status(200).json({
      success: true,
      message: "Payout profile created successfully",
      data: result
    });
  } catch (error) {
    console.error("Razorpay Payout Controller: Error creating payout profile:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create payout profile"
    });
  }
});

const getPayoutProfileStatus = asyncHandler(async (req, res) => {
  console.log("Razorpay Payout Controller: Getting payout profile status");
  try {
    // Validate user authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication required"
      });
    }
    
    const userId = req.user.id;

    const result = await razorpayPayoutService.getPayoutProfileStatus({ userId });

    // Check if result is valid
    if (!result) {
      return res.status(500).json({
        success: false,
        message: "Failed to get payout profile status - no result returned"
      });
    }

    res.status(200).json({
      success: true,
      message: "Payout profile status retrieved successfully",
      data: result
    });
  } catch (error) {
    console.error("Razorpay Payout Controller: Error getting payout profile status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get payout profile status"
    });
  }
});

const updatePayoutProfile = asyncHandler(async (req, res) => {
  console.log("Razorpay Payout Controller: Updating payout profile");
  try {
    const { contact, fundAccount } = req.body;
    
    // Validate user authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication required"
      });
    }
    
    const userId = req.user.id;

    const profileData = {
      userId,
      contact,
      fundAccount
    };

    const result = await razorpayPayoutService.updatePayoutProfile(profileData);

    // Check if result is valid
    if (!result) {
      return res.status(500).json({
        success: false,
        message: "Failed to update payout profile - no result returned"
      });
    }

    // Handle case where Razorpay is not available
    if (result.message && result.message.includes("Razorpay SDK not available")) {
      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    }

    res.status(200).json({
      success: true,
      message: "Payout profile updated successfully",
      data: result
    });
  } catch (error) {
    console.error("Razorpay Payout Controller: Error updating payout profile:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update payout profile"
    });
  }
});

const deactivatePayoutProfile = asyncHandler(async (req, res) => {
  console.log("Razorpay Payout Controller: Deactivating payout profile");
  try {
    // Validate user authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User authentication required"
      });
    }
    
    const userId = req.user.id;

    const result = await razorpayPayoutService.deactivatePayoutProfile({ userId });

    // Check if result is valid
    if (!result) {
      return res.status(500).json({
        success: false,
        message: "Failed to deactivate payout profile - no result returned"
      });
    }

    res.status(200).json({
      success: true,
      message: "Payout profile deactivated successfully",
      data: result
    });
  } catch (error) {
    console.error("Razorpay Payout Controller: Error deactivating payout profile:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to deactivate payout profile"
    });
  }
});

const validateBankAccount = asyncHandler(async (req, res) => {
  console.log("Razorpay Payout Controller: Validating bank account");
  try {
    const { accountNumber, ifscCode, accountHolderName } = req.body;

    // Validate required fields
    if (!accountNumber || !ifscCode || !accountHolderName) {
      return res.status(400).json({
        success: false,
        message: "Account number, IFSC code, and account holder name are required"
      });
    }

    const bankDetails = {
      accountNumber,
      ifscCode,
      accountHolderName
    };

    const result = await razorpayPayoutService.validateBankAccount(bankDetails);

    // Check if result is valid
    if (!result) {
      return res.status(500).json({
        success: false,
        message: "Failed to validate bank account - no result returned"
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error("Razorpay Payout Controller: Error validating bank account:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to validate bank account"
    });
  }
});

module.exports = {
  createContact,
  createFundAccount,
  createPayoutProfile,
  getPayoutProfileStatus,
  updatePayoutProfile,
  deactivatePayoutProfile,
  validateBankAccount
}; 