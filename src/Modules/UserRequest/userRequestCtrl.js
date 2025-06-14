const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const userRequestService = require("./userRequestService");
const CustomError = require("../../Errors/CustomError");
const { validationResult } = require("express-validator");
const userRequestValidationRules = require("../../middlewares/validation/userRequestValidationSchema");

const userRequestCtrl = {
  // Create new user request
  create: [
    userRequestValidationRules(),
    asyncHandler(async (req, res, next) => {
      try {
        const errors = validationResult(req);
        
        if (!errors.isEmpty()) {
          return res.status(400).json({ 
            success: false,
            message: "Validation failed",
            errors: errors.array() 
          });
        }

        const requestData = req.body;
        
        // Get user ID from token
        const loggedInUserId = req.body.decodedUser._id;
        console.log('Creating request for user:', loggedInUserId);
        
        // Build request data based on type
        const newRequestData = {
          requestBy: loggedInUserId,
          type: requestData.type,
          title: requestData.title,
          description: requestData.description,
          priority: requestData.priority || 'Medium'
        };

        // Add type-specific details
        if (requestData.type === 'Lab') {
          newRequestData.labDetails = {
            nature: requestData.labNature,
            needs: requestData.labNeeds,
            additionalInfo: requestData.labAdditionalInfo
          };
          // Auto-generate title if not provided
          if (!requestData.title) {
            newRequestData.title = `${requestData.labNature} Request`;
          }
          // Auto-generate description if not provided
          if (!requestData.description) {
            newRequestData.description = requestData.labNeeds || 'Lab access request';
          }
        } else if (requestData.type === 'Document') {
          newRequestData.documentDetails = {
            doi: requestData.documentDoi,
            type: requestData.documentType,
            title: requestData.documentTitle,
            publisher: requestData.documentPublisher,
            author: requestData.documentAuthor,
            publishedDate: requestData.documentPublishedDate ? new Date(requestData.documentPublishedDate) : null
          };
          // Auto-generate title if not provided
          if (!requestData.title) {
            newRequestData.title = requestData.documentTitle || 'Document Request';
          }
          // Auto-generate description if not provided
          if (!requestData.description) {
            newRequestData.description = requestData.documentDoi || 
              `${requestData.documentType} by ${requestData.documentAuthor}` || 
              'Document access request';
          }
        } else if (requestData.type === 'Data') {
          newRequestData.dataDetails = {
            type: requestData.dataType,
            title: requestData.dataTitle,
            description: requestData.dataDescription
          };
          // Auto-generate title if not provided
          if (!requestData.title) {
            newRequestData.title = requestData.dataTitle || 'Data Request';
          }
          // Auto-generate description if not provided
          if (!requestData.description) {
            newRequestData.description = requestData.dataDescription || 'Data access request';
          }
        }

        const newRequest = await userRequestService.createRequest(newRequestData);

        // Check if a document was found immediately
        if (newRequest.foundDocument) {
          return successResponse({
            res,
            data: newRequest,
            msg: newRequest.message || "Document found and is available for download",
            documentFound: true,
            documentDetails: newRequest.foundDocument
          });
        }

        return successResponse({
          res,
          data: newRequest,
          msg: "Request created successfully",
        });
      } catch (error) {
        next(error);
      }
    })
  ],

  // Get all user requests
  getAll: asyncHandler(async (req, res, next) => {
    try {
      const queryParams = req.body;
      
      // Ensure we're filtering by the logged-in user's ID
      const loggedInUserId = req.body.decodedUser._id;
      console.log('Logged in user ID for user requests:', loggedInUserId);
      
      // Override requestBy to ensure we only get data for the logged-in user
      queryParams.requestBy = loggedInUserId;
      
      const result = await userRequestService.getAllRequests(queryParams);

      return successResponse({
        res,
        data: result.data,
        count: result.totalCount,
        userRequestsCount: result.userRequestsCount,
        paperRequestsCount: result.paperRequestsCount,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage
        },
        msg: `Found ${result.data.length} requests (${result.userRequestsCount} user requests + ${result.paperRequestsCount} matching paper requests)`,
      });
    } catch (error) {
      next(error);
    }
  }),

  // Get user request by ID
  getById: asyncHandler(async (req, res, next) => {
    try {
      const { _id } = req.body;
      const loggedInUserId = req.body.decodedUser._id;

      if (!_id) {
        throw new CustomError(400, "Request ID is required");
      }

      const request = await userRequestService.getRequestById(_id, loggedInUserId);

      return successResponse({
        res,
        data: request,
        msg: "Request details fetched successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  // Update user request
  update: asyncHandler(async (req, res, next) => {
    try {
      const { _id, ...updateData } = req.body;
      const loggedInUserId = req.body.decodedUser._id;

      if (!_id) {
        throw new CustomError(400, "Request ID is required");
      }

      const updatedRequest = await userRequestService.updateRequest(
        _id,
        updateData,
        loggedInUserId
      );

      return successResponse({
        res,
        data: updatedRequest,
        msg: "Request updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  // Delete user request
  delete: asyncHandler(async (req, res, next) => {
    try {
      const { _id } = req.body;
      const loggedInUserId = req.body.decodedUser._id;

      if (!_id) {
        throw new CustomError(400, "Request ID is required");
      }

      await userRequestService.deleteRequest(_id, loggedInUserId);

      return successResponse({
        res,
        data: null,
        msg: "Request deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  // Get user's request statistics
  getStatistics: asyncHandler(async (req, res, next) => {
    try {
      const loggedInUserId = req.body.decodedUser._id;

      const statistics = await userRequestService.getRequestStatistics(loggedInUserId);

      return successResponse({
        res,
        data: statistics,
        msg: "Request statistics fetched successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  // Update request status (for admin use)
  updateStatus: asyncHandler(async (req, res, next) => {
    try {
      const { _id, status, responseMessage } = req.body;
      const respondedBy = req.body.decodedUser._id;

      if (!_id || !status) {
        throw new CustomError(400, "Request ID and status are required");
      }

      const statusData = {
        status,
        responseMessage,
        respondedBy
      };

      const updatedRequest = await userRequestService.updateRequestStatus(_id, statusData);

      return successResponse({
        res,
        data: updatedRequest,
        msg: `Request ${status.toLowerCase()} successfully`,
      });
    } catch (error) {
      next(error);
    }
  }),

  // Search user requests
  search: asyncHandler(async (req, res, next) => {
    try {
      const { query } = req.body;
      const loggedInUserId = req.body.decodedUser._id;

      if (!query) {
        throw new CustomError(400, "Search query is required");
      }

      const searchParams = {
        search: query,
        requestBy: loggedInUserId
      };

      const results = await userRequestService.getAllRequests(searchParams);

      return successResponse({
        res,
        data: results.data,
        count: results.totalCount,
        msg: "Search results fetched successfully",
      });
    } catch (error) {
      next(error);
    }
  })
};

module.exports = userRequestCtrl; 