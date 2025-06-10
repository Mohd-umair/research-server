const CustomError = require("../../Errors/CustomError");
const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const SubjectService = require("./subjectService");
const { validationResult } = require("express-validator");
const subjectvalidatormiddleware = require("../../middlewares/validation/subjectSchemavalidator");

const subjectCtrl = {
  create: [
    subjectvalidatormiddleware,
    asyncHandler(async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log(errors.errors);
        
        return res
          .json({ msg:  errors.errors});
      } else {
        const subjectDTO = req.body;

        const savedSubject = await SubjectService.create(subjectDTO);

        return successResponse({
          res: res,
          data: savedSubject,
          msg: "Subject created Successfully",
        });
      }
    }),
  ],

  getAll: asyncHandler(async (req, res, next) => {
    const subjectDTO = req.body;
    const { savedData, totalCount } = await SubjectService.getAll(subjectDTO);
    return successResponse({
      res,
      data: savedData,
      count: totalCount,
      msg: "All subjects",
    });
  }),

  getById: asyncHandler(async (req, res, next) => {
    const subjectId = req.body;
    const subjectById = await SubjectService.getById(subjectId);
    return successResponse({ res, data: subjectById, msg: "Subject By Id" });
  }),

  update: asyncHandler(async (req, res, next) => {
    const subjectDTO = req.body;
    const updatedSubject = await SubjectService.update(subjectDTO);
    return successResponse({
      res,
      data: updatedSubject,
      msg: "Updated Category successfully",
    });
  }),

  delete: asyncHandler(async (req, res, next) => {
    const subjectId = req.body;
    const deletedDoc = await SubjectService.delete(subjectId);
    return successResponse({
      res,
      data: deletedDoc,
      msg: "Subject Deleted Successfully",
    });
  }),
};

module.exports = subjectCtrl;
