const UserRequest = require("./userRequestModel");
const CustomError = require("../../Errors/CustomError");
const PaperRequest = require("../PaperRequest/PaperRequest");

const userRequestService = {
  // Create a new user request
  createRequest: async (requestData) => {
    try {
      // Create the request normally without any database updates to existing records
      const newRequest = new UserRequest(requestData);
      const savedRequest = await newRequest.save();
      return await UserRequest.findById(savedRequest._id)
        .populate('requestBy', 'firstName lastName email')
        .exec();
    } catch (error) {
      throw new CustomError(500, "Error creating user request: " + error.message);
    }
  },

  // Get all user requests with filtering and pagination
  getAllRequests: async (queryParams = {}) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        requestBy,
        type,
        status,
        priority,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = queryParams;

      // Ensure requestBy is provided for user filtering
      if (!requestBy) {
        throw new Error("User ID (requestBy) is required for filtering user requests");
      }

      const filter = { 
        isDeleted: false,
        requestBy: requestBy // Filter by current user - only show their own requests
      };

      console.log('UserRequest filter:', filter);

      // Apply additional filters
      if (type) {
        filter.type = type;
      }

      if (status) {
        filter.status = status;
      }

      if (priority) {
        filter.priority = priority;
      }

      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'labDetails.nature': { $regex: search, $options: 'i' } },
          { 'documentDetails.title': { $regex: search, $options: 'i' } },
          { 'documentDetails.author': { $regex: search, $options: 'i' } },
          { 'dataDetails.title': { $regex: search, $options: 'i' } }
        ];
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (page - 1) * limit;

      // Get user requests
      const [userRequests, userRequestsCount] = await Promise.all([
        UserRequest.find(filter)
          .populate('requestBy', 'firstName lastName email')
          .populate('adminResponse.respondedBy', 'name email')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean()
          .exec(),
        UserRequest.countDocuments(filter)
      ]);

      console.log(`Found ${userRequests.length} user requests for user ${requestBy}`);

      // For each document request, check if matching paper exists and add foundDocument key
      const enhancedUserRequests = await Promise.all(
        userRequests.map(async (userRequest) => {
          // Only check for document type requests
          if (userRequest.type === 'Document' && userRequest.documentDetails) {
            const documentDetails = userRequest.documentDetails;
            let foundPaperRequest = null;

            // Check PaperRequest collection for approved papers with file URLs
            if (documentDetails.doi) {
              foundPaperRequest = await PaperRequest.findOne({
                DOI_number: documentDetails.doi,
                requestStatus: 'approved',
                isDelete: false,
                fileUrl: { $exists: true, $ne: "" }
              }).populate('requestBy').lean();
            }

            // If not found by DOI, check by title
            if (!foundPaperRequest && documentDetails.title) {
              foundPaperRequest = await PaperRequest.findOne({
                'paperDetail.title': { $regex: new RegExp(`^${documentDetails.title.trim()}$`, 'i') },
                requestStatus: 'approved',
                isDelete: false,
                fileUrl: { $exists: true, $ne: "" }
              }).populate('requestBy').lean();
            }

            // If matching paper found, add foundDocument key to the user request
            if (foundPaperRequest) {
              return {
                ...userRequest,
                foundDocument: {
                  id: foundPaperRequest._id,
                  title: foundPaperRequest.paperDetail?.title,
                  doi: foundPaperRequest.DOI_number,
                  fileUrl: foundPaperRequest.fileUrl,
                  viewUrl: foundPaperRequest.fileUrl,
                  downloadUrl: foundPaperRequest.fileUrl,
                  paperDetail: foundPaperRequest.paperDetail,
                  requestBy: foundPaperRequest.requestBy,
                  createdAt: foundPaperRequest.createdAt,
                  updatedAt: foundPaperRequest.updatedAt,
                  source: 'PaperRequest',
                  matchedBy: documentDetails.doi ? 'DOI' : 'Title'
                },
                status: 'Approved', // Update status to show document is available
                message: 'Document found and available for download!'
              };
            }
          }
          
          // Return original request if no matching document found
          return userRequest;
        })
      );

      console.log(`Enhanced ${enhancedUserRequests.length} user requests with foundDocument info`);

      return {
        data: enhancedUserRequests,
        totalCount: userRequestsCount,
        userRequestsCount: userRequestsCount,
        paperRequestsCount: 0, // Not needed anymore since we're enhancing existing requests
        currentPage: parseInt(page),
        totalPages: Math.ceil(userRequestsCount / limit),
        hasNextPage: page * limit < userRequestsCount,
        hasPrevPage: page > 1
      };
    } catch (error) {
      throw new CustomError(500, "Error fetching user requests: " + error.message);
    }
  },

  // Get user request by ID
  getRequestById: async (requestId, userId = null) => {
    try {
      const filter = {
        _id: requestId,
        isDeleted: false
      };

      // If userId is provided, ensure user can only access their own requests
      if (userId) {
        filter.requestBy = userId;
      }

      const request = await UserRequest.findOne(filter)
        .populate('requestBy', 'firstName lastName email')
        .populate('adminResponse.respondedBy', 'name email')
        .exec();

      if (!request) {
        throw new CustomError(404, "User request not found");
      }

      return request;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, "Error fetching user request: " + error.message);
    }
  },

  // Update user request
  updateRequest: async (requestId, updateData, userId = null) => {
    try {
      const filter = {
        _id: requestId,
        isDeleted: false
      };

      // If userId is provided, ensure user can only update their own requests
      if (userId) {
        filter.requestBy = userId;
      }

      // Remove fields that shouldn't be updated directly by users
      const { _id, requestBy, createdAt, updatedAt, adminResponse, ...validUpdateData } = updateData;

      const updatedRequest = await UserRequest.findOneAndUpdate(
        filter,
        validUpdateData,
        { new: true, runValidators: true }
      )
      .populate('requestBy', 'firstName lastName email')
      .populate('adminResponse.respondedBy', 'name email')
      .exec();

      if (!updatedRequest) {
        throw new CustomError(404, "User request not found");
      }

      return updatedRequest;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, "Error updating user request: " + error.message);
    }
  },

  // Soft delete user request
  deleteRequest: async (requestId, userId = null) => {
    try {
      const filter = {
        _id: requestId,
        isDeleted: false
      };

      // If userId is provided, ensure user can only delete their own requests
      if (userId) {
        filter.requestBy = userId;
      }

      const deletedRequest = await UserRequest.findOneAndUpdate(
        filter,
        { 
          isDeleted: true,
          deletedAt: new Date()
        },
        { new: true }
      ).exec();

      if (!deletedRequest) {
        throw new CustomError(404, "User request not found");
      }

      return deletedRequest;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, "Error deleting user request: " + error.message);
    }
  },

  // Update request status (for admin use)
  updateRequestStatus: async (requestId, statusData) => {
    try {
      const { status, responseMessage, respondedBy } = statusData;

      const updateData = {
        status,
        'adminResponse.responseMessage': responseMessage,
        'adminResponse.respondedBy': respondedBy,
        'adminResponse.responseDate': new Date()
      };

      const updatedRequest = await UserRequest.findOneAndUpdate(
        { _id: requestId, isDeleted: false },
        updateData,
        { new: true, runValidators: true }
      )
      .populate('requestBy', 'firstName lastName email')
      .populate('adminResponse.respondedBy', 'name email')
      .exec();

      if (!updatedRequest) {
        throw new CustomError(404, "User request not found");
      }

      return updatedRequest;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, "Error updating request status: " + error.message);
    }
  },

  // Get request statistics
  getRequestStatistics: async (userId = null) => {
    try {
      const matchStage = { isDeleted: false };
      if (userId) {
        matchStage.requestBy = userId;
      }

      const stats = await UserRequest.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            pendingRequests: {
              $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] }
            },
            approvedRequests: {
              $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] }
            },
            rejectedRequests: {
              $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] }
            },
            inProgressRequests: {
              $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] }
            }
          }
        }
      ]);

      // Get type statistics
      const typeStats = await UserRequest.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        ...stats[0] || {
          totalRequests: 0,
          pendingRequests: 0,
          approvedRequests: 0,
          rejectedRequests: 0,
          inProgressRequests: 0
        },
        typeBreakdown: typeStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      };
    } catch (error) {
      throw new CustomError(500, "Error fetching request statistics: " + error.message);
    }
  }
};

module.exports = userRequestService; 