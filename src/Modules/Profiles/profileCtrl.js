const CustomError = require("../../Errors/CustomError");
const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const ProfileService = require("./profileService");
const { validationResult } = require("express-validator");
const profilevalidatormiddleware = require("../../middlewares/validation/profilevalidorschema");

const profileCtrl = {
  create: [
    profilevalidatormiddleware,
    asyncHandler(async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log(errors.errors);
        
        return res
          .json({ msg:errors.errors });
      } else {
        const profileData = req.body;

        const savedProfile = await ProfileService.create(profileData);

        return successResponse({
          res: res,
          data: savedProfile,
          msg: "Profile created Successfully",
        });
      }
    }),
  ],

  getAll: asyncHandler(async (req, res, next) => {
    const profileDTO = req.body;
    const { savedData, totalCount } = await ProfileService.getAll(profileDTO);
    return successResponse({
      res,
      data: savedData,
      count: totalCount,
      msg: "All Profiles",
    });
  }),

  getById: asyncHandler(async (req, res, next) => {
    const profileId = req.body;
    const profileById = await ProfileService.getById(profileId);
    return successResponse({ res, data: profileById, msg: "profile By Id" });
  }),

  update: asyncHandler(async (req, res, next) => {
    const profileDTO = req.body;
    const updatedProfile = await ProfileService.update(profileDTO);
    return successResponse({
      res,
      data: updatedProfile,
      msg: "Updated profile successfully",
    });
  }),

  delete: asyncHandler(async (req, res, next) => {
    const profileId = req.body;
    const deletedProfile = await ProfileService.delete(profileId);
    return successResponse({
      res,
      data: deletedProfile,
      msg: "Profile Deleted Successfully",
    });
  }),
  signIn: asyncHandler(async (req, res, next) => {
    const authDtO = req.body;
    const { profile, token } = await ProfileService.signIn(authDtO);
    return successResponse({
      res,
      data: { profile, token },
      msg: " login successful",
    });
  }),
};

module.exports = profileCtrl;
