const UserRequest = require("./userRequestModel");
const CustomError = require("../../Errors/CustomError");
const PaperRequest = require("../PaperRequest/PaperRequest");
const CoinService = require("../Coins/coinService");
const Student = require("../Students/studentModel");
const notificationService = require("../Notifications/notificationService");

const userRequestService = {
  // Create a new user request
  createRequest: async (requestData) => {
    try {
      let foundPaperRequest = null;
      
      // DISABLED: Auto-approval feature - now all requests go through admin approval
      // Check if this is a document request with DOI or title
      if (false && requestData.type === 'Document' && requestData.documentDetails && 
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
      const populatedRequest = await UserRequest.findById(savedRequest._id)
        .populate('requestBy', 'firstName lastName email')
        .exec();

      // Create notifications for all other students
      try {
        // Get the request creator's info
        const requestCreator = populatedRequest.requestBy;
        const creatorName = requestCreator ? 
          `${requestCreator.firstName} ${requestCreator.lastName}` : 
          'Someone';

        // Get request details for notification
        const requestTitle = requestData.title || 
          (requestData.documentDetails?.title) || 
          'a new request';
        
        const requestType = requestData.type || 'Request';

        // Get all students except the request creator
        const allStudents = await Student.find({
          _id: { $ne: requestData.requestBy },
          isDelete: false,
          isActive: true,
          userType: 'USER' // Exclude bot users
        }).select('_id').lean();

        console.log(`📢 Creating notifications for ${allStudents.length} students about new request`);

        // Create notification for each student
        const notificationPromises = allStudents.map(student => {
          return notificationService.createNotification({
            recipient: student._id,
            recipientModel: 'Teacher',
            type: 'NEW_REQUEST',
            title: 'New Research Request',
            message: `${creatorName} created a new ${requestType.toLowerCase()} request: "${requestTitle}"`,
            relatedEntity: {
              entityType: 'UserRequest',
              entityId: savedRequest._id
            },
            triggeredBy: requestData.requestBy,
            priority: 'medium',
            actionUrl: `/user-dashboard/request`,
            metadata: {
              requestType: requestData.type,
              requestTitle: requestTitle,
              creatorName: creatorName
            }
          });
        });

        // Execute all notifications in parallel
        await Promise.all(notificationPromises);
        console.log(`✅ Notifications created for ${allStudents.length} students`);

      } catch (notificationError) {
        console.error('❌ Error creating notifications for new request:', notificationError);
        // Don't throw error - notification failure shouldn't prevent request creation
      }

      return populatedRequest;
      
    } catch (error) {
      console.error("Error in createRequest:", error);
      throw new CustomError(500, error.message || "Failed to create request");
    }
  },

  // Get all requests with optional filtering
  getAllRequests: async (options = {}) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status, 
        type, 
        userId,
        search 
      } = options;

      // Build query
      const query = { isDeleted: false };
      
      if (status) {
        query.status = status;
      }
      
      if (type) {
        query.type = type;
      }

      if (userId) {
        query.requestBy = userId;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;

      const [requests, totalCount] = await Promise.all([
        UserRequest.find(query)
          .populate('requestBy', 'firstName lastName email profilePicture')
          .populate('adminResponse.respondedBy', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        UserRequest.countDocuments(query)
      ]);

      return {
        requests,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          limit,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error("Error in getAllRequests:", error);
      throw new CustomError(500, error.message || "Failed to fetch requests");
    }
  },

  // Get all unfulfilled requests for website (public)
  getAllUnfulfilledRequestsForWebsite: async (options = {}) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        type,
        priority,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Build query for unfulfilled requests
      // Show approved requests that haven't been fulfilled yet
      const query = {
        status: 'Approved', // Only approved requests
        isFulfilled: false, // Not yet fulfilled by community
        isDeleted: false
      };

      // Add filters
      if (type) {
        query.type = type;
      }

      if (priority) {
        query.priority = priority;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'documentDetails.title': { $regex: search, $options: 'i' } },
          { 'documentDetails.author': { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      const skip = (page - 1) * limit;

      const [requests, totalCount] = await Promise.all([
        UserRequest.find(query)
          .populate('requestBy', 'firstName lastName email profilePicture')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        UserRequest.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: requests,
        totalCount,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      };
    } catch (error) {
      console.error("Error in getAllUnfulfilledRequestsForWebsite:", error);
      throw new CustomError(500, error.message || "Failed to fetch unfulfilled requests");
    }
  },

  // Get request by ID
  getRequestById: async (requestId) => {
    try {
      const request = await UserRequest.findById(requestId)
        .populate('requestBy', 'firstName lastName email profilePicture phoneNumber')
        .populate('adminResponse.respondedBy', 'firstName lastName email')
        .lean();

      if (!request) {
        throw new CustomError(404, "Request not found");
      }

      return request;
    } catch (error) {
      console.error("Error in getRequestById:", error);
      throw new CustomError(error.status || 500, error.message || "Failed to fetch request");
    }
  },

  // Update request status
  updateRequestStatus: async (requestId, updateData) => {
    try {
      const request = await UserRequest.findByIdAndUpdate(
        requestId,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('requestBy', 'firstName lastName email')
        .populate('adminResponse.respondedBy', 'firstName lastName email');

      if (!request) {
        throw new CustomError(404, "Request not found");
      }

      return request;
    } catch (error) {
      console.error("Error in updateRequestStatus:", error);
      throw new CustomError(error.status || 500, error.message || "Failed to update request");
    }
  },

  // Delete request (soft delete)
  deleteRequest: async (requestId) => {
    try {
      const request = await UserRequest.findByIdAndUpdate(
        requestId,
        { isDeleted: true },
        { new: true }
      );

      if (!request) {
        throw new CustomError(404, "Request not found");
      }

      return { message: "Request deleted successfully" };
    } catch (error) {
      console.error("Error in deleteRequest:", error);
      throw new CustomError(error.status || 500, error.message || "Failed to delete request");
    }
  },

  // Fulfill a request
  fulfillRequest: async (requestId, fulfillmentData) => {
    try {
      const { responseMessage, respondedBy, attachments } = fulfillmentData;

      const updateData = {
        status: 'Approved',
        'adminResponse.responseMessage': responseMessage,
        'adminResponse.respondedBy': respondedBy,
        'adminResponse.responseDate': new Date()
      };

      if (attachments && attachments.length > 0) {
        updateData.$push = { attachments: { $each: attachments } };
      }

      const request = await UserRequest.findByIdAndUpdate(
        requestId,
        updateData,
        { new: true, runValidators: true }
      )
        .populate('requestBy', 'firstName lastName email')
        .populate('adminResponse.respondedBy', 'firstName lastName email');

      if (!request) {
        throw new CustomError(404, "Request not found");
      }

      return request;
    } catch (error) {
      console.error("Error in fulfillRequest:", error);
      throw new CustomError(error.status || 500, error.message || "Failed to fulfill request");
    }
  },

  // Confirm document fulfillment (user acknowledges they received the document)
  // Update fulfillment status (wrapper for confirmFulfillment)
  updateFulfillmentStatus: async (requestId, isFulfilled, userId) => {
    try {
      // Get the request details first to find who fulfilled it
      const request = await UserRequest.findOne({
        _id: requestId,
        requestBy: userId
      }).populate('requestBy', 'firstName lastName email');

      if (!request) {
        throw new CustomError(404, "Request not found");
      }

      // Find who uploaded the document by checking PaperRequest
      let fulfillerId = null;
      let fulfillerName = "Someone";
      
      try {
        const paperRequest = await PaperRequest.findOne({ requestBy: requestId });
        if (paperRequest && paperRequest.fulfilledBy) {
          fulfillerId = paperRequest.fulfilledBy;
          
          // Get fulfiller's name
          const fulfiller = await Student.findById(fulfillerId);
          if (fulfiller) {
            fulfillerName = `${fulfiller.firstName} ${fulfiller.lastName}`;
          }
        }
      } catch (error) {
        console.error('Error finding fulfiller:', error);
      }

      const requesterName = request.requestBy ? 
        `${request.requestBy.firstName} ${request.requestBy.lastName}` : 
        'Someone';
      const requestTitle = request.title || request.documentDetails?.title || 'Your request';

      if (isFulfilled) {
        // If marking as fulfilled, use confirmFulfillment to award coins
        const result = await userRequestService.confirmFulfillment(requestId, userId);
        
        // Send approval notification to fulfiller
        if (fulfillerId) {
          try {
            await notificationService.createFulfillmentApprovedNotification({
              fulfillerId: fulfillerId,
              requesterName: requesterName,
              requestTitle: requestTitle,
              userRequestId: requestId,
            });
            console.log(`✅ Fulfillment approval notification sent to user ${fulfillerId}`);
          } catch (notificationError) {
            console.error('Error creating fulfillment approval notification:', notificationError);
          }
        }
        
        return result.request;
      } else {
        // If marking as not fulfilled, just update the status back to pending
        const updatedRequest = await UserRequest.findOneAndUpdate(
          {
            _id: requestId,
            requestBy: userId
          },
          {
            isFulfilled: false,
            status: 'Pending',
            $unset: { 
              'adminResponse.responseMessage': 1,
              'adminResponse.respondedBy': 1,
              'adminResponse.responseDate': 1
            },
            attachments: [] // Clear attachments
          },
          { new: true }
        )
          .populate('requestBy', 'firstName lastName email')
          .populate('adminResponse.respondedBy', 'firstName lastName email');

        if (!updatedRequest) {
          throw new CustomError(404, "Request not found");
        }

        // Send rejection notification to fulfiller
        if (fulfillerId) {
          try {
            await notificationService.createFulfillmentRejectedNotification({
              fulfillerId: fulfillerId,
              requesterName: requesterName,
              requestTitle: requestTitle,
              userRequestId: requestId,
            });
            console.log(`✅ Fulfillment rejection notification sent to user ${fulfillerId}`);
          } catch (notificationError) {
            console.error('Error creating fulfillment rejection notification:', notificationError);
          }
        }

        return updatedRequest;
      }
    } catch (error) {
      console.error("Error in updateFulfillmentStatus:", error);
      throw new CustomError(error.status || 500, error.message || "Failed to update fulfillment status");
    }
  },

  // Confirm document fulfillment (user acknowledges they received the document)
  confirmFulfillment: async (requestId, userId) => {
    try {
      // Find the request
      const request = await UserRequest.findOne({
        _id: requestId,
        requestBy: userId,
        status: 'Approved',
        isFulfilled: false
      }).populate('adminResponse.respondedBy', 'firstName lastName email');

      if (!request) {
        throw new CustomError(404, "Request not found or already confirmed");
      }

      // Mark as fulfilled
      request.isFulfilled = true;
      await request.save();

      // Award coins to the person who fulfilled the request
      if (request.adminResponse && request.adminResponse.respondedBy) {
        const fulfillerId = request.adminResponse.respondedBy._id || request.adminResponse.respondedBy;
        
        // Determine user type based on respondedByModel
        const fulfillerType = request.adminResponse.respondedByModel === 'Student' ? 'student' : 'expert';
        
        try {
          // Award 10 coins for fulfilling a request
          await CoinService.addCoins({
            userId: fulfillerId,
            userType: fulfillerType,
            amount: 10,
            source: 'request_fulfillment',
            description: `Fulfilled research request: "${request.title || request.documentDetails?.title || 'Document Request'}"`,
            metadata: {
              requestId: requestId,
              requestType: request.type,
              confirmedBy: userId
            }
          });

          console.log(`✅ Awarded 10 coins to ${fulfillerType} ${fulfillerId} for fulfilling request ${requestId}`);
        } catch (coinError) {
          console.error('Error awarding coins:', coinError);
          // Don't throw error - confirmation should succeed even if coin award fails
        }
      }

      return {
        success: true,
        message: "Request fulfillment confirmed. Coins have been awarded to the contributor.",
        request
      };
    } catch (error) {
      console.error("Error in confirmFulfillment:", error);
      throw new CustomError(error.status || 500, error.message || "Failed to confirm fulfillment");
    }
  },

  // Get user's own requests
  getUserRequests: async (userId, options = {}) => {
    try {
      const { page = 1, limit = 10, status, type } = options;

      const query = {
        requestBy: userId,
        isDeleted: false
      };

      if (status) {
        query.status = status;
      }

      if (type) {
        query.type = type;
      }

      const skip = (page - 1) * limit;

      const [requests, totalCount] = await Promise.all([
        UserRequest.find(query)
          .populate('adminResponse.respondedBy', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        UserRequest.countDocuments(query)
      ]);

      return {
        requests,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          limit
        }
      };
    } catch (error) {
      console.error("Error in getUserRequests:", error);
      throw new CustomError(500, error.message || "Failed to fetch user requests");
    }
  },

  // Get statistics
  getStatistics: async () => {
    try {
      const [
        totalRequests,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        inProgressRequests
      ] = await Promise.all([
        UserRequest.countDocuments({ isDeleted: false }),
        UserRequest.countDocuments({ status: 'Pending', isDeleted: false }),
        UserRequest.countDocuments({ status: 'Approved', isDeleted: false }),
        UserRequest.countDocuments({ status: 'Rejected', isDeleted: false }),
        UserRequest.countDocuments({ status: 'In Progress', isDeleted: false })
      ]);

      return {
        total: totalRequests,
        pending: pendingRequests,
        approved: approvedRequests,
        rejected: rejectedRequests,
        inProgress: inProgressRequests
      };
    } catch (error) {
      console.error("Error in getStatistics:", error);
      throw new CustomError(500, error.message || "Failed to fetch statistics");
    }
  },

  // Search requests
  searchRequests: async (searchTerm, options = {}) => {
    try {
      const { page = 1, limit = 10, type, status } = options;

      const query = {
        isDeleted: false,
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { 'documentDetails.title': { $regex: searchTerm, $options: 'i' } },
          { 'documentDetails.author': { $regex: searchTerm, $options: 'i' } }
        ]
      };

      if (type) {
        query.type = type;
      }

      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;

      const [requests, totalCount] = await Promise.all([
        UserRequest.find(query)
          .populate('requestBy', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        UserRequest.countDocuments(query)
      ]);

      return {
        requests,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          limit
        }
      };
    } catch (error) {
      console.error("Error in searchRequests:", error);
      throw new CustomError(500, error.message || "Failed to search requests");
    }
  }
};

module.exports = userRequestService;
