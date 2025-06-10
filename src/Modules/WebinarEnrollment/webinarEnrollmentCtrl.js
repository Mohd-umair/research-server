const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const WebinarEnrollmentService = require("./webinarEnrollmentService");

const webinarEnrollmentCtrl = {
  create: asyncHandler(async (req, res, next) => {
    try {
      const webinarEnrollmentDTO = req.body;
      const savedEnrollment = await WebinarEnrollmentService.create(
        webinarEnrollmentDTO
      );
      return successResponse({
        res,
        data: savedEnrollment,
        msg: "Enrolled Successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  allEnrolledWebinars: asyncHandler(async (req, res, next) => {
    try {
      const webinarEnrollmentDTO = req.body;
      
      const savedEnrollment = await WebinarEnrollmentService.allEnrolledWebinars(
        webinarEnrollmentDTO
      );
      return successResponse({
        res,
        data: savedEnrollment,
        msg: "Enrollments fetched successfully!",
      });
    } catch (error) {
      next(error);
    }
  }),

  isEnroll: asyncHandler(async (req, res, next) => {
    try {
        const webinarEnrollmentDTO = req.body;
        // console.log("DTO received for isEnroll:", webinarEnrollmentDTO);
        
        const isEnrolled = await WebinarEnrollmentService.isEnrolled(webinarEnrollmentDTO);

        return successResponse({
          res,
          data: isEnrolled,
          msg: "data fetched successfully!",
        });
    } catch (error) {
        next(error);
    }
}),


  delete: asyncHandler(async(req, res, next) => {
    const webinarEnrollmentDTO = req.body;
    
    const deletedEnrollment = await WebinarEnrollmentService.delete(webinarEnrollmentDTO);
    return successResponse({
      res,
      data: deletedEnrollment,
      msg: "Unenrolled Successfully!"
    })
  })
};

module.exports = webinarEnrollmentCtrl;