const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const teacherCollaborationService = require("./teacherCollaborationService");
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
        
        const newCollaboration = await teacherCollaborationService.createTeacherCollaboration(
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
      
      const result = await teacherCollaborationService.getAllTeacherCollaborations(queryParams);

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
    const collaboration = await teacherCollaborationService.getTeacherCollaborationById(
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

      const updatedCollaboration = await teacherCollaborationService.updateTeacherCollaboration(
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

    const collaboration = await teacherCollaborationService.getTeacherCollaborationById(
      paperId
    );

    if (!collaboration) {
      throw new CustomError(404, "Collaboration not found");
    }

    await teacherCollaborationService.deleteTeacherCollaboration(paperId);

    successResponse({
      res,
      msg: "Collaboration deleted successfully",
    });
  }),

  search: asyncHandler(async (req, res, next) => {
    const { query } = req.body;
    const results = await teacherCollaborationService.searchTeacherCollaborations(query);
    successResponse({
      res,
      data: results,
      msg: "Search Results",
    });
  }),

  getByStudentId: asyncHandler(async (req, res, next) => {
    const { studentId } = req.body;
    const collaborations = await teacherCollaborationService.getCollaborationsByTeacherId(studentId);
    successResponse({
      res,
      data: collaborations,
      msg: "Student Collaborations Fetched",
    });
  }),
};

module.exports = { collaborationRequestCtrl };
