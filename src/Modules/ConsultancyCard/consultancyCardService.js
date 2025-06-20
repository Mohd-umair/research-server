const DatabaseService = require("../../Service/DbService");
const serviceHandler = require("../../Utils/serviceHandler");
const ConsultancyCard = require("./consultancyCardModel");

const model = new DatabaseService(ConsultancyCard);

const consultancyCardService = {
  create: serviceHandler(async (data) => {
    console.log('Creating consultancy card with data:', data);
    
    // Validation: Ensure teacherId and createdBy are provided and match
    if (!data.teacherId || !data.createdBy) {
      throw new Error("Teacher ID and Created By are required for consultancy card creation");
    }
    
    if (data.teacherId !== data.createdBy) {
      throw new Error("Teacher ID must match the logged-in user ID");
    }
    
    // Ensure isApproved is always false for new consultancy cards
    const payload = { 
      ...data, 
      teacherId: data.teacherId, // Use the validated teacherId directly
      createdBy: data.createdBy, // Keep createdBy for auditing
      isApproved: false, // Force to false regardless of client input
      status: data.status || 'pending', // Default to pending if not provided
      submittedAt: data.submittedAt || new Date(),
      lastModified: new Date()
    };
    
    // Remove any admin-only fields that shouldn't be set by users
    delete payload.approvedBy;
    delete payload.approvedAt;
    delete payload.rejectionReason;
    delete payload.approvalComments;
    
    console.log('Final payload for consultancy card creation:', {
      ...payload,
      teacherId: payload.teacherId,
      title: payload.title
    });
    
    return await model.save(payload);
  }),

  getAll: serviceHandler(async (data) => {
    const { search = "", userRole, createdBy, skip = 0, limit = 10, includeUnapproved = false } = data;

    // Ensure createdBy is provided for user filtering
    if (!createdBy) {
      throw new Error("User ID (createdBy) is required for filtering consultancy cards");
    }

    const query = { 
      isDelete: false,
      teacherId: createdBy // Filter by current user - only show their own consultancy cards
    };
    
    // For regular users, only show their own cards regardless of approval status
    // For admins reviewing, they might want to see all cards
    if (!includeUnapproved && userRole !== 'admin') {
      // Regular users see all their cards (approved and pending)
      // No additional filter needed since they should see their own submissions
    }
    
    console.log('ConsultancyCard filter query:', query);
    
    // Apply search filter
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Set up pagination options
    const options = {
      populate: [
        { path: "teacherId" },
        { path: "approvedBy", select: "firstName lastName email" }
      ],
      skip: parseInt(skip),
      limit: parseInt(limit),
      sort: { createdAt: -1 } // Sort by newest first
    };

    // Get total count for pagination
    const totalCount = await ConsultancyCard.countDocuments(query);
    
    // Get paginated results
    const results = await model.getAllDocuments(query, options);

    console.log(`Found ${results.length} consultancy cards for user ${createdBy}`);

    return {
      data: results,
      totalCount: totalCount,
      currentPage: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: skip + limit < totalCount,
      hasPrevPage: skip > 0
    };
  }),

  // Admin method to get all consultancy cards for approval
  getAllForApproval: serviceHandler(async (data) => {
    const { search = "", skip = 0, limit = 10, status = 'pending' } = data;

    const query = { 
      isDelete: false,
      status: status // Filter by approval status
    };
    
    console.log('Getting consultancy cards for approval with query:', query);
    
    // Apply search filter
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Set up pagination options
    const options = {
      populate: [
        { path: "teacherId", select: "firstName lastName email" },
        { path: "approvedBy", select: "firstName lastName email" }
      ],
      skip: parseInt(skip),
      limit: parseInt(limit),
      sort: { submittedAt: 1 } // Sort by oldest pending first
    };

    // Get total count for pagination
    const totalCount = await ConsultancyCard.countDocuments(query);
    
    // Get paginated results
    const results = await model.getAllDocuments(query, options);

    console.log(`Found ${results.length} consultancy cards with status: ${status}`);

    return {
      data: results,
      totalCount: totalCount,
      currentPage: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: skip + limit < totalCount,
      hasPrevPage: skip > 0
    };
  }),

  // Admin method to approve a consultancy card
  approve: serviceHandler(async (data) => {
    const { consultancyCardId, approvedBy, comments } = data;
    
    const updateData = {
      isApproved: true,
      status: 'approved',
      approvedBy: approvedBy,
      approvedAt: new Date(),
      lastModified: new Date()
    };
    
    if (comments) {
      updateData.approvalComments = comments;
    }
    
    const query = { _id: consultancyCardId };
    console.log('Approving consultancy card:', consultancyCardId);
    
    return await model.updateDocument(query, updateData);
  }),

  // Admin method to reject a consultancy card
  reject: serviceHandler(async (data) => {
    const { consultancyCardId, rejectedBy, rejectionReason } = data;
    
    const updateData = {
      isApproved: false,
      status: 'rejected',
      approvedBy: rejectedBy, // Track who rejected it
      rejectionReason: rejectionReason,
      lastModified: new Date()
    };
    
    const query = { _id: consultancyCardId };
    console.log('Rejecting consultancy card:', consultancyCardId, 'Reason:', rejectionReason);
    
    return await model.updateDocument(query, updateData);
  }),

  getById: serviceHandler(async (data) => {
    const { consultancyCardId } = data;
    const query = { _id: consultancyCardId };
    const populateOptions = [
      { path: "teacherId" },
      { path: "approvedBy", select: "firstName lastName email" }
    ];
    return await model.getDocumentById(query, populateOptions);
  }),

  getUserConsultancyCard: serviceHandler(async (teacherId) => {
    const query = { teacherId: teacherId, isDelete: false }; // Assuming userId is a field in the model
    return await model.getAllDocuments(query);
  }),

  update: serviceHandler(async (data) => {
    const { consultancyCardId, loggedInUserId, ...updateData } = data; // Extract ID, logged-in user ID, and other fields
    
    // Security: First, verify that the consultancy card belongs to the logged-in user
    const existingCard = await ConsultancyCard.findById(consultancyCardId);
    if (!existingCard) {
      throw new Error("Consultancy card not found");
    }
    
    if (existingCard.teacherId.toString() !== loggedInUserId) {
      throw new Error("Access denied. You can only update your own consultancy cards.");
    }
    
    // When a user updates their consultancy card, reset approval status
    updateData.isApproved = false;
    updateData.status = 'pending';
    updateData.lastModified = new Date();
    
    // Clear approval fields since it needs re-approval
    updateData.approvedBy = undefined;
    updateData.approvedAt = undefined;
    updateData.rejectionReason = undefined;
    updateData.approvalComments = undefined;
    
    // Ensure teacherId cannot be changed
    delete updateData.teacherId;
    delete updateData.createdBy;
    
    const query = { _id: consultancyCardId };
    console.log('Updating consultancy card - resetting approval status:', consultancyCardId);
    
    return await model.updateDocument(query, updateData);
  }),

  delete: serviceHandler(async (data) => {
    const { consultancyCardId } = data;
    const query = { _id: consultancyCardId };
    return await model.deleteDocument(query);
  }),

  // Public method to get approved consultancies for home page display with MongoDB lookup
  getApprovedConsultancies: serviceHandler(async (data) => {
    const { search = "", skip = 0, limit = 6 } = data;

    // Step 1: MongoDB query to fetch only approved consultancies
    const query = { 
      isDelete: false,
      isApproved: true,
      status: 'approved',
      teacherId: { $exists: true, $ne: null } // Ensure teacherId exists for lookup
    };
    
    console.log('🔍 Getting approved consultancy cards with MongoDB lookup, query:', query);
    
    // Apply search filter to consultancy fields
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    // Step 2: MongoDB aggregation pipeline for optimized lookup
    const aggregationPipeline = [
      // Match the query criteria
      { $match: query },
      
      // Perform lookup to join with teachers collection
      {
        $lookup: {
          from: "teachers", // Collection name (lowercase, pluralized)
          localField: "teacherId",
          foreignField: "_id",
          as: "teacher"
        }
      },
      
      // Unwind the teacher array (since it's a single teacher per consultancy)
      { $unwind: "$teacher" },
      
      // Filter out consultancies where teacher is deleted or inactive
      {
        $match: {
          "teacher.isDelete": { $ne: true },
          "teacher.isActive": { $ne: false }
        }
      },
      
      // Project only the fields we need for better performance
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          pricing: 1,
          imagePath: 1,
          status: 1,
          isApproved: 1,
          createdAt: 1,
          approvedAt: 1,
          // Teacher information - extracting firstName and lastName
          "teacher._id": 1,
          "teacher.firstName": 1,
          "teacher.lastName": 1,
          "teacher.email": 1,
          "teacher.profileImage": 1,
          "teacher.qualification": 1,
          "teacher.experience": 1,
          "teacher.aboutTeacher": 1,
          "teacher.phoneNumber": 1
        }
      },
      
      // Sort by most recently approved first
      { $sort: { approvedAt: -1, createdAt: -1 } },
      
      // Apply pagination
      { $skip: parseInt(skip) },
      { $limit: parseInt(limit) }
    ];

    try {
      // Execute aggregation pipeline
      const results = await ConsultancyCard.aggregate(aggregationPipeline);
      
      // Get total count for pagination (separate query for performance)
      const totalCount = await ConsultancyCard.countDocuments(query);

      // Step 3: Transform data for frontend consumption with enhanced teacher info
      const transformedResults = results.map(consultancy => ({
        _id: consultancy._id,
        id: consultancy._id.toString(), // Backwards compatibility
        title: consultancy.title,
        description: consultancy.description,
        pricing: consultancy.pricing,
        imagePath: consultancy.imagePath,
        status: consultancy.status,
        isApproved: consultancy.isApproved,
        createdAt: consultancy.createdAt,
        approvedAt: consultancy.approvedAt,
        
        // Enhanced teacher information from MongoDB lookup
        teacher: {
          _id: consultancy.teacher._id,
          firstName: consultancy.teacher.firstName,
          lastName: consultancy.teacher.lastName,
          fullName: `${consultancy.teacher.firstName} ${consultancy.teacher.lastName}`,
          email: consultancy.teacher.email,
          profilePicture: consultancy.teacher.profileImage, // Note: using profileImage from teacher model
          specialization: consultancy.teacher.qualification, // Using qualification as specialization
          rating: 4.5, // Default rating - can be enhanced later
          bio: consultancy.teacher.aboutTeacher,
          experience: consultancy.teacher.experience ? `${consultancy.teacher.experience}+ Years` : 'Experienced',
          phoneNumber: consultancy.teacher.phoneNumber
        },
        
        // Keep original teacherId structure for backwards compatibility
        teacherId: {
          _id: consultancy.teacher._id,
          firstName: consultancy.teacher.firstName,
          lastName: consultancy.teacher.lastName,
          email: consultancy.teacher.email,
          profileImage: consultancy.teacher.profileImage
        }
      }));

      return {
        data: transformedResults,
        totalCount: totalCount,
        validCount: results.length,
        currentPage: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: skip + limit < totalCount,
        hasPrevPage: skip > 0,
        message: `Successfully fetched ${results.length} approved consultancies with teacher information`
      };

    } catch (error) {
      console.error('❌ Error in getApprovedConsultancies with MongoDB lookup:', error);
      throw new Error(`Failed to fetch approved consultancies: ${error.message}`);
    }
  }),
};

module.exports = consultancyCardService;
