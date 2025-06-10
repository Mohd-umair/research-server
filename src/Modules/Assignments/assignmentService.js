const DbService = require("../../Service/DbService");
const serviceHandler = require("../../Utils/serviceHandler");
const Assignment = require("./assignmentModel");
const model = new DbService(Assignment);

const AssignmentService = {
  create: serviceHandler(async (data) => {
    return await model.save(data);
  }),

  getAll: serviceHandler(async (data) => {
    const query = { isDelete: false };
    const savedData = await model.getAllDocuments(query, data);
    const totalCount = await model.totalCounts({ isDelete: false });
    return { savedData, totalCount };
  }),
  getById: serviceHandler(async (dataId) => {
    const { assignmentId } = dataId;
    const query = { isDelete: false, _id: assignmentId };
    const savedDataById = await model.getDocumentById(query);
    return savedDataById;
  }),
  update: serviceHandler(async (updateData) => {
    const { assignmentId } = updateData;
    const filter = { _id: assignmentId };
    const updatePayload = { ...updateData };
    const updatedDoc = await model.updateDocument(filter, updatePayload);
    return updatedDoc;
  }),
  delete: serviceHandler(async (deleteId) => {
    const { assignmentId } = deleteId;
    const deletedDoc = await model.updateDocument(
      { _id: assignmentId },
      { isDelete: true }
    );
    return deletedDoc;
  }),
};

module.exports = AssignmentService;
