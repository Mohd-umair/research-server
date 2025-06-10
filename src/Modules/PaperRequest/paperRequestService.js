// models
const DatabaseService = require("../../Service/DbService");
const PaperRequest = require("./PaperRequest");
const ResearchPaperModel = require("../ResearchPapers/researchPaperModel");
const Student = require("../Students/studentModel");

// initialisation of models
const model = new DatabaseService(PaperRequest);
const researchPapers = new DatabaseService(ResearchPaperModel);
const studentModel = new DatabaseService(Student);

// service and error layers import
const serviceHandler = require("../../Utils/serviceHandler");
const { chatService } = require("../Chats/ChatService");
const studentService = require("../Students/studentService");
const {
  researchPaperService,
} = require("../ResearchPapers/researchPaperService");
const CustomError = require("../../Errors/CustomError");
const uploadFileService = require("../../Utils/uploader");

// service layer
const paperRequestService = {
  createRequestResearchPaper: serviceHandler(async (data) => {
    const { DOI_number, requestBy, paperDetail } = data;
    const isResearchPaper = await researchPapers.getDocumentById({
      DOI_number,
    });

    if (isResearchPaper) {
      // callBotUser

      const botUsersArr = await studentService.getBotUsers();
      const randomIndex = Math.floor(
        Math.random() * botUsersArr.savedData.length
      );
      const botUser = botUsersArr.savedData[randomIndex];

      const chatPayload = {
        sender: botUser._id,
        recepient: requestBy,
        content: isResearchPaper.fileUrl,
      };

      await chatService.createChats(chatPayload);
      return;
    }

    const isResearchPaperRequest = await model.getDocumentById({
      DOI_number,
      requestBy,
    });
    if (isResearchPaperRequest && !isResearchPaper) {
      throw new CustomError(400, "Request Already Exists");
    }
    const newResearchPaperRequest = await model.save({
      DOI_number,
      requestBy,
      paperDetail,
    });
    return newResearchPaperRequest;
  }),

  approveRequestResearchPaper: serviceHandler(async (data) => {
    const { requestId, createdBy, fulfilledBy } = data;
    const isStudent = await studentModel.getDocumentById({ _id: createdBy });
    if (!isStudent) throw new CustomError(400, "Student doesn't exist");
    const studentPoints = isStudent?.points;

    if (studentPoints <= 0)
      throw new CustomError(400, "Not Enough Points Available");

    const filter = { _id: requestId };
    const updatePayload = { requestStatus: "approved" };
    const populate = [{ path: "requestBy" }];
    const options = { new: true, populate };

    const updatedRequest = await model.updateDocument(
      filter,
      updatePayload,
      options
    );
    const promises = [];
    if (updatedRequest.requestStatus === "approved") {
      const filter = { _id: createdBy };
      const payload = { $inc: { points: -10 } };
      promises.push(studentModel.updateDocument(filter, payload));

      const approvedByfilter = { _id: fulfilledBy };
      const approvalPayload = { $inc: { points: -10 } };
      promises.push(
        studentModel.updateDocument(approvedByfilter, approvalPayload)
      );
      await Promise.all(promises);
    }

    return updatedRequest;
  }),

  getAllRequestResearchPapers: serviceHandler(async (data) => {
    const query = { requestStatus: data.requestStatus ?? "pending" };
    if (data.userId) {
      query.requestBy = data.userId;
    }
    data.populate = [{ path: "requestBy" }];
    const allRequests = await model.getAllDocuments(query, data);
    const totalCounts = await model.totalCounts(query);
    return { allRequests, totalCounts };
  }),
  uploadRequestPaper: serviceHandler(async (data) => {
    const { requestId, requestBy, file, createdBy } = data;
    const uploadedPaper = await uploadFileService.uploadFile(file?.file, "PDF");

    const filter = { _id: requestId };
    const updatePayload = {
      requestStatus: "inProgress",

      fulfilledBy: createdBy,
      fileUrl: uploadedPaper.Location,
    };
    const populate = [{ path: "requestBy" }];

    const option = { new: true, populate };

    return await model.updateDocument(filter, updatePayload, option);
  }),

  getRequestDetailById: serviceHandler(async (data) => {
    const { requestId } = data;
    const populateOptions = [
      {
        path: "requestBy",
      },
    ];
    const requestData = await model.getDocumentById(
      { _id: requestId },
      populateOptions
    );
    return requestData;
  }),

  rejectRequest: serviceHandler(async (data) => {
    const { requestId } = data;
    const filter = { _id: requestId };
    const payload = { requestStatus: "pending", fileUrl: "" };
    const populate = [{ path: "requestBy" }];
    const options = { new: true, populate };
    const rejectedRequest = await model.updateDocument(
      filter,
      payload,
      options
    );

    return rejectedRequest;
  }),
};

module.exports = paperRequestService;
