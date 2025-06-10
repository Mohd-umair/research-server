const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const paperRequestService = require("./paperRequestService");
const paperrequestmiddleware = require("../../middlewares/validation/Paperrequestsvalidatorschema");
const { validationResult } = require("express-validator");

const paperRequestCtrl = {
  create: [
    paperrequestmiddleware,
    asyncHandler(async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log( errors.errors);
        
        return res
          .json({ msg: errors.errors });
      } else {
        const docDTO = req.body;
        const newRequest = await paperRequestService.createRequestResearchPaper(
          docDTO
        );

        successResponse({ res, data: newRequest, msg: "New Request Raised" });
      }
    }),
  ],
  upload: asyncHandler(async (req, res, next) => {
    const payload = { file: req.files, ...req.body };
    const updatedRequest = await paperRequestService.uploadRequestPaper(
      payload
    );

    return successResponse({ res, msg: "File sent", data: updatedRequest });
  }),

  approve: asyncHandler(async (req, res, next) => {
    const docDTO = req.body;
    const approved = await paperRequestService.approveRequestResearchPaper(
      docDTO
    );
    successResponse({ res, data: approved, msg: "Request Approved" });
  }),

  getAllPendingRequests: asyncHandler(async (req, res, next) => {
    const docDTO = req.body;
    const { allRequests, totalCounts } =
      await paperRequestService.getAllRequestResearchPapers(docDTO);
    successResponse({
      res,
      data: allRequests,
      count: totalCounts,
      msg: "All pending requests",
    });
  }),

  getPendingRequestById: asyncHandler(async (req, res, next) => {
    const requestDTO = req.body;
    const requestData = await paperRequestService.getRequestDetailById(
      requestDTO
    );
    return successResponse({ res, data: requestData, msg: "Request Detail" });
  }),

  getRequestByUserId: asyncHandler(async (req, res, next) => {
    const userId = req.body;
    const requestData = await paperRequestService;
    return successResponse({
      res,
      data: requestData,
      msg: "Request data by userId",
    });
  }),

  rejectRequest: asyncHandler(async (req, res, next) => {
    const reqDto = req.body;
    const doc = await paperRequestService.rejectRequest(reqDto);
    return successResponse({
      res,
      data: doc,
      msg: "Request Rejected Successfully",
    });
  }),
};

module.exports = { paperRequestCtrl };
