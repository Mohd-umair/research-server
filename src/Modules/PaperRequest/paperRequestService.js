// models
const DatabaseService = require("../../Service/DbService");
const PaperRequest = require("./PaperRequest");
const ResearchPaperModel = require("../ResearchPapers/researchPaperModel");
const Student = require("../Students/studentModel");
const UserRequest = require("../UserRequest/userRequestModel");

// initialisation of models
const model = new DatabaseService(PaperRequest);
const researchPapers = new DatabaseService(ResearchPaperModel);
const studentModel = new DatabaseService(Student);
const userRequestModel = new DatabaseService(UserRequest);

// service and error layers import
const serviceHandler = require("../../Utils/serviceHandler");
const { chatService } = require("../Chats/ChatService");
const studentService = require("../Students/studentService");
const {
  researchPaperService,
} = require("../ResearchPapers/researchPaperService");
const CustomError = require("../../Errors/CustomError");
const uploadFileService = require("../../Utils/uploader");
const { sendCustomEmail } = require("../../Utils/mailer");
const notificationService = require("../Notifications/notificationService");

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

  fulfillUserRequestWithDocument: serviceHandler(async (data) => {
    const { userRequestId, uploadedBy, fileUrl, publicId, paperDetail } = data;

    try {
      // Validate that we have the file URL from Cloudinary
      if (!fileUrl) {
        throw new CustomError(500, "File URL is required");
      }

      // Generate DOI if not provided
      const doiNumber = paperDetail.doi || `DOI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Get the original user request to access user details
      const originalRequest = await userRequestModel.getDocumentById(
        { _id: userRequestId },
        [{ path: 'requestBy', select: 'firstName lastName email' }]
      );

      if (!originalRequest) {
        throw new CustomError(404, "Original user request not found");
      }

      // If requestBy is not populated, get it directly
      if (!originalRequest.requestBy || !originalRequest.requestBy._id) {
        const rawRequest = await userRequestModel.getDocumentById({ _id: userRequestId });
        if (rawRequest?.requestBy) {
          originalRequest.requestBy = { _id: rawRequest.requestBy };
        }
      }

      // Get uploader information
      let uploaderName = "Someone";
      if (uploadedBy) {
        try {
          const uploader = await studentModel.getDocumentById({ _id: uploadedBy });
          if (uploader) {
            uploaderName = `${uploader.firstName} ${uploader.lastName}`;
          }
        } catch (error) {
          console.error("Error fetching uploader details:", error);
          // Continue with default "Someone"
        }
      }

      // Create new PaperRequest entry
      const newPaperRequest = await model.save({
        requestBy: userRequestId, // This links to the original user request
        fulfilledBy: uploadedBy,
        paperDetail: {
          title: paperDetail.title,
          authors: paperDetail.authors,
          doi: doiNumber
        },
        DOI_number: doiNumber,
        fileUrl: fileUrl, // Cloudinary URL
        cloudinaryPublicId: publicId, // Store for future deletion if needed
        requestStatus: "approved" // Since we're providing the document, it's approved
      });

      // Update the original UserRequest status to "Approved" and add admin response
      await userRequestModel.updateDocument(
        { _id: userRequestId },
        {
          status: "Approved",
          'adminResponse.responseMessage': `Your document request has been fulfilled. Document: "${paperDetail.title}" has been uploaded and is now available.`,
          'adminResponse.respondedBy': uploadedBy,
          'adminResponse.responseDate': new Date(),
          // Add attachment information to the user request
          $push: {
            attachments: {
              fileName: `${paperDetail.title}.pdf`,
              fileUrl: fileUrl,
              fileType: 'application/pdf',
              uploadedAt: new Date()
            }
          }
        }
      );

      // Create notification for the request owner
      try {
        await notificationService.createDocumentUploadNotification({
          requestOwnerId: originalRequest.requestBy._id,
          uploaderName: uploaderName,
          documentTitle: paperDetail.title,
          userRequestId: userRequestId,
        });
        console.log(`✅ Document upload notification created for user ${originalRequest.requestBy._id}`);
      } catch (notificationError) {
        console.error('Error creating document upload notification:', notificationError);
        // Don't throw error - notification is not critical
      }

      // Note: Coins will be added when the request creator approves the fulfillment
      // This prevents users from gaining coins just by uploading documents
      console.log('📝 Document uploaded successfully. Coins will be added when request creator approves.');

      // Send email notification to the user
      if (originalRequest.requestBy && originalRequest.requestBy.email) {
        try {
          const emailData = {
            userName: `${originalRequest.requestBy.firstName} ${originalRequest.requestBy.lastName}`,
            documentTitle: paperDetail.title,
            documentAuthors: paperDetail.authors,
            documentDoi: doiNumber,
            documentUrl: fileUrl,
            requestDescription: originalRequest.description || originalRequest.title,
            requestDate: new Date(originalRequest.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            fulfilledDate: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          };

          await sendCustomEmail(
            originalRequest.requestBy.email,
            'request-fulfilled',
            `✅ Your Document Request Has Been Fulfilled - ${paperDetail.title}`,
            emailData
          );

          console.log(`Fulfillment notification email sent to ${originalRequest.requestBy.email}`);
        } catch (emailError) {
          console.error('Error sending fulfillment notification email:', emailError);
          // Don't throw error here - the main operation was successful
        }
      }

      return {
        paperRequest: newPaperRequest,
        fileUrl: fileUrl,
        message: "Document uploaded successfully and request fulfilled"
      };

    } catch (error) {
      console.error("Error in fulfillUserRequestWithDocument:", error);
      throw new CustomError(500, error.message || "Failed to fulfill user request with document");
    }
  }),
};

module.exports = paperRequestService;
