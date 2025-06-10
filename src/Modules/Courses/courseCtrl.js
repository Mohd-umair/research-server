const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const courseService = require("./courseService");
const coursemiddleware = require("../../middlewares/validation/coursevalidationschema");
const { validationResult } = require("express-validator");

const courseCtrl = {
  create: [
    coursemiddleware,
    asyncHandler(async (req, res, next) => {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        console.log(errors.errors);
        
        return res
          .status(400)
          .json({ msg: errors.errors });
      } else {
        const courseDto = req.body;
        courseDto.files = req.files;
        const courseSaved = await courseService.create(courseDto);
        return successResponse({
          res: res,
          data: courseSaved,
          msg: "Course created Successfully",
        });
      }
    }),
  ],

  getAll: asyncHandler(async (req, res, next) => {
    const courseDto = req.body;
    const { savedData, totalCount } = await courseService.getAll(courseDto);
    return successResponse({
      res,
      data: savedData,
      count: totalCount,
      msg: "All Courses",
    });
  }),

  getById: asyncHandler(async (req, res, next) => {
    const courseId = req.body;
    const courseById = await courseService.getById(courseId);
    return successResponse({ res, data: courseById, msg: "Course By Id" });
  }),

  getUserCourses: asyncHandler(async (req, res, next) => {
    const userId = req.body.decodedUser._id;
    const userCourses = await courseService.getUserCourses(userId);

    return successResponse({
      res,
      data: userCourses,
      msg: "User's Courses",
    });
  }),

  update: asyncHandler(async (req, res, next) => {
    const courseDto = req.body;
    const updatedCourse = await courseService.update(courseDto);
    return successResponse({
      res,
      data: updatedCourse,
      msg: "Updated Course successfully",
    });
  }),

  delete: asyncHandler(async (req, res, next) => {
    const courseId = req.body;
    const deletedDoc = await courseService.delete(courseId);
    return successResponse({
      res,
      data: deletedDoc,
      msg: "Course Deleted Successfully",
    });
  }),
};

module.exports = courseCtrl;
