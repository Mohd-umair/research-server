const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const labsService = require("./labsService");
const labsmiddleware = require("../../middlewares/validation/labsvalidatorschema");
const { validationResult } = require("express-validator");

const labsCtrl = {
  create: [
    labsmiddleware,
    asyncHandler(async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log(errors.errors);
        return res
          .json({ msg: errors.errors }); // use this msg to show the toastify
      } else {
        const labDto = req.body;
        labDto.files = req.files;

        const labSaved = await labsService.create(labDto);
        return successResponse({
          res: res,
          data: labSaved,
          msg: "Lab created Successfully",
        });
      }
    }),
  ],
  search: asyncHandler(async (req, res, next) => {
    const { q } = req.body;
    const labs = await labsService.search(q);
    return successResponse({
      res: res,
      data: labs,
      msg: "Search results fetched successfully",
    });
  }),
  getAll: asyncHandler(async (req, res, next) => {
    const { savedData, totalCount } = await labsService.getAll();
    return successResponse({
      res,
      data: savedData,
      count: totalCount,
      msg: "All Labs",
    });
  }),
  getLabById: asyncHandler(async (req, res, next) => {
    const { labId } = req.params;
    const { savedData, totalCount } = await labsService.getLabById(labId);
    return successResponse({
      res,
      data: savedData,
      count: totalCount,
      msg: "Labs by Id",
    });
  }),
  updateLab: asyncHandler(async (req, res, next) => {
    const { labId } = req.params;
    const data = { labId, ...req.body };

    const updatedLab = await labsService.update(data);
    return successResponse({
      res,
      data: updatedLab,
      msg: "Lab Updated successfully",
    });
  }),
  deleteLab: asyncHandler(async (req, res, next) => {
    const { labId } = req.params;
    const deletedDoc = await labsService.delete(labId);
    return successResponse({
      res,
      data: deletedDoc,
      msg: "Course Deleted Successfully",
    });
  }),
};

module.exports = labsCtrl;
