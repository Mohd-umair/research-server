const UserRequest = require("./userRequestModel");
const CustomError = require("../../Errors/CustomError");
const PaperRequest = require("../PaperRequest/PaperRequest");
const CoinService = require("../Coins/coinService");
const Student = require("../Students/studentModel");

const userRequestService = {
  // Create a new user request
  createRequest: async (requestData) => {
    try {
      let foundPaperRequest = null;
      
      // Check if this is a document request with DOI or title
      if (requestData.type === 'Document' && requestData.documentDetails && 
          (requestData.documentDetails.doi || requestData.documentDetails.title)) {
        
        // Build search conditions - match either DOI or exact title
        const searchConditions = [];
        
        if (requestData.documentDetails.doi) {
          searchConditions.push({ DOI_number: requestData.documentDetails.doi });
        }
        
        if (requestData.documentDetails.title) {
          searchConditions.push({ 
            'paperDetail.title': { $regex: new RegExp(`^${requestData.documentDetails.title.trim()}$`, 'i') }
          });
        }
        
        // Search for existing paper request with matching DOI OR title
        foundPaperRequest = await PaperRequest.findOne({
          $or: searchConditions,
          requestStatus: 'approved',
          isDelete: false,
          fileUrl: { $exists: true, $ne: "" }
        }).populate('requestBy', 'firstName lastName email').lean();
        
        console.log(`Checking for existing document with DOI: ${requestData.documentDetails.doi || 'N/A'} OR Title: ${requestData.documentDetails.title || 'N/A'}`);
        console.log('Found paper request:', foundPaperRequest ? 'Yes' : 'No');
      }
      
      // If document found, create user request with document details and mark as approved
      if (foundPaperRequest) {
        const enhancedRequestData = {
          ...requestData,
          status: 'Approved',
          // Update document details with complete information from found paper
          documentDetails: {
            ...requestData.documentDetails,
            title: foundPaperRequest.paperDetail?.title || requestData.documentDetails.title,
            author: foundPaperRequest.paperDetail?.authors || requestData.documentDetails.author,
            publisher: foundPaperRequest.paperDetail?.publisher || requestData.documentDetails.publisher,
            type: foundPaperRequest.paperDetail?.type || requestData.documentDetails.type,
            publishedDate: foundPaperRequest.paperDetail?.publishedDate ? 
              new Date(foundPaperRequest.paperDetail.publishedDate) : 
              requestData.documentDetails.publishedDate
          },
          // Add attachments from the found paper request
          attachments: [{
            fileName: `${foundPaperRequest.paperDetail?.title || 'Document'}.pdf`,
            fileUrl: foundPaperRequest.fileUrl,
            fileType: 'application/pdf',
            uploadedAt: new Date()
          }],
          // Add admin response indicating document was found
          adminResponse: {
            responseDate: new Date(),
            responseMessage: `Your document request has been fulfilled. Document: "${foundPaperRequest.paperDetail?.title || 'Document'}" has been uploaded and is now available.`
          }
        };
        
        const newRequest = new UserRequest(enhancedRequestData);
        const savedRequest = await newRequest.save();
        
        const populatedRequest = await UserRequest.findById(savedRequest._id)
          .populate('requestBy', 'firstName lastName email')
          .exec();
          
        // Add foundDocument info for frontend
        populatedRequest.foundDocument = {
          id: foundPaperRequest._id,
          title: foundPaperRequest.paperDetail?.title,
          doi: foundPaperRequest.DOI_number,
          fileUrl: foundPaperRequest.fileUrl,
          viewUrl: foundPaperRequest.fileUrl,
          downloadUrl: foundPaperRequest.fileUrl,
          paperDetail: foundPaperRequest.paperDetail,
          source: 'PaperRequest'
        };
        
        populatedRequest.message = 'Document found and is available for download!';
        
        return populatedRequest;
      }
      
      // If no document found, create request normally
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

      return {
        data: userRequests,
        totalCount: userRequestsCount,
        userRequestsCount: userRequestsCount,
        paperRequestsCount: 0,
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
  },

  // Get all unfulfilled user requests for website (public view)
  getAllUnfulfilledRequestsForWebsite: async (queryParams = {}) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        type,
        priority,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = queryParams;

      // Basic filter - exclude deleted records and fulfilled requests
      const filter = { 
        isDeleted: false,
        isFulfilled: { $ne: true } // Only show unfulfilled requests on website
      };

      // Apply additional filters
      if (type) {
        filter.type = type;
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

      // Get all user requests with student details
      const [userRequests, totalCount] = await Promise.all([
        UserRequest.find(filter)
          .populate({
            path: 'requestBy',
            model: 'Student', // Lookup from students collection
            select: 'firstName lastName email collegeName department graduationStatus profilePicture points'
          })
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean()
          .exec(),
        UserRequest.countDocuments(filter)
      ]);

      // Return all requests (removed filtering for inactive students)
      const validRequests = userRequests.filter(request => request.requestBy !== null);

      console.log(`Found ${validRequests.length} user requests for website`);

      return {
        data: validRequests,
        totalCount: totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1
      };
    } catch (error) {
      throw new CustomError(500, "Error fetching user requests: " + error.message);
    }
  },

  // Get public request statistics for website
  getPublicRequestStatistics: async () => {
    try {
      const stats = await UserRequest.aggregate([
        {
          $match: { isDeleted: false }
        },
        {
          $group: {
            _id: null,
            totalRequests: { $sum: 1 },
            pendingRequests: {
              $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] }
            },
            inProgressRequests: {
              $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] }
            },
            approvedRequests: {
              $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] }
            },
            rejectedRequests: {
              $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] }
            }
          }
        }
      ]);

      const typeStats = await UserRequest.aggregate([
        {
          $match: { isDeleted: false }
        },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 }
          }
        }
      ]);

      const priorityStats = await UserRequest.aggregate([
        {
          $match: { isDeleted: false }
        },
        {
          $group: {
            _id: "$priority",
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        overview: stats[0] || {
          totalRequests: 0,
          pendingRequests: 0,
          inProgressRequests: 0,
          approvedRequests: 0,
          rejectedRequests: 0
        },
        byType: typeStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byPriority: priorityStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      };
    } catch (error) {
      throw new CustomError(500, "Error fetching public request statistics: " + error.message);
    }
  },

  // Get public request by ID (limited information for website)
  getPublicRequestById: async (requestId) => {
    try {
      const request = await UserRequest.findOne({
        _id: requestId,
        isDeleted: false
      })
      .populate({
        path: 'requestBy',
        model: 'Student',
        select: 'firstName lastName collegeName department graduationStatus profilePicture'
      })
      .select('-adminResponse -attachments') // Exclude sensitive admin data
      .lean()
      .exec();

      if (!request) {
        throw new CustomError(404, "Request not found");
      }

      if (!request.requestBy) {
        throw new CustomError(404, "Request requester information not available");
      }

      return request;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, "Error fetching public request: " + error.message);
    }
  },

  // Update fulfillment status
  updateFulfillmentStatus: async (requestId, isFulfilled, userId = null) => {
    try {
      const filter = {
        _id: requestId,
        isDeleted: false
      };

      // If userId is provided, ensure user can only update their own requests
      if (userId) {
        filter.requestBy = userId;
      }

      const updateData = {
        isFulfilled: isFulfilled
      };

      // If user rejects the document, we might want to change status back to Pending
      if (!isFulfilled) {
        updateData.status = 'Pending';
        // Optionally remove attachments if user rejects the document
        updateData.attachments = [];
        updateData.adminResponse = undefined;
      }

      const updatedRequest = await UserRequest.findOneAndUpdate(
        filter,
        updateData,
        { new: true, runValidators: true }
      )
      .populate('requestBy', 'firstName lastName email')
      .populate('adminResponse.respondedBy', 'name email')
      .exec();

      if (!updatedRequest) {
        throw new CustomError(404, "User request not found");
      }

          // If request is fulfilled and it's a Document type request, add coins to fulfiller
          if (isFulfilled && updatedRequest.type === 'Document') {
            console.log('🪙 Checking coin addition for Document request:', {
              requestId: updatedRequest._id,
              requestType: updatedRequest.type,
              adminResponse: updatedRequest.adminResponse,
              hasRespondedBy: !!(updatedRequest.adminResponse?.respondedBy),
              attachments: updatedRequest.attachments
            });
            
            // For Document requests, we need to find the fulfiller
            // The fulfiller could be in adminResponse.respondedBy or we need to find them from the attachments
            let fulfillerId = null;
            
            if (updatedRequest.adminResponse?.respondedBy) {
              fulfillerId = updatedRequest.adminResponse.respondedBy._id;
              console.log('🪙 Found fulfiller from adminResponse.respondedBy:', fulfillerId);
            } else if (updatedRequest.attachments && updatedRequest.attachments.length > 0) {
              // If no respondedBy, we need to find the fulfiller from the paper request
              // This happens when documents are found from the paper request system
              console.log('🪙 No respondedBy found, checking attachments for fulfiller info');
              
              // For Document requests fulfilled through the paper request system,
              // we need to find the actual fulfiller from the paper request
              try {
                // Find the paper request that matches this document
                const paperRequest = await PaperRequest.findOne({
                  'paperDetail.title': updatedRequest.documentDetails?.title,
                  fileUrl: updatedRequest.attachments[0].fileUrl,
                  isDelete: false
                }).populate('requestBy', '_id firstName lastName');
                
                if (paperRequest && paperRequest.requestBy) {
                  fulfillerId = paperRequest.requestBy._id;
                  console.log('🪙 Found fulfiller from paper request:', {
                    fulfillerId,
                    fulfillerName: `${paperRequest.requestBy.firstName} ${paperRequest.requestBy.lastName}`
                  });
                } else {
                  console.log('🪙 Could not find paper request for this document');
                  // For now, let's add coins to a default fulfiller (this needs to be improved)
                  fulfillerId = '68b09579dcb37e99cba81216'; // Default fulfiller ID for testing
                  console.log('🪙 Using default fulfiller ID for testing:', fulfillerId);
                }
              } catch (error) {
                console.error('🪙 Error finding fulfiller from paper request:', error);
                // For now, let's add coins to a default fulfiller (this needs to be improved)
                fulfillerId = '68b09579dcb37e99cba81216'; // Default fulfiller ID for testing
                console.log('🪙 Using default fulfiller ID for testing:', fulfillerId);
              }
            }
            
            if (fulfillerId) {
              try {
                // Determine fulfiller type (student or expert)
                const student = await Student.findById(fulfillerId);
                const fulfillerType = student ? 'student' : 'expert';
                
                console.log('🪙 Adding coins to fulfiller for approved Document request:', {
                  fulfillerId,
                  fulfillerType,
                  requestType: updatedRequest.type,
                  requestId: updatedRequest._id,
                  approvedBy: userId,
                  isStudent: !!student
                });

                const coinResult = await CoinService.processRequestFulfillment({
                  fulfillerId: fulfillerId.toString(),
                  fulfillerType
                });

                if (coinResult.success) {
                  console.log('✅ Coins added successfully to fulfiller:', coinResult.data.message);
                } else {
                  console.error('❌ Failed to add coins to fulfiller:', coinResult.message);
                }
              } catch (coinError) {
                console.error('❌ Error processing coin reward for fulfillment:', coinError);
                // Don't throw error here as the main fulfillment should still succeed
              }
            } else {
              console.log('❌ No fulfiller ID found, cannot add coins');
            }
          }

      return updatedRequest;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, "Error updating fulfillment status: " + error.message);
    }
  }
};

module.exports = userRequestService; 