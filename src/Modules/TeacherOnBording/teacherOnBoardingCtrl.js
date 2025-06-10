const CustomError = require("../../Errors/CustomError");
const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const TeacherServiceOnboardingService = require("./teacherOnBoardingService");
const { validationResult } = require("express-validator");
const teacheronboardingmiddleware = require("../../middlewares/validation/teacheronboardingvalidationschema");

const teacheronboardingCtrl = {
  submitRequest: [
    teacheronboardingmiddleware,
    asyncHandler(async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log(errors.errors);

        return res
          .json({ msg: errors.errors });
      } else {
        const teacherData = req.body;
        
        const savedTeacher =
          await TeacherServiceOnboardingService.submitRequest(teacherData);
        return successResponse({
          res: res,
          data: savedTeacher,
          msg: "Teacher created Successfully",
        });
      }
    }),
  ],

  getPendingOnboardingRequests: asyncHandler(async (req, res, next) => {
    const reqDto = req.body;
    const { result, pendingCount } =
      await TeacherServiceOnboardingService.getPendingRequests(reqDto);
    return successResponse({
      res: res,
      data: result,
      msg: "Pending onboarding requests fetched successfully",
      count: pendingCount,
    });
  }),

  approveOnboardingRequest: asyncHandler(async (req, res, next) => {
    const reqDto = req.body;
    const approvedTeacher =
      await TeacherServiceOnboardingService.approveOnboarding(reqDto);
    return successResponse({
      res: res,
      data: approvedTeacher,
      msg: "Onboarding request approved successfully",
    });
  }),

  activeBank: asyncHandler(async (req, res, next) => {
    const reqDto = req.body;
    const approvedTeacher =
      await TeacherServiceOnboardingService.activateBank(reqDto);
    return successResponse({
      res: res,
      data: approvedTeacher,
      msg: "Active Bank successfully",
    });
  }),

  rejectOnboardingRequest: asyncHandler(async (req, res, next) => {
    const reqDto = req.body;
    const rejectedTeacher =
      await TeacherServiceOnboardingService.rejectOnboarding(reqDto);
    return successResponse({
      res: res,
      data: rejectedTeacher,
      msg: "Onboarding request rejected successfully",
    });
  }),
};

module.exports = teacheronboardingCtrl;
