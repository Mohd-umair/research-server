const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const videoService = require("./videoService");
const videovalidationmiddleware = require("../../middlewares/validation/videosvalidationschema");
const { validationResult } = require("express-validator");

const videoCtrl = {
  getByCourseId: asyncHandler(async (req, res, next) => {
    const videoDTO = req.body;
    const videosData = await videoService.getVideosByCourseId(videoDTO);

    return successResponse({ res, data: videosData });
  }),
  create: [
    videovalidationmiddleware,
    asyncHandler(async (req, res, next) => {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        console.log(errors.errors);

        return res.json({ msg: errors.errors });
      } else {
        const videoDTO = req.body;

        const videoSaved = await videoService.create({
          ...videoDTO,
          file: req.files,
        });
        return successResponse({
          res: res,
          data: videoSaved,
          msg: "Video created Successfully",
        });
      }
    }),
  ],

  getAll: asyncHandler(async (req, res, next) => {
    const videoDTO = req.body;
    const { savedData, totalCount } = await videoService.getAll(videoDTO);
    return successResponse({
      res,
      data: savedData,
      count: totalCount,
      msg: "All Videos",
    });
  }),

  getById: asyncHandler(async (req, res, next) => {
    const videoId = req.body;
    const videoById = await videoService.getById(videoId);
    return successResponse({ res, data: videoById, msg: "video By Id" });
  }),

  update: asyncHandler(async (req, res, next) => {
    const videoDTO = req.body;
    const updatedVideo = await videoService.update(videoDTO);
    return successResponse({
      res,
      data: updatedVideo,
      msg: "Updated Video successfully",
    });
  }),

  delete: asyncHandler(async (req, res, next) => {
    const videoId = req.body;
    const deletedDoc = await videoService.delete(videoId);
    return successResponse({
      res,
      data: deletedDoc,
      msg: "Video Deleted Successfully",
    });
  }),
};

module.exports = videoCtrl;
