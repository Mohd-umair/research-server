const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const consultancyCardService = require("./consultancyCardService");
const { validationResult } = require("express-validator");
const consultancyCardmiddleware = require("../../middlewares/validation/consultancycardvalidationschema");

const consultancyCardCtrl = {
  create: [
    consultancyCardmiddleware,
    asyncHandler(async (req, res, next) => {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        console.log(errors.errors);
        
        return res
          .status(400)
          .json({ msg: errors.errors });
      } else {
        const docDto = req.body;
        
        // Security: Always set teacherId from the logged-in user's token
        const loggedInUserId = req.body.decodedUser._id;
        console.log('Creating consultancy card for logged-in user:', loggedInUserId);
        
        // Override any teacherId that might have been sent from frontend
        docDto.teacherId = loggedInUserId;
        docDto.createdBy = loggedInUserId; // Also set createdBy for consistency
        
        const savedDoc = await consultancyCardService.create(docDto);
        return successResponse({ res, data: savedDoc, msg: "New Card Added" });
      }
    }),
  ],

  getById: asyncHandler(async (req, res, next) => {
    const docData = req.body;
    const response = await consultancyCardService.getById(docData);
    return successResponse({ res, data: response, msg: "Card By ID" });
  }),

  getAll: asyncHandler(async (req, res, next) => {
    const docData = req.body;
    
    // Ensure we're filtering by the logged-in user's ID
    const loggedInUserId = req.body.decodedUser._id;
    console.log('Logged in user ID:', loggedInUserId);
    
    // Override createdBy to ensure we only get data for the logged-in user
    docData.createdBy = loggedInUserId;
    
    const response = await consultancyCardService.getAll(docData);
    return successResponse({ 
      res, 
      data: response.data, 
      count: response.totalCount,
      msg: "Consultancy Cards Retrieved",
      pagination: {
        currentPage: response.currentPage,
        totalPages: response.totalPages,
        totalCount: response.totalCount,
        hasNextPage: response.hasNextPage,
        hasPrevPage: response.hasPrevPage
      }
    });
  }),

  getUserConsultancyCard: asyncHandler(async (req, res, next) => {
    const teacherId = req.body.decodedUser._id; // Assuming user ID is stored in req.user
    console.log(teacherId);

    const response = await consultancyCardService.getUserConsultancyCard(
      teacherId
    );
    return successResponse({
      res,
      data: response,
      msg: "User Consultancy Cards",
    });
  }),

  update: asyncHandler(async (req, res, next) => {
    const docDto = req.body;
    
    // Security: Get the logged-in user's ID
    const loggedInUserId = req.body.decodedUser._id;
    console.log('Updating consultancy card for logged-in user:', loggedInUserId);
    
    // Add user ID to the update data for security validation
    docDto.loggedInUserId = loggedInUserId;
    
    const updatedDoc = await consultancyCardService.update(docDto);
    return successResponse({ res, data: updatedDoc, msg: "Card Updated" });
  }),

  delete: asyncHandler(async (req, res, next) => {
    const docData = req.body;
    await consultancyCardService.delete(docData);
    return successResponse({ res, msg: "Card Deleted" });
  }),

  // Admin approval workflow methods
  getAllForApproval: asyncHandler(async (req, res, next) => {
    const docData = req.body;
    
    // Check if user has admin permissions (implement according to your auth system)
    const userRole = req.body.decodedUser.role || req.body.decodedUser.userType;
    if (userRole !== 'admin' && userRole !== 'moderator') {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Admin permissions required." 
      });
    }
    
    const response = await consultancyCardService.getAllForApproval(docData);
    return successResponse({ 
      res, 
      data: response.data, 
      count: response.totalCount,
      msg: "Consultancy Cards for Approval Retrieved",
      pagination: {
        currentPage: response.currentPage,
        totalPages: response.totalPages,
        totalCount: response.totalCount,
        hasNextPage: response.hasNextPage,
        hasPrevPage: response.hasPrevPage
      }
    });
  }),

  approve: asyncHandler(async (req, res, next) => {
    const { consultancyCardId, comments } = req.body;
    const approvedBy = req.body.decodedUser._id;
    
    // Check if user has admin permissions
    const userRole = req.body.decodedUser.role || req.body.decodedUser.userType;
    if (userRole !== 'admin' && userRole !== 'moderator') {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Admin permissions required." 
      });
    }
    
    if (!consultancyCardId) {
      return res.status(400).json({ 
        success: false, 
        message: "Consultancy Card ID is required" 
      });
    }
    
    const docData = {
      consultancyCardId,
      approvedBy,
      comments
    };
    
    const response = await consultancyCardService.approve(docData);
    return successResponse({ 
      res, 
      data: response, 
      msg: "Consultancy Card Approved Successfully" 
    });
  }),

  reject: asyncHandler(async (req, res, next) => {
    const { consultancyCardId, rejectionReason } = req.body;
    const rejectedBy = req.body.decodedUser._id;
    
    // Check if user has admin permissions
    const userRole = req.body.decodedUser.role || req.body.decodedUser.userType;
    if (userRole !== 'admin' && userRole !== 'moderator') {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Admin permissions required." 
      });
    }
    
    if (!consultancyCardId) {
      return res.status(400).json({ 
        success: false, 
        message: "Consultancy Card ID is required" 
      });
    }
    
    if (!rejectionReason || rejectionReason.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: "Rejection reason is required" 
      });
    }
    
    const docData = {
      consultancyCardId,
      rejectedBy,
      rejectionReason
    };
    
    const response = await consultancyCardService.reject(docData);
    return successResponse({ 
      res, 
      data: response, 
      msg: "Consultancy Card Rejected" 
    });
  }),

  // Public endpoint to get approved consultancies for home page display
  getApprovedConsultancies: asyncHandler(async (req, res, next) => {
    const { limit = 6, skip = 0, search = '' } = req.body;
    
    const docData = {
      isApproved: true,
      status: 'approved',
      limit: parseInt(limit),
      skip: parseInt(skip),
      search: search.trim()
    };
    
    const response = await consultancyCardService.getApprovedConsultancies(docData);
    return successResponse({ 
      res, 
      data: response.data, 
      count: response.totalCount,
      msg: "Approved Consultancy Cards Retrieved",
      pagination: {
        currentPage: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(response.totalCount / limit),
        totalCount: response.totalCount,
        hasNextPage: (skip + limit) < response.totalCount,
        hasPrevPage: skip > 0
      }
    });
  }),

  // Admin endpoint to get all consultancies for management
  getAllConsultanciesForAdmin: asyncHandler(async (req, res, next) => {
    const docData = req.body;
    
    // Check if user has admin permissions - using admin token structure
    const adminRole = req.admin.role;
    if (adminRole !== 'SuperAdmin' && adminRole !== 'Moderator') {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Admin permissions required." 
      });
    }
    
    const response = await consultancyCardService.getAllConsultanciesForAdmin(docData);
    return successResponse({ 
      res, 
      data: response.data, 
      count: response.totalCount,
      msg: "All Consultancy Cards Retrieved",
      pagination: {
        currentPage: response.currentPage,
        totalPages: response.totalPages,
        totalCount: response.totalCount,
        hasNextPage: response.hasNextPage,
        hasPrevPage: response.hasPrevPage
      }
    });
  }),
};

module.exports = consultancyCardCtrl;
