const Subject = require("./subjectModel");
const DbService = require("../../Service/DbService");
const serviceHandler = require("../../Utils/serviceHandler");
const CustomError = require("../../Errors/CustomError");
const model = new DbService(Subject);

const subjectService = {
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
    const { subjectId } = dataId;
    const query = { isDelete: false, _id: subjectId };
    const savedDataById = await model.getDocumentById(query);
    return savedDataById;
  }),
  update: serviceHandler(async (updateData) => {
    const { subjectId } = updateData;
    const filter = { _id: subjectId };
    const updatePayload = { ...updateData };
    const updatedDoc = await model.updateDocument(filter, updatePayload);
    return updatedDoc;
  }),
  delete: serviceHandler(async (deleteId) => {
    const { subjectId } = deleteId;
    const deletedDoc = await model.updateDocument(
      { _id: subjectId },
      { isDelete: true }
    );
    return deletedDoc;
  }),
};

const SubjectService = subjectService;

module.exports = SubjectService;
