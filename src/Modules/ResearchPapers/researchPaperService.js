const ResearchPaper = require("./researchPaperModel");
const DbService = require("../../Service/DbService");
const serviceHandler = require("../../Utils/serviceHandler");
const CustomError = require("../../Errors/CustomError");

const model = new DbService(ResearchPaper);

const researchPaperService = {
  create: serviceHandler(async (data) => {
    const { doiNumber } = data;
    const isResearchPaper = await model.getDocumentById({
      DOI_number: doiNumber,
    });

    if (isResearchPaper) {
      throw new CustomError(
        400,
        "Research Paper Already Exists With This DOI Number"
      );
    }

    const savedResearchPaper = await model.save(data);
    return savedResearchPaper;
  }),

  getAll: serviceHandler(async (data) => {
    const query = {};
    const savedData = await model.getAllDocuments(query, data);
    const totalCount = await model.totalCounts({});

    return { savedData, totalCount };
  }),
  getById: serviceHandler(async (dataId) => {
    const { researchPaperId } = dataId;
    const query = { isDelete: false, _id: researchPaperId };
    const savedDataById = await model.getDocumentById(query);
    return savedDataById;
  }),
  update: serviceHandler(async (updateData) => {
    const { researchPaperId } = updateData;
    const filter = { _id: researchPaperId };
    const updatePayload = { ...updateData };
    const updatedDoc = await model.updateDocument(filter, updatePayload);
    return updatedDoc;
  }),
  delete: serviceHandler(async (deleteId) => {
    const { researchPaperId } = deleteId;
    const deletedDoc = await model.updateDocument(
      { _id: researchPaperId },
      { isDelete: true }
    );
    return deletedDoc;
  }),

  getByDOInumber: serviceHandler(async (data) => { return data}),
};
module.exports = { researchPaperService };
