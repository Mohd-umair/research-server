const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const courseEnrollmentService = require("./courseEnrollmentService");
const courseenrollmentmiddleware = require("../../middlewares/validation/courseenrollmentvalidationschema");
const {validationResult}=require("express-validator")

const courseEnrollCtrl = {
  create: [
    courseenrollmentmiddleware,
    asyncHandler(async (req, res, next) => {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        console.log(errors.errors);
        
        return res
          .json({ msg: errors.errors});
      } else {
        const courseEnrollmentDto = req.body;

        const courseEnrollment = await courseEnrollmentService.create(
          courseEnrollmentDto
        );
        return successResponse({
          res: res,
          data: courseEnrollment,
          msg: "Enrolled Successfully",
        });
      }
    }),
  ],

  isStudentEnrolled: asyncHandler(async (req, res, next) => {
    const courseEnrollDTO = req.body;
    const isEnrolled = await courseEnrollmentService.isStudentEnrolled(
      courseEnrollDTO
    );
    return successResponse({ res, data: isEnrolled, msg: "Enrollment Status" });
  }),

  verifyEnroll: asyncHandler(async (req, res, next) => {
    const doc = req.body;
    const response = await courseEnrollmentService.verifyEnrollmentPayment(doc);
    return successResponse({
      res,
      data: response,
      msg: "Payment Verification Completed",
    });
  }),

  //   getById: asyncHandler(async (req, res, next) => {
  //     const courseId = req.body;
  //     const courseById = await courseEnrollmentService.getById(courseId);
  //     return successResponse({ res, data: courseById, msg: "Course By Id" });
  //   }),

  //   update: asyncHandler(async (req, res, next) => {
  //     const courseDto = req.body;
  //     const updatedCourse = await courseEnrollmentService.update(courseDto);
  //     return successResponse({
  //       res,
  //       data: updatedCourse,
  //       msg: "Updated Course successfully",
  //     });
  //   }),

  //   delete: asyncHandler(async (req, res, next) => {
  //     const courseId = req.body;
  //     const deletedDoc = await courseEnrollmentService.delete(courseId);
  //     return successResponse({
  //       res,
  //       data: deletedDoc,
  //       msg: "Course Deleted Successfully",
  //     });
  //   }),


  AllEnrolledStudents:asyncHandler(async(req,res)=>{
    const response = await courseEnrollmentService.AllEnrolledStudents();
    return successResponse({
      res,
      data: response,
      msg: "All Enrolled Students Fetched ",
    });
  })

};

module.exports = courseEnrollCtrl;
