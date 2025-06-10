const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const WebinarServices = require("./webinarService");
const jwt = require("jsonwebtoken");

const webinarCtrl = {
  create: asyncHandler(async (req, res, next) => {
    const webinarDTO = req.body;
    try {
      const savedWebinar = await WebinarServices.create(webinarDTO);
      return successResponse({
        res: res,
        data: savedWebinar,
        msg: "Webinar Created Successfully!",
      });
    } catch (error) {
      console.error("Error saving webinar:", error.message);
      return res.status(500).json({ message: "Failed to create webinar." });
    }
  }),

  getAll: asyncHandler(async (req, res, next) => {
    try {
      const webinarDTO = req.body;
        const { savedData, totalCount } = await WebinarServices.getAll(webinarDTO);

        return successResponse({
            res: res,
            data: savedData,
            count: totalCount,
            msg: "All webinars fetched successfully",
        });
    } catch (error) {
        console.error("Error in getAll:", error);
        return next(new Error("Something went wrong while fetching data."));
    }
}),


  getById: asyncHandler(async (req, res, next) => {
    try {
      const webinarDTO = req.body;
      const webinarById = await WebinarServices.getById(webinarDTO);

      return successResponse({
        res: res,
        data: webinarById,
        msg: "Webinar by Id",
      });
    } catch (error) {
      console.error("Error in getById:", error);
      return next(new Error("Something went wrong while fetching data."));
    }
  }),
  update: asyncHandler(async (req, res, next) => {
    try {
      const webinarDTO = req.body;
      const updatedWebinar = await WebinarServices.update(webinarDTO);
      return successResponse({
        res,
        data: updatedWebinar,
        msg: "Updated Webinar Successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  delete: asyncHandler(async (req, res, next) => {
    try {
      const webinarDTO = req.body;
      const deleteWebinar = await WebinarServices.delete(webinarDTO);
      return successResponse({
        res,
        data: deleteWebinar,
        msg: "Deleted webinar successfully",
      });
    } catch (error) {
      next(error);
    }
  }),
};
module.exports = webinarCtrl;
