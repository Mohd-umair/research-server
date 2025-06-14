const { validationResult } = require("express-validator");
const CustomError = require("../../Errors/CustomError");
const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const StudentService = require("./studentService");
const SignupValidationSchema = require("../../middlewares/validation/SignupValidationSchema");
const SignInValidationSchema = require("../../middlewares/validation/SigninvalidationSchema");
const ProfileValidationSchema = require("../../middlewares/validation/ProfileValidationSchema");
const jwt = require("jsonwebtoken");

const studentCtrl = {
  create: [
    SignupValidationSchema,
    asyncHandler(async (req, res, next) => {
      const errors = validationResult(req);
      let savedStudent;

      if (!errors.isEmpty()) {
        throw new CustomError(400, "Please fill all fields correctly");

      } else {
        const studentData = req.body;
        savedStudent = await StudentService.create(studentData);
      }

      if (!errors.isEmpty()) {
        return res.json({ msg: errors.errors });
      } else {
        return successResponse({
          res: res,
          data: savedStudent,
          msg: "Student created Successfully",
        });
      }
    }),
  ],

  getAll: asyncHandler(async (req, res, next) => {
    const studentDTO = req.body;
    const { savedData, totalCount } = await StudentService.getAll(studentDTO);
    return successResponse({
      res,
      data: savedData,
      count: totalCount,
      msg: "All students",
    });
  }),

  getById: asyncHandler(async (req, res, next) => {
    const studentId = req.body;
    const studentById = await StudentService.getById(studentId);
    return successResponse({ res, data: studentById, msg: "Student By Id" });
  }),

  update: asyncHandler(async (req, res, next) => {
    const studentDTO = req.body;
    const updatedStudent = await StudentService.update(studentDTO);
    return successResponse({
      res,
      data: updatedStudent,
      msg: "Updated student successfully",
    });
  }),

  delete: asyncHandler(async (req, res, next) => {
    const { StudentId } = req.params;
    const deletedStudent = await StudentService.delete(StudentId);
    return successResponse({
      res,
      data: deletedStudent,
      msg: "Student Deleted Successfully",
    });
  }),

  signIn: [
    SignInValidationSchema,
    asyncHandler(async (req, res, next) => {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {

        return res.json({ msg: errors.errors });
      } else {
        const { email, password } = req.body;
        const { user, token } = await StudentService.signIn(email, password);

        return successResponse({
          res,
          data: { user, token },
          msg: "Login successful",
        });
      }
    }),
  ],

  verifyEmail: async (req, res, next) => {

    try {
      const token = req.query.token;
      const jwtRes = jwt.verify(
        token,
        process.env.JWT_SECRET,
        (err, response) => {
          if (err) {
            return res.status(400).json({ msg: err.message });
          } else {
            return response;
          }
        }
      );

      await StudentService.verifyEmail(jwtRes);

      return res.redirect(`https://www.researchdecode.com/signin`);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: "Server Error" });
    }
  },

  // Profile-specific controller methods
  getCurrentProfile: asyncHandler(async (req, res, next) => {
    const userId = req.decodedUser._id;
    const profile = await StudentService.getCurrentProfile(userId);
    
    return successResponse({
      res,
      data: profile,
      msg: "Profile retrieved successfully",
    });
  }),

  updateProfile: [
    ProfileValidationSchema,
    asyncHandler(async (req, res, next) => {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        throw new CustomError(400, errors.array().map(err => err.msg).join(', '));
      }
      
      const userId = req.decodedUser._id;
      const profileData = req.body;
      
      const updatedProfile = await StudentService.updateProfile(userId, profileData);
      
      return successResponse({
        res,
        data: updatedProfile,
        msg: "Profile updated successfully",
      });
    })
  ],

  uploadProfilePicture: asyncHandler(async (req, res, next) => {
    const userId = req.decodedUser._id;
    const { profilePictureUrl } = req.body;
    
    if (!profilePictureUrl) {
      throw new CustomError(400, "Profile picture URL is required");
    }
    
    const updatedProfile = await StudentService.uploadProfilePicture(userId, profilePictureUrl);
    
    return successResponse({
      res,
      data: updatedProfile,
      msg: "Profile picture updated successfully",
    });
  }),

  getProfileCompletionStatus: asyncHandler(async (req, res, next) => {
    const userId = req.decodedUser._id;
    const completionStatus = await StudentService.getProfileCompletionStatus(userId);
    
    return successResponse({
      res,
      data: completionStatus,
      msg: "Profile completion status retrieved successfully",
    });
  }),

  searchStudents: asyncHandler(async (req, res, next) => {
    const { search, skip = 0, limit = 10 } = req.body;
    
    const queryParams = {
      skip: parseInt(skip),
      limit: parseInt(limit)
    };
    
    const result = await StudentService.searchStudents(search, queryParams);
    
    return successResponse({
      res,
      data: result.students,
      count: result.totalCount,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalCount: result.totalCount,
        hasNextPage: result.currentPage < result.totalPages,
        hasPrevPage: result.currentPage > 1
      },
      msg: "Students retrieved successfully",
    });
  }),
};

module.exports = studentCtrl;
