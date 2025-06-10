const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const teacherCollaborationService = require("./teacherCollaborationService");
const CustomError = require("../../Errors/CustomError");
const { validationResult } = require("express-validator");

const teacherCollaborationCtrl = {
  // Create new teacher collaboration
  create: asyncHandler(async (req, res, next) => {
    try {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          message: "Validation failed",
          errors: errors.array() 
        });
      }

      const collaborationData = req.body;
      
      // Add teacherId from token if not provided
      if (!collaborationData.createdBy && req.user) {
        collaborationData.createdBy = req.user.id;
      }

      const newCollaboration = await teacherCollaborationService.createTeacherCollaboration(
        collaborationData
      );

      return successResponse({
        res,
        data: newCollaboration,
        msg: "Teacher collaboration created successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  // Get all teacher collaborations
  getAll: asyncHandler(async (req, res, next) => {
    try {
      const queryParams = req.body;
      
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
        msg: "Teacher collaborations fetched successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  // Get teacher collaboration by ID
  getById: asyncHandler(async (req, res, next) => {
    try {
      const { _id } = req.body;

      if (!_id) {
        throw new CustomError(400, "Collaboration ID is required");
      }

      const collaboration = await teacherCollaborationService.getTeacherCollaborationById(_id);

      return successResponse({
        res,
        data: collaboration,
        msg: "Teacher collaboration details fetched successfully",
      });
    } catch (error) {
      next(error);
    }
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

  // Delete teacher collaboration
  delete: asyncHandler(async (req, res, next) => {
    try {
      const { _id } = req.body;

      if (!_id) {
        throw new CustomError(400, "Collaboration ID is required");
      }

      await teacherCollaborationService.deleteTeacherCollaboration(_id);

      return successResponse({
        res,
        data: null,
        msg: "Teacher collaboration deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  // Update collaboration status (toggle isActive)
  updateStatus: asyncHandler(async (req, res, next) => {
    try {
      const { _id, isActive } = req.body;

      if (!_id || isActive === undefined) {
        throw new CustomError(400, "Collaboration ID and isActive status are required");
      }

      const updatedCollaboration = await teacherCollaborationService.updateCollaborationStatus(
        _id,
        isActive
      );

      return successResponse({
        res,
        data: updatedCollaboration,
        msg: `Collaboration ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      next(error);
    }
  }),

  // Search teacher collaborations
  search: asyncHandler(async (req, res, next) => {
    try {
      const { query } = req.body;

      if (!query) {
        throw new CustomError(400, "Search query is required");
      }

      const results = await teacherCollaborationService.searchTeacherCollaborations(query);

      return successResponse({
        res,
        data: results,
        msg: "Search results fetched successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  // Get collaborations by teacher ID
  getByTeacherId: asyncHandler(async (req, res, next) => {
    try {
      const { teacherId } = req.body;

      if (!teacherId) {
        throw new CustomError(400, "Teacher ID is required");
      }

      const collaborations = await teacherCollaborationService.getCollaborationsByTeacherId(
        teacherId
      );

      return successResponse({
        res,
        data: collaborations,
        msg: "Teacher's collaborations fetched successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  // Get collaboration statistics
  getStatistics: asyncHandler(async (req, res, next) => {
    try {
      const { teacherId } = req.body;

      const statistics = await teacherCollaborationService.getCollaborationStatistics(
        teacherId
      );

      return successResponse({
        res,
        data: statistics,
        msg: "Collaboration statistics fetched successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  // Get collaborations by current teacher (using token)
  getMyCollaborations: asyncHandler(async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        throw new CustomError(401, "Authentication required");
      }

      const collaborations = await teacherCollaborationService.getCollaborationsByTeacherId(
        req.user.id
      );

      return successResponse({
        res,
        data: collaborations,
        msg: "Your collaborations fetched successfully",
      });
    } catch (error) {
      next(error);
    }
  })
};

module.exports = { teacherCollaborationCtrl }; 