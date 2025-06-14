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
};

module.exports = collaborationService;
