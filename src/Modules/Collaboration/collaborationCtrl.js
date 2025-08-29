const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const collaborationService = require("./collaborationService");
const CustomError = require("../../Errors/CustomError"); // Ensure you import CustomError
const collaborationValidationSchema = require("../../middlewares/validation/colaborationvalidationschema");
const { validationResult } = require("express-validator");

const collaborationRequestCtrl = {
  create: [
    collaborationValidationSchema,
    asyncHandler(async (req, res, next) => {


      console.log(req.body);
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.json({ msg: errors.errors });
      } else {
        const docDTO = req.body;
        
        // Ensure userType is set to USER for user collaborations
        if (!docDTO.userType) {
          docDTO.userType = 'USER';
        }
        
        // Set createdByModel based on userType
        if (docDTO.userType === 'USER') {
          docDTO.createdByModel = 'Student';
        } else if (docDTO.userType === 'TEACHER') {
          docDTO.createdByModel = 'Teacher';
        }
        
        // Set createdBy from the authenticated user if not provided
        if (!docDTO.createdBy && req.body.decodedUser) {
          docDTO.createdBy = req.body.decodedUser._id;
        }
        
        const newCollaboration = await collaborationService.createCollaboration(
          docDTO
        );
        return successResponse({
          res,
          data: newCollaboration,
          msg: "User New Collaboration Created",
        });
      }
    }),
  ],
  // getAll: asyncHandler(async (req, res, next) => {
  //   const collaborationDto = req.body;
    
  //   // Ensure we only get USER collaborations for this endpoint
  //   collaborationDto.userType = 'USER';

  //   const { savedData, totalCount } =
  //     await teacherCollaborationService.getAllTeacherCollaborations(collaborationDto);

  //   return successResponse({
  //     res,
  //     data: savedData,
  //     count: totalCount,
  //     msg: "All Collaborations Fetched",
  //   });
  // }),



   // Get all teacher collaborations
   getAll: asyncHandler(async (req, res, next) => {
    try {
      const queryParams = req.body;

      console.log(queryParams);
      
      // Ensure we're filtering by the logged-in user's ID
      const loggedInUserId = req.body.decodedUser._id;      
      // Override createdBy to ensure we only get data for the logged-in user
      queryParams.createdBy = loggedInUserId;
      
      const result = await collaborationService.getAllCollaborations(queryParams);

      return successResponse({
        res,
        data: result.savedData,
        count: result.totalCount,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage
        },
        msg: "Collaborations fetched successfully",
      });
    } catch (error) {
      next(error);
    }
  }),


  getById: asyncHandler(async (req, res, next) => {
    const { paperId } = req.body;
    const collaboration = await collaborationService.getCollaborationById(
      paperId
    );

    if (!collaboration) {
      throw new CustomError(404, "Collaboration not found");
    }

    successResponse({
      res,
      data: collaboration,
      msg: "Collaboration Details",
    });
  }),

  // Update teacher collaboration
  update: asyncHandler(async (req, res, next) => {
    try {
      const { _id, ...updateData } = req.body;

      if (!_id) {
        throw new CustomError(400, "Collaboration ID is required");
      }

      const updatedCollaboration = await collaborationService.updateCollaboration(
        _id,
        updateData
      );

      return successResponse({
        res,
        data: updatedCollaboration,
        msg: "Teacher collaboration updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  delete: asyncHandler(async (req, res, next) => {
    const { paperId } = req.body;

    const collaboration = await collaborationService.getCollaborationById(paperId);

    if (!collaboration) {
      throw new CustomError(404, "Collaboration not found");
    }

    await collaborationService.deleteCollaboration(paperId);

    successResponse({
      res,
      msg: "Collaboration deleted successfully",
    });
  }),

  search: asyncHandler(async (req, res, next) => {
    const { query } = req.body;
    const results = await collaborationService.searchCollaborations(query);
    successResponse({
      res,
      data: results,
      msg: "Search Results",
    });
  }),

  getByStudentId: asyncHandler(async (req, res, next) => {
    const { studentId } = req.body;
    const collaborations = await collaborationService.getCollaborationsByStudentId(studentId);
    successResponse({
      res,
      data: collaborations,
      msg: "Student Collaborations Fetched",
    });
  }),

  // Admin methods
  getAllForAdmin: asyncHandler(async (req, res, next) => {
    const queryParams = req.body;
    const result = await collaborationService.getAllCollaborationsForAdmin(queryParams);

    return successResponse({
      res,
      data: result.savedData,
      count: result.totalCount,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        hasNextPage: result.currentPage < result.totalPages,
        hasPrevPage: result.currentPage > 1
      },
      msg: "All collaborations fetched successfully",
    });
  }),

  getByIdForAdmin: asyncHandler(async (req, res, next) => {
    const { collaborationId } = req.body;
    const collaboration = await collaborationService.getCollaborationByIdForAdmin(collaborationId);

    if (!collaboration) {
      throw new CustomError(404, "Collaboration not found");
    }

    return successResponse({
      res,
      data: collaboration,
      msg: "Collaboration details fetched successfully",
    });
  }),

  approveCollaboration: asyncHandler(async (req, res, next) => {
    const { collaborationId } = req.body;
    const adminId = req.decodedUser._id;

    const collaboration = await collaborationService.approveCollaboration(collaborationId, adminId);

    return successResponse({
      res,
      data: collaboration,
      msg: "Collaboration approved successfully",
    });
  }),

  rejectCollaboration: asyncHandler(async (req, res, next) => {
    const { collaborationId, rejectionReason } = req.body;
    const adminId = req.decodedUser._id;

    if (!rejectionReason) {
      throw new CustomError(400, "Rejection reason is required");
    }

    const collaboration = await collaborationService.rejectCollaboration(collaborationId, adminId, rejectionReason);

    return successResponse({
      res,
      data: collaboration,
      msg: "Collaboration rejected successfully",
    });
  }),

  getApprovedCollaborations: asyncHandler(async (req, res, next) => {
    const queryParams = req.body;
    const result = await collaborationService.getApprovedCollaborations(queryParams);

    return successResponse({
      res,
      data: result.savedData,
      count: result.totalCount,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        hasNextPage: result.currentPage < result.totalPages,
        hasPrevPage: result.currentPage > 1
      },
      msg: "Approved collaborations fetched successfully",
    });
  }),

  // Public method to get approved collaborations (no authentication required)
  getPublicApprovedCollaborations: asyncHandler(async (req, res, next) => {
    const queryParams = req.body;
    const result = await collaborationService.getApprovedCollaborations(queryParams);

    return successResponse({
      res,
      data: result.savedData,
      count: result.totalCount,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        hasNextPage: result.currentPage < result.totalPages,
        hasPrevPage: result.currentPage > 1
      },
      msg: "Approved collaborations fetched successfully",
    });
  }),

  // Public method to get collaboration by ID (no authentication required)
  getPublicCollaborationById: asyncHandler(async (req, res, next) => {
    const { collaborationId } = req.body;
    
    if (!collaborationId) {
      throw new CustomError(400, "Collaboration ID is required");
    }

    const collaboration = await collaborationService.getCollaborationByIdForAdmin(collaborationId);

    if (!collaboration) {
      throw new CustomError(404, "Collaboration not found");
    }

    // Only return approved collaborations for public access
    if (!collaboration.isApproved) {
      throw new CustomError(404, "Collaboration not found");
    }

    return successResponse({
      res,
      data: collaboration,
      msg: "Collaboration details fetched successfully",
    });
  }),
};

module.exports = { collaborationRequestCtrl };
