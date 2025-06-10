const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const AssignmentService = require("./assignmentService");

const assignmentCtrl = {
  create: asyncHandler(async (req, res, next) => {
    const assignmentDto = req.body;
    const assignmentSaved = await AssignmentService.create(assignmentDto);
    return successResponse({
      res: res,
      data: assignmentSaved,
      msg: "Assignment created Successfully",
    });
  }),

  getAll: asyncHandler(async (req, res, next) => {
    const assignmentDto = req.body;
    const { savedData, totalCount } = await AssignmentService.getAll(assignmentDto);
    return successResponse({
      res,
      data: savedData,
      count: totalCount,
      msg: "All assignments",
    });
  }),

  getById: asyncHandler(async (req, res, next) => {
    const assignmentId = req.body;
    const assignmentById = await AssignmentService.getById(assignmentId);
    return successResponse({ res, data: assignmentById, msg: "Assignment By Id" });
  }),

  update: asyncHandler(async (req, res, next) => {
    const assignmentDto = req.body;
    const updatedAssignment = await AssignmentService.update(assignmentDto);
    return successResponse({
      res,
      data: updatedAssignment,
      msg: "Updated assignment successfully",
    });
  }),

  delete: asyncHandler(async (req, res, next) => {
    const assignmentId = req.body;
    const deletedDoc = await AssignmentService.delete(assignmentId);
    return successResponse({
      res,
      data: deletedDoc,
      msg: "Assignment Deleted Successfully",
    });
  }),
};

module.exports = assignmentCtrl;
