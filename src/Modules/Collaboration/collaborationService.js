const DatabaseService = require("../../Service/DbService");
const Collaboration = require("./collaborationModel");

const model = new DatabaseService(Collaboration);

const collaborationService = {
  createCollaboration: async (data) => {
    const newCollaboration = await model.save(data);
    return newCollaboration;
  },

  getAllCollaborations: async (data) => {
    const { userType = 'USER', search } = data;
    const query = { isDelete: false, userType };

    let savedData, totalCount=0;
    if (search) {
      const searchCondition = {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      };

      savedData = await model.getAllDocuments(
        { ...query, ...searchCondition },
        data
      );
      totalCount = await model.totalCounts({...query,...searchCondition });
    } else {
      savedData = await model.getAllDocuments(query, data);
      totalCount = await model.totalCounts(query);
    }

    return { savedData, totalCount };
  },

  getCollaborationById: async (paperId) => {
    return await model.getDocumentById({ _id :paperId });
  },

  updateCollaboration: async (paperId, updateData) => {
    return await model.updateDocument({_id : paperId }, updateData, { new: true });
  },

  deleteCollaboration: async (paperId) => {
    return await model.deleteDocument({ _id :paperId });
  },

  getCollaborationsByStudentId: async (studentId, userType = 'USER') => {
    const filter = { createdBy: studentId, userType, isDelete: false };
    return await model.getAllDocuments(filter);
  },

  searchCollaborations: async (query, userType = 'USER') => {
    const searchCondition = {
      isDelete: false,
      userType,
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    };
    return await model.getAllDocuments(searchCondition);
  },

  // Admin methods
  getAllCollaborationsForAdmin: async (data) => {
    const { page = 1, limit = 10, search, isApproved, userType } = data;
    const skip = (page - 1) * limit;
    
    let query = { isDelete: false };
    
    // Add filters
    if (isApproved !== undefined) {
      query.isApproved = isApproved;
    }
    if (userType) {
      query.userType = userType;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const savedData = await model.getAllDocuments(query, { skip, limit });
    const totalCount = await model.totalCounts(query);

    return { savedData, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) };
  },

  getCollaborationByIdForAdmin: async (collaborationId) => {
    return await model.getDocumentById({ _id: collaborationId, isDelete: false });
  },

  approveCollaboration: async (collaborationId, adminId) => {
    return await model.updateDocument(
      { _id: collaborationId },
      { 
        isApproved: true, 
        approvedAt: new Date(),
        approvedBy: adminId,
        rejectionReason: null
      },
      { new: true }
    );
  },

  rejectCollaboration: async (collaborationId, adminId, rejectionReason) => {
    return await model.updateDocument(
      { _id: collaborationId },
      { 
        isApproved: false, 
        approvedAt: null,
        approvedBy: null,
        rejectionReason: rejectionReason
      },
      { new: true }
    );
  },

  getApprovedCollaborations: async (data) => {
    const { page = 1, limit = 10, search } = data;
    const skip = (page - 1) * limit;
    
    let query = { isDelete: false, isApproved: true };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const savedData = await model.getAllDocuments(query, { skip, limit });
    const totalCount = await model.totalCounts(query);

    return { savedData, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) };
  },
};

module.exports = collaborationService;
