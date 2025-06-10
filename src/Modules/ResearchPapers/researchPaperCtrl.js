const { researchPaperService } = require("./researchPaperService");
const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const { validationResult } = require("express-validator");
const researchPapermiddleware = require("../../middlewares/validation/researchpapervalidator");

const researchPaperCtrl = {
  create: [
    researchPapermiddleware,
    asyncHandler(async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log(errors.errors);
        return res
          .json({ msg:errors.errors });
      } else {
        const docDTO = req.body;
        const savedResearchPaper = await researchPaperService.create(docDTO);
        return successResponse({
          res,
          msg: "Created Successfully",
          data: savedResearchPaper,
        });
      }
    }),
  ],

  getAll: asyncHandler(async (req, res, next) => {
    const docDTO = req.body;
    const { savedData, totalCount } = await researchPaperService.getAll(docDTO);
    return successResponse({
      res,
      data: savedData,
      count: totalCount,
      msg: "All Data",
    });
  }),

  getById: asyncHandler(async (req, res, next) => {
    const docDTO = req.body;
    const docById = await researchPaperService.getById(docDTO);
    return successResponse({ res, data: docById, msg: "Document By Id" });
  }),

  update: asyncHandler(async (req, res, next) => {
    const docDTO = req.body;
    const updatedDoc = await researchPaperService.update(docDTO);
    return successResponse({
      res,
      data: updatedDoc,
      msg: "Updated Document successfully",
    });
  }),

  delete: asyncHandler(async (req, res, next) => {
    const docDTO = req.body;
    const deletedDoc = await CategoryService.delete(docDTO);
    return successResponse({
      res,
      data: deletedDoc,
      msg: "Document Deleted Successfully",
    });
  }),

  getByDoiNumber: asyncHandler(async (req, res, next) => {
    const docDTO = req.body;
    const researchPaper = await researchPaperService.getByDOInumber(docDTO);
    return successResponse({
      res,
      data: researchPaper,
      msg: "Research Paper fetched",
    });
  }),
};
module.exports = { researchPaperCtrl };
