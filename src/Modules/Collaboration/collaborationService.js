const DatabaseService = require("../../Service/DbService");
const Collaboration = require("./collaborationModel");

const model = new DatabaseService(Collaboration);

const collaborationService = {
  createCollaboration: async (data) => {
    const newCollaboration = await model.save(data);
    return newCollaboration;
  },

  getAllCollaborations: async (data) => {
    const query = { isDelete: false };
    const { search } = data;

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

  getCollaborationsByStudentId: async (studentId) => {
    const filter = { createdBy: studentId };
    return await model.getAllDocuments(filter);
  },
};

module.exports = collaborationService;
