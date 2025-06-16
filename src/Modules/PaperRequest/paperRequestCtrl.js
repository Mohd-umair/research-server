const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const paperRequestService = require("./paperRequestService");
const paperrequestmiddleware = require("../../middlewares/validation/Paperrequestsvalidatorschema");
const { validationResult } = require("express-validator");
const cloudinary = require("../../Service/cloudinaryConfig");

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

  fulfillUserRequest: asyncHandler(async (req, res, next) => {
    try {
      const { userRequestId, paperDetail } = req.body;
      const file = req.file; // File from multer

      // Validate required fields
      if (!userRequestId) {
        return res.status(400).json({
          success: false,
          message: "User request ID is required"
        });
      }

      if (!paperDetail) {
        return res.status(400).json({
          success: false,
          message: "Paper details are required"
        });
      }

      // Parse paperDetail if it's a string
      let parsedPaperDetail;
      try {
        parsedPaperDetail = typeof paperDetail === 'string' ? JSON.parse(paperDetail) : paperDetail;
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid paper details format"
        });
      }

      // Validate paper detail structure
      if (!parsedPaperDetail.title || !parsedPaperDetail.authors) {
        return res.status(400).json({
          success: false,
          message: "Paper title and authors are required"
        });
      }

      if (!file) {
        return res.status(400).json({
          success: false,
          message: "PDF file is required"
        });
      }

      // Upload PDF to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'raw', // For non-image files like PDFs
            folder: 'research-papers', // Organize PDFs in folders
            public_id: `${Date.now()}_${file.originalname.replace(/\.[^/.]+$/, "")}`,
            format: 'pdf'
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary PDF upload error:', error);
              reject(error);
            } else {
              console.log('Cloudinary PDF upload success:', result.secure_url);
              resolve(result);
            }
          }
        ).end(file.buffer);
      });

      // Get the current user ID from the token
      const uploadedBy = req.user?.id || req.user?._id;

      // Generate DOI if not provided
      const doiNumber = parsedPaperDetail.doi || `DOI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const payload = {
        userRequestId,
        uploadedBy,
        fileUrl: uploadResult.secure_url, // Cloudinary URL
        publicId: uploadResult.public_id, // For future deletion if needed
        paperDetail: {
          ...parsedPaperDetail,
          doi: doiNumber
        }
      };

      const result = await paperRequestService.fulfillUserRequestWithDocument(payload);

      return res.status(200).json({
        success: true,
        message: "Document uploaded successfully and request fulfilled",
        data: {
          paperRequest: result.paperRequest,
          fileUrl: uploadResult.secure_url,
          cloudinaryData: {
            publicId: uploadResult.public_id,
            originalName: file.originalname,
            size: file.size,
            format: uploadResult.format
          }
        }
      });

    } catch (error) {
      console.error('Error in fulfillUserRequest:', error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fulfill user request"
      });
    }
  }),
};

module.exports = { paperRequestCtrl };
