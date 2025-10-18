const DatabaseService = require("../../Service/DbService");
const PaymentRequest = require("./paymentRequestModel");
const CustomError = require("../../Errors/CustomError");

// Ensure referenced models are registered
require("../Profiles/profileModel");
require("../Students/studentModel");
require("../Consultancy/ConsultancyModel");

const model = new DatabaseService(PaymentRequest);

const paymentRequestService = {
  create: async (data) => {
    const { consultancyId, teacherId, studentId, amount, consultancyTitle, studentName } = data;
    
    console.log('Creating payment request for consultancyId:', consultancyId);
    
    // Check if payment request already exists for this consultancy (only check pending/approved/processing requests)
    const query = { 
      consultancyId,
      status: { $in: ['pending', 'approved'] } // Only check active requests, not paid/rejected
    };
    console.log('query', query);
    
    const existingRequest = await model.getDocument(query);
    if (existingRequest) {
      console.log('Existing payment request found:', existingRequest._id, 'with status:', existingRequest.status);
      throw new CustomError(400, "Payment request already exists for this consultancy");
    }
    
    console.log('No existing payment request found, creating new one...');
    
    const paymentRequestData = {
      consultancyId,
      teacherId,
      studentId,
      amount,
      consultancyTitle,
      studentName,
      status: "pending"
    };
    
    const paymentRequest = await model.save(paymentRequestData);
    console.log('Payment request created successfully:', paymentRequest._id);
    
    return paymentRequest;
  },

  getAll: async (data) => {
    const { page = 1, limit = 10, status } = data;
    
    const query = {};
    if (status) {
      query.status = status;
    }
    
    const options = {
      sort: '-createdAt',
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      populate: [
        { path: "teacherId", select: "name email" },
        { path: "studentId", select: "firstName lastName email" },
        { path: "consultancyId", select: "type createdAt" },
        { path: "processedBy", select: "name email" }
      ]
    };
    
    const paymentRequests = await model.getAllDocuments(query, options);
    const totalCount = await model.model.countDocuments(query);
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    
    return {
      paymentRequests,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    };
  },

  getById: async (data) => {
    const { requestId } = data;
    
    const paymentRequest = await model.getDocumentById(
      { _id: requestId },
      [
        { path: "teacherId", select: "name email specialisation institute" },
        { path: "studentId", select: "firstName lastName email" },
        { path: "consultancyId", select: "type createdAt scheduledDate" },
        { path: "processedBy", select: "name email" }
      ]
    );
    
    if (!paymentRequest) {
      throw new CustomError(404, "Payment request not found");
    }
    
    return paymentRequest;
  },

  updateStatus: async (data) => {
    const { requestId, status, adminNotes, processedBy } = data;
    
    if (!["approved", "rejected", "paid"].includes(status)) {
      throw new CustomError(400, "Invalid status");
    }
    
    // Get the payment request to calculate commission
    const paymentRequest = await model.getDocumentById({ _id: requestId });
    if (!paymentRequest) {
      throw new CustomError(404, "Payment request not found");
    }
    
    // Calculate commission (15% of total amount)
    const commissionPercentage = 15;
    const adminCommission = Math.round((paymentRequest.amount * commissionPercentage) / 100);
    const teacherAmount = paymentRequest.amount - adminCommission;
    
    const updateData = {
      status,
      adminNotes: adminNotes || "",
      processedBy,
      processedAt: new Date(),
      adminCommission,
      teacherAmount,
      commissionPercentage
    };
    
    // If status is approved, initiate payout
    if (status === "approved") {
      updateData.payoutStatus = "processing";
    }
    
    const updatedRequest = await model.updateDocument(
      { _id: requestId },
      updateData,
      {
        new: true,
        populate: [
          { path: "teacherId", select: "name email contactId fundId isBankActive" },
          { path: "studentId", select: "firstName lastName email" },
          { path: "consultancyId", select: "type createdAt" },
          { path: "processedBy", select: "name email" }
        ]
      }
    );
    
    if (!updatedRequest) {
      throw new CustomError(404, "Payment request not found");
    }
    
    // If status is approved, initiate payout
    if (status === "approved") {
      try {
        await paymentRequestService.initiatePayout(requestId, {
          teacherAmount,
          adminCommission,
          consultancyTitle: paymentRequest.consultancyTitle
        });
      } catch (error) {
        console.error("Error initiating payout:", error);
        // Update payout status to failed
        await model.updateDocument(
          { _id: requestId },
          { 
            payoutStatus: "failed",
            payoutFailureReason: error.message,
            payoutProcessedAt: new Date()
          }
        );
      }
    }
    
    return updatedRequest;
  },

  // Get expert earnings from completed payment requests
  getExpertEarnings: async (data) => {
    const { expertId, page = 1, limit = 10, startDate, endDate } = data;
    
    console.log('Getting expert earnings for:', expertId);
    
    // Build query for completed payment requests
    const query = {
      teacherId: expertId,
      payoutStatus: 'completed'
    };
    
    // Add date range filter if provided
    if (startDate || endDate) {
      query.processedAt = {};
      if (startDate) {
        query.processedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.processedAt.$lte = new Date(endDate);
      }
    }
    
    const options = {
      sort: '-processedAt',
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      populate: [
        { path: "studentId", select: "firstName lastName email" },
        { path: "consultancyId", select: "type createdAt" },
        { path: "processedBy", select: "name email" }
      ]
    };
    
    const earnings = await model.getAllDocuments(query, options);
    const totalCount = await model.model.countDocuments(query);
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    
    // Calculate summary inline
    const completedRequests = await model.getAllDocuments({
      teacherId: expertId,
      payoutStatus: 'completed'
    });
    
    const totalEarnings = completedRequests.reduce((sum, req) => sum + (req.teacherAmount || 0), 0);
    
    // Calculate this month earnings
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const thisMonthEarnings = completedRequests
      .filter(req => new Date(req.processedAt) >= thisMonth)
      .reduce((sum, req) => sum + (req.teacherAmount || 0), 0);
    
    // Calculate last month earnings
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);
    lastMonth.setHours(0, 0, 0, 0);
    
    const lastMonthEnd = new Date();
    lastMonthEnd.setDate(0);
    lastMonthEnd.setHours(23, 59, 59, 999);
    
    const lastMonthEarnings = completedRequests
      .filter(req => new Date(req.processedAt) >= lastMonth && new Date(req.processedAt) <= lastMonthEnd)
      .reduce((sum, req) => sum + (req.teacherAmount || 0), 0);
    
    const summary = {
      totalEarnings,
      thisMonthEarnings,
      lastMonthEarnings,
      totalTransactions: completedRequests.length,
      averageEarning: completedRequests.length > 0 ? totalEarnings / completedRequests.length : 0
    };
    
    return {
      earnings,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      },
      summary
    };
  },

  // Get expert earnings summary (public method)
  getExpertEarningsSummary: async (expertId) => {
    console.log('Getting expert earnings summary for:', expertId);
    
    // Get all completed payment requests for this expert
    const completedRequests = await model.getAllDocuments({
      teacherId: expertId,
      payoutStatus: 'completed'
    });
    
    // Calculate totals
    const totalEarnings = completedRequests.reduce((sum, req) => sum + (req.teacherAmount || 0), 0);
    
    // Calculate this month earnings
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const thisMonthEarnings = completedRequests
      .filter(req => new Date(req.processedAt) >= thisMonth)
      .reduce((sum, req) => sum + (req.teacherAmount || 0), 0);
    
    // Calculate last month earnings
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);
    lastMonth.setHours(0, 0, 0, 0);
    
    const lastMonthEnd = new Date();
    lastMonthEnd.setDate(0);
    lastMonthEnd.setHours(23, 59, 59, 999);
    
    const lastMonthEarnings = completedRequests
      .filter(req => new Date(req.processedAt) >= lastMonth && new Date(req.processedAt) <= lastMonthEnd)
      .reduce((sum, req) => sum + (req.teacherAmount || 0), 0);
    
    return {
      totalEarnings,
      thisMonthEarnings,
      lastMonthEarnings,
      totalTransactions: completedRequests.length,
      averageEarning: completedRequests.length > 0 ? totalEarnings / completedRequests.length : 0
    };
  },

  initiatePayout: async (requestId, calculatedValues = null) => {
    console.log("Initiating payout for request:", requestId);
    
    // First get the raw payment request without population to see the actual teacherId
    const rawPaymentRequest = await model.getDocumentById({ _id: requestId });
    console.log("Raw payment request teacherId:", rawPaymentRequest.teacherId);
    
    // Get the payment request with teacher details
    const paymentRequest = await model.getDocumentById(
      { _id: requestId },
      [
        { path: "teacherId", select: "name email contactId fundId isBankActive accountNumber IFSC_Code" }
      ]
    );
    
    if (!paymentRequest) {
      throw new CustomError(404, "Payment request not found");
    }
    
    console.log("Payment request found:", {
      id: paymentRequest._id,
      teacherId: paymentRequest.teacherId,
      teacherIdType: typeof paymentRequest.teacherId
    });
    
    let teacher = paymentRequest.teacherId;
    
    // Handle case where teacherId is null or doesn't have payout fields
    if (!teacher || (!teacher.contactId && !teacher.fundId)) {
      console.log("Teacher not found or missing payout fields, trying to find profile");
      
      // Try to find the teacher's profile by looking up the Teacher model first
      const TeacherModel = require("../Teachers/teacherModel");
      
      // Get the original teacher ID from the raw payment request (might be Teacher ID instead of Profile ID)
      const originalTeacherId = rawPaymentRequest.teacherId;
      
      console.log("Looking for teacher profile with ID:", originalTeacherId);
      
      // First, try to find in Teacher model to get the email
      const teacherRecord = await TeacherModel.findById(originalTeacherId);
      console.log("Teacher record found:", !!teacherRecord);
      
      if (teacherRecord) {
        console.log("Teacher email:", teacherRecord.email);
        
        // Now find the corresponding teacher profile by userId
        const TeacherProfileModel = require("../TeacherProfile/teacherProfileModel");
        const teacherProfile = await TeacherProfileModel.findOne({ 
          userId: originalTeacherId 
        });
        
        console.log("Teacher profile found:", !!teacherProfile);
        
        if (!teacherProfile) {
          console.log("No teacher profile found, creating basic profile");
          
          // Create a basic teacher profile
          const newTeacherProfile = new TeacherProfileModel({
            userId: originalTeacherId,
            userType: "Teacher",
            personalInfo: {
              firstName: teacherRecord.firstName,
              lastName: teacherRecord.lastName,
              email: teacherRecord.email,
              phoneNumber: teacherRecord.phoneNumber
            },
            address: {
              street: "Not provided",
              city: "Not provided", 
              state: "Not provided",
              country: "Not provided",
              postalCode: "000000"
            },
            professional: {
              currentPosition: "Not specified",
              institution: "Not specified",
              experience: teacherRecord.experience || 0,
              specialization: "General",
              skills: ["Not specified"],
              professionalSummary: "Profile created automatically"
            },
            bankDetails: {
              bankName: "Not provided",
              accountHolderName: `${teacherRecord.firstName} ${teacherRecord.lastName}`,
              accountNumber: "0000000000", // Placeholder
              ifscCode: "XXXX0000000", // Placeholder
              accountType: "savings"
            },
            profileStatus: "incomplete",
            isProfileComplete: false
          });
          
          try {
            const savedProfile = await newTeacherProfile.save();
            console.log("Created basic teacher profile:", savedProfile._id);
            
            // Still can't proceed with payout as bank details are placeholders
            throw new CustomError(400, 
              `Teacher profile created but needs to complete bank details setup. ` +
              `Teacher needs to update their profile with real bank account information before payout can be processed. ` +
              `Profile ID: ${savedProfile._id}`
            );
          } catch (saveError) {
            console.error("Error creating teacher profile:", saveError);
            throw new CustomError(500, 
              `Failed to create teacher profile: ${saveError.message}`
            );
          }
        } else {
          // Check if teacher profile has valid bank details and payout setup
          const hasValidBankDetails = teacherProfile.bankDetails && 
            teacherProfile.bankDetails.accountNumber && 
            teacherProfile.bankDetails.ifscCode &&
            teacherProfile.bankDetails.accountNumber !== "0000000000" &&
            teacherProfile.bankDetails.ifscCode !== "XXXX0000000";
          
          const hasPayoutSetup = teacherProfile.razorpayPayout?.contactId && teacherProfile.razorpayPayout?.fundId;
          
          console.log("Teacher profile bank details valid:", hasValidBankDetails);
          console.log("Teacher profile payout setup:", hasPayoutSetup);
          
          if (!hasValidBankDetails) {
            throw new CustomError(400, 
              `Teacher needs to complete bank details in their profile before payout can be processed. ` +
              `Profile ID: ${teacherProfile._id}`
            );
          }
          
          if (!hasPayoutSetup) {
            throw new CustomError(400, 
              `Teacher needs to complete Razorpay payout setup before payment can be processed. ` +
              `Profile ID: ${teacherProfile._id}`
            );
          }
          
          // Use teacher profile for payout
          teacher = {
            _id: teacherProfile._id,
            name: `${teacherProfile.personalInfo.firstName} ${teacherProfile.personalInfo.lastName}`,
            email: teacherProfile.personalInfo.email,
            contactId: teacherProfile.razorpayPayout.contactId,
            fundId: teacherProfile.razorpayPayout.fundId,
            isBankActive: teacherProfile.razorpayPayout.isBankActive,
            accountNumber: teacherProfile.bankDetails.accountNumber,
            IFSC_Code: teacherProfile.bankDetails.ifscCode
          };
          
          console.log("Using teacher profile for payout:", {
            id: teacher._id,
            email: teacher.email,
            hasContactId: !!teacher.contactId,
            hasFundId: !!teacher.fundId,
            isBankActive: teacher.isBankActive
          });
        }
      }
      
      // If still no teacher found, throw error
      if (!teacher) {
        throw new CustomError(404, "Teacher profile not found for payout");
      }
    }
    
    // Check if teacher has Razorpay payout setup
    if (!teacher.contactId || !teacher.fundId) {
      throw new CustomError(400, "Teacher does not have Razorpay payout profile set up");
    }
    
    if (!teacher.isBankActive) {
      throw new CustomError(400, "Teacher's bank account is not active");
    }
    
    // Use calculated values if provided, otherwise use values from database
    const teacherAmount = calculatedValues?.teacherAmount || paymentRequest.teacherAmount;
    const adminCommission = calculatedValues?.adminCommission || paymentRequest.adminCommission;
    const consultancyTitle = calculatedValues?.consultancyTitle || paymentRequest.consultancyTitle;
    
    // Import Razorpay payout service
    const razorpayPayoutService = require("../RazorpayPayout/razorpayPayoutService");
    const { v4: uuidv4 } = require("uuid");
    
    try {
      // Create payout using teacher amount (after commission deduction)
      const payoutData = {
        fund_account_id: teacher.fundId,
        amount: teacherAmount * 100, // Convert to paise (teacher amount after commission)
        reference_id: `payout-${uuidv4().slice(0, 20)}`,
        narration: `PAYOUT${Date.now().toString().slice(-6)}`, // Format: "PAYOUT123456" (12 chars)
        mode: "IMPS"
      };
      
      console.log("Creating payout with data:", payoutData);
      
      const payoutResult = await razorpayPayoutService.createPayout(payoutData);
      
      console.log("Payout created successfully:", payoutResult);
      
      // Update payment request with payout details
      const updateData = {
        payoutStatus: "completed",
        payoutId: payoutResult.id,
        payoutReferenceId: payoutResult.reference_id,
        payoutProcessedAt: new Date()
      };
      
      await model.updateDocument(
        { _id: requestId },
        updateData
      );
      
      return payoutResult;
      
    } catch (error) {
      console.error("Payout creation failed:", error);
      
      // Update payout status to failed
      await model.updateDocument(
        { _id: requestId },
        { 
          payoutStatus: "failed",
          payoutFailureReason: error.message || "Payout creation failed",
          payoutProcessedAt: new Date()
        }
      );
      
      throw error;
    }
  },

  getTeacherRequests: async (data) => {
    const { teacherId, page = 1, limit = 10 } = data;
    
    const query = { teacherId };
    const options = {
      sort: '-createdAt',
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      populate: [
        { path: "studentId", select: "firstName lastName email" },
        { path: "consultancyId", select: "type createdAt" }
      ]
    };
    
    const paymentRequests = await model.getAllDocuments(query, options);
    const totalCount = await model.model.countDocuments(query);
    const totalPages = Math.ceil(totalCount / parseInt(limit));
    
    return {
      paymentRequests,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    };
  },

  getStats: async () => {
    const stats = await PaymentRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);
    
    const formattedStats = {
      pending: { count: 0, totalAmount: 0 },
      approved: { count: 0, totalAmount: 0 },
      rejected: { count: 0, totalAmount: 0 },
      paid: { count: 0, totalAmount: 0 }
    };
    
    stats.forEach(stat => {
      if (formattedStats[stat._id]) {
        formattedStats[stat._id] = {
          count: stat.count,
          totalAmount: stat.totalAmount
        };
      }
    });
    
    return formattedStats;
  }
};

module.exports = paymentRequestService;
