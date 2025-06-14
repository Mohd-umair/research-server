const UserRequest = require("./userRequestModel");
const CustomError = require("../../Errors/CustomError");
const PaperRequest = require("../PaperRequest/PaperRequest");

const userRequestService = {
  // Create a new user request
  createRequest: async (requestData) => {
    try {
      // If this is a document request, check for existing papers in PaperRequest collection only
      if (requestData.type === 'Document') {
        const documentDetails = requestData.documentDetails;
        let foundPaperRequest = null;

        // Check PaperRequest collection for approved papers with file URLs
        if (documentDetails && documentDetails.doi) {
          foundPaperRequest = await PaperRequest.findOne({
            DOI_number: documentDetails.doi,
            requestStatus: 'approved',
            isDelete: false,
            fileUrl: { $exists: true, $ne: "" }
          }).populate('requestBy');
        }

        // If not found by DOI in PaperRequest, check by title in paperDetail
        if (!foundPaperRequest && documentDetails && documentDetails.title) {
          foundPaperRequest = await PaperRequest.findOne({
            'paperDetail.title': { $regex: new RegExp(`^${documentDetails.title.trim()}$`, 'i') },
            requestStatus: 'approved',
            isDelete: false,
            fileUrl: { $exists: true, $ne: "" }
          }).populate('requestBy');
        }

        // If found in PaperRequest, return immediately with document link
        if (foundPaperRequest) {
          return {
            _id: null,
            type: 'Document',
            status: 'Approved',
            title: requestData.title || foundPaperRequest.paperDetail?.title || 'Document Request',
            description: requestData.description || `Document found in paper requests collection`,
            documentDetails: {
              ...documentDetails,
              title: foundPaperRequest.paperDetail?.title,
              doi: foundPaperRequest.DOI_number
            },
            foundDocument: {
              id: foundPaperRequest._id,
              title: foundPaperRequest.paperDetail?.title,
              doi: foundPaperRequest.DOI_number,
              fileUrl: foundPaperRequest.fileUrl,
              viewUrl: foundPaperRequest.fileUrl,
              downloadUrl: foundPaperRequest.fileUrl,
              paperDetail: foundPaperRequest.paperDetail,
              source: 'PaperRequest'
            },
            message: 'Document found! You can view and download it immediately.',
            createdAt: new Date(),
            requestBy: requestData.requestBy
          };
        }
      }

      // If no existing document found, create the request normally
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

      // Get all paper requests that match DOI numbers or titles from user requests
      const matchingPaperRequests = [];
      
      // Extract DOI numbers and titles from user requests for matching
      const documentRequests = userRequests.filter(req => req.type === 'Document');
      const doiNumbers = [];
      const titles = [];

      documentRequests.forEach(docRequest => {
        if (docRequest.documentDetails?.doi) {
          doiNumbers.push(docRequest.documentDetails.doi);
        }
        if (docRequest.documentDetails?.title) {
          titles.push(docRequest.documentDetails.title.trim());
        }
      });

      // Find paper requests that match DOI numbers or titles exactly
      if (doiNumbers.length > 0 || titles.length > 0) {
        const paperRequestFilter = {
          isDelete: false,
          requestStatus: 'approved',
          fileUrl: { $exists: true, $ne: "" },
          $or: []
        };

        if (doiNumbers.length > 0) {
          paperRequestFilter.$or.push({
            DOI_number: { $in: doiNumbers }
          });
        }

        if (titles.length > 0) {
          paperRequestFilter.$or.push({
            'paperDetail.title': { 
              $in: titles.map(title => new RegExp(`^${title}$`, 'i'))
            }
          });
        }

        const paperRequests = await PaperRequest.find(paperRequestFilter)
          .populate('requestBy', 'firstName lastName email')
          .populate('fulfilledBy', 'firstName lastName email')
          .lean()
          .exec();

        // Transform paper requests to match user request structure
        paperRequests.forEach(paperRequest => {
          matchingPaperRequests.push({
            _id: paperRequest._id,
            type: 'Document',
            status: 'Approved',
            title: paperRequest.paperDetail?.title || 'Paper Request',
            description: `Paper available for download - DOI: ${paperRequest.DOI_number}`,
            requestBy: paperRequest.requestBy,
            createdAt: paperRequest.createdAt,
            updatedAt: paperRequest.updatedAt,
            priority: 'Medium',
            documentDetails: {
              title: paperRequest.paperDetail?.title,
              doi: paperRequest.DOI_number,
              author: paperRequest.paperDetail?.author || []
            },
            foundDocument: {
              id: paperRequest._id,
              title: paperRequest.paperDetail?.title,
              doi: paperRequest.DOI_number,
              fileUrl: paperRequest.fileUrl,
              viewUrl: paperRequest.fileUrl,
              downloadUrl: paperRequest.fileUrl,
              paperDetail: paperRequest.paperDetail,
              source: 'PaperRequest'
            },
            isPaperRequest: true, // Flag to identify paper requests
            originalPaperRequest: paperRequest
          });
        });
      }

      console.log(`Found ${matchingPaperRequests.length} matching paper requests`);

      // Combine user requests and matching paper requests
      const allRequests = [...userRequests, ...matchingPaperRequests];
      
      // Sort combined results
      allRequests.sort((a, b) => {
        const aDate = new Date(a.createdAt);
        const bDate = new Date(b.createdAt);
        return sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
      });

      // Apply pagination to combined results
      const totalCombinedCount = allRequests.length;
      const paginatedResults = allRequests.slice(skip, skip + parseInt(limit));

      console.log(`Returning ${paginatedResults.length} total requests (${userRequests.length} user requests + ${matchingPaperRequests.length} paper requests)`);

      return {
        data: paginatedResults,
        totalCount: totalCombinedCount,
        userRequestsCount: userRequestsCount,
        paperRequestsCount: matchingPaperRequests.length,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCombinedCount / limit),
        hasNextPage: page * limit < totalCombinedCount,
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