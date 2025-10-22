const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const collaborationService = require("./collaborationService");
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
      
      // Force userType to TEACHER for teacher collaborations
      collaborationData.userType = 'TEACHER';
      collaborationData.createdByModel = 'Teacher';
      
      // Add teacherId from token if not provided
      if (!collaborationData.createdBy && req.body.decodedUser) {
        collaborationData.createdBy = req.body.decodedUser._id;
      }

      // Teacher collaborations also require admin approval (same as students)
      // Do not set isApproved - let it default to false per schema

      const newCollaboration = await collaborationService.createCollaboration(
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
      
      // Ensure we're filtering by the logged-in user's ID
      const loggedInUserId = req.body.decodedUser._id;
      console.log('Logged in user ID for teacher collaborations:', loggedInUserId);
      
      // Override createdBy to ensure we only get data for the logged-in user
      queryParams.createdBy = loggedInUserId;
      
      // Force userType to TEACHER to get only teacher collaborations
      queryParams.userType = 'TEACHER';
      
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

      const collaboration = await collaborationService.getCollaborationById(_id);

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

  // Delete teacher collaboration
  delete: asyncHandler(async (req, res, next) => {
    try {
      const { _id } = req.body;

      if (!_id) {
        throw new CustomError(400, "Collaboration ID is required");
      }

      await collaborationService.deleteCollaboration(_id);

      return successResponse({
        res,
        data: null,
        msg: "Teacher collaboration deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  // Update collaboration status (toggle isActive) - Maps to isApproved for unified model
  updateStatus: asyncHandler(async (req, res, next) => {
    try {
      const { _id, isActive } = req.body;

      if (!_id || isActive === undefined) {
        throw new CustomError(400, "Collaboration ID and isActive status are required");
      }

      // Map isActive to isApproved for the unified model
      const updatedCollaboration = await collaborationService.updateCollaboration(
        _id,
        { isApproved: isActive }
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

      const results = await collaborationService.searchCollaborations(query, 'TEACHER');

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

      const queryParams = {
        createdBy: teacherId,
        userType: 'TEACHER'
      };

      const result = await collaborationService.getAllCollaborations(queryParams);

      return successResponse({
        res,
        data: result.savedData,
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

      const queryParams = {
        createdBy: teacherId,
        userType: 'TEACHER'
      };

      const result = await collaborationService.getAllCollaborations(queryParams);

      const statistics = {
        total: result.totalCount,
        active: result.savedData.filter(c => c.isApproved).length,
        inactive: result.savedData.filter(c => !c.isApproved).length
      };

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

      const queryParams = {
        createdBy: req.user.id,
        userType: 'TEACHER'
      };

      const result = await collaborationService.getAllCollaborations(queryParams);

      return successResponse({
        res,
        data: result.savedData,
        msg: "Your collaborations fetched successfully",
      });
    } catch (error) {
      next(error);
    }
  })
};

module.exports = { teacherCollaborationCtrl }; 