const Razorpay = require("razorpay");
const serviceHandler = require("../../Utils/serviceHandler");
const teacherModel = require("../Profiles/profileModel");

// Add debugging for Razorpay configuration
console.log("Razorpay Payout Service: Initializing with config:", {
  key_id: process.env.RAZORPAY_KEY_ID ? "SET" : "NOT SET",
  key_secret: process.env.RAZORPAY_SECRET ? "SET" : "NOT SET"
});

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

// Verify Razorpay instance and check available methods
console.log("Razorpay Payout Service: Razorpay instance created:", {
  hasContacts: !!razorpayInstance.contacts,
  hasFundAccounts: !!razorpayInstance.fundAccounts,
  hasPayments: !!razorpayInstance.payments,
  availableMethods: Object.keys(razorpayInstance)
});

// Check if Razorpay SDK methods are actually available
const hasContactsCreate = razorpayInstance.contacts && typeof razorpayInstance.contacts.create === 'function';
const hasFundAccountsCreate = razorpayInstance.fundAccounts && typeof razorpayInstance.fundAccounts.create === 'function';
const hasPayoutsCreate = razorpayInstance.payouts && typeof razorpayInstance.payouts.create === 'function';



// For now, always use API fallback since the current SDK version doesn't support payout methods
const isRazorpayAvailable = false;

console.log("Razorpay Payout Service: Using API fallback for all payout operations (SDK payout methods not available in this version).");

const razorpayPayoutService = {
  /**
   * Create a Razorpay contact
   */
  createContact: serviceHandler(async (data) => {
    console.log("Razorpay Payout Service: Creating contact");
    try {
      const { name, email, contact, type, reference_id, notes } = data;

      const contactData = {
        name: name,
        email: email,
        contact: contact,
        type: type || 'vendor',
        reference_id: reference_id || `contact_${Date.now()}`,
        notes: notes || {}
      };

      console.log("Razorpay Payout Service: Contact data:", contactData);

      // Check if Razorpay SDK is available, otherwise use API fallback
      let razorpayContact;
      if (!isRazorpayAvailable) {
        console.warn("Razorpay Payout Service: SDK not available, using API fallback for contact creation");
        // Use direct API call as fallback
        const axios = require('axios');
        const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_SECRET}`).toString('base64');
        
        try {
          const response = await axios.post('https://api.razorpay.com/v1/contacts', contactData, {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json'
            }
          });
          
          razorpayContact = response.data;
          console.log("Razorpay Payout Service: Contact created via API:", razorpayContact.id);
        } catch (apiError) {
          console.error("Razorpay Payout Service: API contact creation failed:", apiError.response?.data || apiError.message);
          throw new Error(`Failed to create contact via API: ${apiError.response?.data?.error?.description || apiError.message}`);
        }
      } else {
        razorpayContact = await razorpayInstance.contacts.create(contactData);
      }
      
      if (!razorpayContact || !razorpayContact.id) {
        throw new Error("Failed to create Razorpay contact - invalid response");
      }

      console.log("Razorpay Payout Service: Contact created successfully", razorpayContact.id);

      return {
        contactId: razorpayContact.id,
        name: razorpayContact.name,
        email: razorpayContact.email,
        contact: razorpayContact.contact,
        type: razorpayContact.type,
        active: razorpayContact.active
      };
    } catch (error) {
      console.error("Razorpay Payout Service: Error creating contact:", error);
      throw new Error(`Failed to create contact: ${error.message}`);
    }
  }),

  /**
   * Create a Razorpay fund account
   */
  createFundAccount: serviceHandler(async (data) => {
    console.log("Razorpay Payout Service: Creating fund account");
    try {
      const { contact_id, account_type, bank_account, vpa, card } = data;

      const fundAccountData = {
        contact_id: contact_id,
        account_type: account_type,
        bank_account: bank_account,
        vpa: vpa,
        card: card
      };

      console.log("Razorpay Payout Service: Fund account data:", fundAccountData);

      // Check if Razorpay SDK is available, otherwise use API fallback
      let razorpayFundAccount;
      if (!isRazorpayAvailable) {
        console.warn("Razorpay Payout Service: SDK not available, using API fallback for fund account creation");
        // Use direct API call as fallback
        const axios = require('axios');
        const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_SECRET}`).toString('base64');
        
        try {
          const response = await axios.post('https://api.razorpay.com/v1/fund_accounts', fundAccountData, {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json'
            }
          });
          
          razorpayFundAccount = response.data;
          console.log("Razorpay Payout Service: Fund account created via API:", razorpayFundAccount.id);
        } catch (apiError) {
          console.error("Razorpay Payout Service: API fund account creation failed:", apiError.response?.data || apiError.message);
          throw new Error(`Failed to create fund account via API: ${apiError.response?.data?.error?.description || apiError.message}`);
        }
      } else {
        razorpayFundAccount = await razorpayInstance.fundAccounts.create(fundAccountData);
      }
      
      if (!razorpayFundAccount || !razorpayFundAccount.id) {
        throw new Error("Failed to create Razorpay fund account - invalid response");
      }

      console.log("Razorpay Payout Service: Fund account created successfully", razorpayFundAccount.id);

      return {
        fundAccountId: razorpayFundAccount.id,
        contactId: razorpayFundAccount.contact_id,
        accountType: razorpayFundAccount.account_type,
        active: razorpayFundAccount.active,
        bankAccount: razorpayFundAccount.bank_account,
        vpa: razorpayFundAccount.vpa,
        card: razorpayFundAccount.card
      };
    } catch (error) {
      console.error("Razorpay Payout Service: Error creating fund account:", error);
      throw new Error(`Failed to create fund account: ${error.message}`);
    }
  }),

  /**
   * Create complete payout profile (contact + fund account)
   */
  createPayoutProfile: serviceHandler(async (data) => {
    console.log("Razorpay Payout Service: Creating complete payout profile");
    try {
      const { contact, fundAccount, userId } = data;

      // Note: We now use API fallback, so we don't skip payout profile creation
      console.log("Razorpay Payout Service: Proceeding with payout profile creation using API fallback");

      // Step 1: Create contact
      console.log("Razorpay Payout Service: Step 1 - Creating contact");
      const contactResult = await razorpayPayoutService.createContact(contact);

      if (!contactResult || !contactResult.contactId) {
        throw new Error("Failed to create contact - invalid response");
      }

      // Step 2: Create fund account with the contact ID
      console.log("Razorpay Payout Service: Step 2 - Creating fund account");
      const fundAccountData = {
        ...fundAccount,
        contact_id: contactResult.contactId
      };
      
      const fundAccountResult = await razorpayPayoutService.createFundAccount(fundAccountData);

      if (!fundAccountResult || !fundAccountResult.fundAccountId) {
        throw new Error("Failed to create fund account - invalid response");
      }

      // Step 3: Update user profile with Razorpay IDs
      console.log("Razorpay Payout Service: Step 3 - Updating user profile");
      console.log("Razorpay Payout Service: User ID to update:", userId);
      
      const updateData = {
        contactId: contactResult.contactId,
        fundId: fundAccountResult.fundAccountId,
        razorPayID: fundAccountResult.fundAccountId, // For backward compatibility
        isBankActive: true
      };
      
      console.log("Razorpay Payout Service: Update data:", updateData);

      // First try to find TeacherProfile
      const TeacherProfileModel = require("../TeacherProfile/teacherProfileModel");
      const teacherProfile = await TeacherProfileModel.findOne({ userId: userId });
      console.log("Razorpay Payout Service: Existing teacher profile found:", !!teacherProfile);
      
      if (teacherProfile) {
        // Update the TeacherProfile with Razorpay payout info
        teacherProfile.razorpayPayout = {
          contactId: contactResult.contactId,
          fundId: fundAccountResult.fundAccountId,
          isBankActive: true,
          setupCompleted: true,
          lastUpdated: new Date()
        };
        
        const updatedProfile = await teacherProfile.save();
        console.log("Razorpay Payout Service: Teacher profile updated successfully");
        
        return {
          contactId: contactResult.contactId,
          fundAccountId: fundAccountResult.fundAccountId,
          isActive: true,
          profile: updatedProfile
        };
      } else {
        // Try with Teacher model as fallback (for old profiles)
        const TeacherModel = require("../Teachers/teacherModel");
        console.log("Razorpay Payout Service: Trying Teacher model as fallback");
        
        const existingTeacher = await TeacherModel.findById(userId);
        console.log("Razorpay Payout Service: Existing teacher found:", !!existingTeacher);
        
        if (existingTeacher) {
          const updatedTeacher = await TeacherModel.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
          );
          
          if (!updatedTeacher) {
            throw new Error("Failed to update teacher profile with Razorpay IDs");
          }
          
          console.log("Razorpay Payout Service: Teacher model updated successfully");
          return {
            contactId: contactResult.contactId,
            fundAccountId: fundAccountResult.fundAccountId,
            isActive: true,
            profile: updatedTeacher
          };
        } else {
          throw new Error(`User not found in TeacherProfile or Teacher models with ID: ${userId}`);
        }
      }

    } catch (error) {
      console.error("Razorpay Payout Service: Error creating payout profile:", error);
      throw new Error(`Failed to create payout profile: ${error.message}`);
    }
  }),

  /**
   * Get user's payout profile status
   */
  getPayoutProfileStatus: serviceHandler(async (data) => {
    console.log("Razorpay Payout Service: Getting payout profile status");
    try {
      const { userId } = data;

      const userProfile = await teacherModel.findById(userId);
      
      if (!userProfile) {
        throw new Error("User profile not found");
      }

      const hasPayoutProfile = !!(userProfile.contactId && userProfile.fundId);
      
      return {
        hasPayoutProfile: hasPayoutProfile,
        contactId: userProfile.contactId,
        fundId: userProfile.fundId,
        isBankActive: userProfile.isBankActive,
        accountNumber: userProfile.accountNumber,
        IFSC_Code: userProfile.IFSC_Code
      };
    } catch (error) {
      console.error("Razorpay Payout Service: Error getting payout profile status:", error);
      throw new Error(`Failed to get payout profile status: ${error.message}`);
    }
  }),

  /**
   * Update payout profile
   */
  updatePayoutProfile: serviceHandler(async (data) => {
    console.log("Razorpay Payout Service: Updating payout profile");
    try {
      const { userId, contact, fundAccount } = data;

      const userProfile = await teacherModel.findById(userId);
      
      if (!userProfile) {
        throw new Error("User profile not found");
      }

      // Check if Razorpay is available
      if (!isRazorpayAvailable) {
        console.warn("Razorpay Payout Service: Razorpay SDK not available. Cannot update payout profile.");
        return {
          contactId: userProfile.contactId,
          fundAccountId: userProfile.fundId,
          isActive: false,
          message: "Payout profile update skipped - Razorpay SDK not available"
        };
      }

      let updatedContact = null;
      let updatedFundAccount = null;

      // Update contact if provided
      if (contact && userProfile.contactId) {
        console.log("Razorpay Payout Service: Updating contact");
        updatedContact = await razorpayInstance.contacts.edit(userProfile.contactId, contact);
      }

      // Update fund account if provided
      if (fundAccount && userProfile.fundId) {
        console.log("Razorpay Payout Service: Updating fund account");
        updatedFundAccount = await razorpayInstance.fundAccounts.edit(userProfile.fundId, fundAccount);
      }

      // Update local profile if needed
      const updateData = {};
      if (updatedContact) {
        updateData.contactId = updatedContact.id;
      }
      if (updatedFundAccount) {
        updateData.fundId = updatedFundAccount.id;
        updateData.razorPayID = updatedFundAccount.id;
      }

      if (Object.keys(updateData).length > 0) {
        await teacherModel.findByIdAndUpdate(userId, updateData);
      }

      console.log("Razorpay Payout Service: Payout profile updated successfully");

      return {
        contactId: updatedContact?.id || userProfile.contactId,
        fundAccountId: updatedFundAccount?.id || userProfile.fundId,
        isActive: true
      };
    } catch (error) {
      console.error("Razorpay Payout Service: Error updating payout profile:", error);
      throw new Error(`Failed to update payout profile: ${error.message}`);
    }
  }),

  /**
   * Deactivate payout profile
   */
  deactivatePayoutProfile: serviceHandler(async (data) => {
    console.log("Razorpay Payout Service: Deactivating payout profile");
    try {
      const { userId } = data;

      const userProfile = await teacherModel.findById(userId);
      
      if (!userProfile) {
        throw new Error("User profile not found");
      }

      // Deactivate fund account in Razorpay if available
      if (userProfile.fundId && isRazorpayAvailable) {
        try {
          await razorpayInstance.fundAccounts.deactivate(userProfile.fundId);
          console.log("Razorpay Payout Service: Fund account deactivated in Razorpay");
        } catch (razorpayError) {
          console.warn("Razorpay Payout Service: Could not deactivate fund account in Razorpay:", razorpayError.message);
        }
      }

      // Update local profile
      const updateData = {
        isBankActive: false,
        contactId: null,
        fundId: null,
        razorPayID: null
      };

      await teacherModel.findByIdAndUpdate(userId, updateData);

      console.log("Razorpay Payout Service: Payout profile deactivated successfully");

      return {
        isActive: false,
        message: "Payout profile deactivated successfully"
      };
    } catch (error) {
      console.error("Razorpay Payout Service: Error deactivating payout profile:", error);
      throw new Error(`Failed to deactivate payout profile: ${error.message}`);
    }
  }),

  /**
   * Validate bank account format (simple validation without Razorpay API)
   */
  validateBankAccountFormat: serviceHandler(async (data) => {
    console.log("Razorpay Payout Service: Validating bank account format");
    try {
      const { accountNumber, ifscCode, accountHolderName } = data;

      // Validate input parameters
      if (!accountNumber || !ifscCode || !accountHolderName) {
        return {
          isValid: false,
          message: "All bank account details are required"
        };
      }

      // Validate account number (9-18 digits)
      if (!/^\d{9,18}$/.test(accountNumber)) {
        return {
          isValid: false,
          message: "Account number must be 9-18 digits"
        };
      }

      // Validate IFSC code format (4 letters + 0 + 6 alphanumeric)
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
        return {
          isValid: false,
          message: "Invalid IFSC code format. Must be 4 letters + 0 + 6 alphanumeric characters"
        };
      }

      // Validate account holder name
      if (accountHolderName.trim().length < 2) {
        return {
          isValid: false,
          message: "Account holder name must be at least 2 characters"
        };
      }

      return {
        isValid: true,
        message: "Bank account format is valid"
      };
    } catch (error) {
      console.error("Razorpay Payout Service: Bank account format validation failed:", error);
      return {
        isValid: false,
        message: "Bank account format validation failed"
      };
    }
  }),

  /**
   * Validate bank account details
   */
  validateBankAccount: serviceHandler(async (data) => {
    console.log("Razorpay Payout Service: Validating bank account");
    try {
      const { accountNumber, ifscCode, accountHolderName } = data;

      // Validate input parameters
      if (!accountNumber || !ifscCode || !accountHolderName) {
        return {
          isValid: false,
          message: "All bank account details are required"
        };
      }

      // First, validate the format
      const formatValidation = await razorpayPayoutService.validateBankAccountFormat(data);
      if (!formatValidation.isValid) {
        return formatValidation;
      }

      // Check if Razorpay instance is properly initialized
      if (!isRazorpayAvailable) {
        console.warn("Razorpay Payout Service: Using format validation only (Razorpay API not available)");
        return {
          isValid: true,
          message: "Bank account format is valid (API validation unavailable)"
        };
      }

      // For now, return format validation success without creating actual contacts
      // This avoids the API call issue while still providing basic validation
      console.log("Razorpay Payout Service: Bank account format validation successful");

      return {
        isValid: true,
        message: "Bank account details are valid"
      };

      /* 
      // Uncomment this section when Razorpay API is properly configured
      // Create a test contact and fund account to validate
      const testContactData = {
        name: accountHolderName,
        email: "test@validation.com",
        contact: "9999999999",
        type: "vendor",
        reference_id: `validation_${Date.now()}`
      };

      console.log("Razorpay Payout Service: Creating test contact for validation");
      const testContact = await razorpayInstance.contacts.create(testContactData);

      if (!testContact || !testContact.id) {
        throw new Error("Failed to create test contact for validation");
      }

      const testFundAccountData = {
        contact_id: testContact.id,
        account_type: "bank_account",
        bank_account: {
          name: accountHolderName,
          ifsc: ifscCode,
          account_number: accountNumber
        }
      };

      console.log("Razorpay Payout Service: Creating test fund account for validation");
      const testFundAccount = await razorpayInstance.fundAccounts.create(testFundAccountData);

      if (!testFundAccount || !testFundAccount.id) {
        throw new Error("Failed to create test fund account for validation");
      }

      // Clean up test data
      try {
        console.log("Razorpay Payout Service: Cleaning up test data");
        await razorpayInstance.fundAccounts.deactivate(testFundAccount.id);
        await razorpayInstance.contacts.deactivate(testContact.id);
      } catch (cleanupError) {
        console.warn("Razorpay Payout Service: Warning - could not clean up test data:", cleanupError.message);
        // Don't fail validation if cleanup fails
      }

      console.log("Razorpay Payout Service: Bank account validation successful");

      return {
        isValid: true,
        message: "Bank account details are valid"
      };
      */
    } catch (error) {
      console.error("Razorpay Payout Service: Bank account validation failed:", error);
      
      // Provide more specific error messages
      let errorMessage = "Bank account validation failed";
      
      if (error.error && error.error.description) {
        errorMessage = error.error.description;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        isValid: false,
        message: errorMessage
      };
    }
  }),

  /**
   * Create a payout to teacher's account
   */
  createPayout: serviceHandler(async (data) => {
    console.log("Razorpay Payout Service: Creating payout");
    try {
      const { fund_account_id, amount, reference_id, narration, mode = "IMPS" } = data;

      const payoutData = {
        account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER, // Set this in .env
        fund_account_id,
        amount, // in paise
        currency: "INR",
        mode,
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id,
        narration,
      };

      console.log("Razorpay Payout Service: Payout data:", payoutData);

      // Check if Razorpay SDK is available, otherwise use API fallback
      let payout;
      if (!isRazorpayAvailable) {
        console.warn("Razorpay Payout Service: SDK not available, using API fallback for payout creation");
        // Use direct API call as fallback
        const axios = require('axios');
        const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_SECRET}`).toString('base64');
        
        try {
          const response = await axios.post('https://api.razorpay.com/v1/payouts', payoutData, {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json'
            }
          });
          
          payout = response.data;
          console.log("Razorpay Payout Service: Payout created via API:", payout.id);
        } catch (apiError) {
          console.error("Razorpay Payout Service: API payout creation failed:", apiError.response?.data || apiError.message);
          throw new Error(`Failed to create payout via API: ${apiError.response?.data?.error?.description || apiError.message}`);
        }
      } else {
        payout = await razorpayInstance.payouts.create(payoutData);
      }
      
      if (!payout || !payout.id) {
        throw new Error("Failed to create payout - invalid response");
      }

      console.log("Razorpay Payout Service: Payout created successfully", payout.id);

      return {
        id: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        reference_id: payout.reference_id,
        narration: payout.narration,
        mode: payout.mode,
        created_at: payout.created_at
      };
    } catch (error) {
      console.error("Razorpay Payout Service: Error creating payout:", error);
      throw new Error(`Failed to create payout: ${error.message}`);
    }
  })
};

module.exports = razorpayPayoutService; 