const WebinarModel = require("./webinarModel");
const DbService = require("../../Service/DbService");
const serviceHandler = require("../../Utils/serviceHandler");
const CustomError = require("../../Errors/CustomError");
const model = new DbService(WebinarModel);

const webinarService = {
  create: serviceHandler(async (data) => {
    return await model.save(data);
  }),

  getAll: serviceHandler(async (data) => {
    const role = data.userRole;
    const query = { isDelete: false };
    if (role === "TEACHER") {
      query.createdBy = data.createdBy;
    }
    const { search } = data;
    if (search) {
      query.webinarTitle = { $regex: search, $options: "i" };
    }

    const savedData = await model.getAllDocuments(query);
    const totalCount = await model.totalCounts({ isDelete: false });
    console.log(savedData);
    
    return { savedData, totalCount };
  }),

  getById: serviceHandler(async (data) => {
    const { _id: webinarId } = data;
    const query = { _id: webinarId };
    const savedDataById = await model.getDocumentById(query);
    // if (typeof savedDataById !== 'object' || savedDataById === null) {
    //   throw new CustomError(400, "Webinar not found!");
    // }
    return savedDataById;
  }),

  update: serviceHandler(async (data) => {
    const { _id: webinarId } = data;
    const filter = { _id: webinarId };
    const updatePayload = { ...data };
    const updatedDoc = await model.updateDocument(filter, updatePayload);
    return updatedDoc;
  }),

  delete: serviceHandler(async (data) => {
    const { _id: webinarId } = data;
    const query = { _id: webinarId };
    const deletedDocDetails = await model.getDocumentById(query);
    const deletedDoc = await model.deleteDocument({ _id: webinarId });
    return deletedDocDetails;
  }),
};

const WebinarService = webinarService;
module.exports = WebinarService;