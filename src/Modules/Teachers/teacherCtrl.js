const asyncHandler = require("../../Utils/asyncHandler");
const TeacherService = require("./teacherService");
const successResponse = require("../../Utils/apiResponse");
const teachermiddleware = require("../../middlewares/validation/teachervalidationschema");
const { validationResult } = require("express-validator");
const CustomError = require("../../Errors/CustomError");

const teacherCtrl = {
  create: [
    teachermiddleware,
    asyncHandler(async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log(errors.errors);
        return res.json({ msg: errors.errors });
      } else {
        const teacherDTO = req.body;
        let savedData;
        if (Array.isArray(teacherDTO)) {
          savedData = await TeacherService.createMany(teacherDTO);
        } else {
          savedData = await TeacherService.create(teacherDTO);
        }
        return successResponse({
          res,
          data: savedData,
          msg: "teacher created successfully",
        });
      }
    }),
  ],

  register: asyncHandler(async (req, res, next) => {
    const { firstName, lastName, email, phoneNumber, password } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !phoneNumber || !password) {
      return res.status(400).json({ 
        success: false,
        msg: "All fields are required" 
      });
    }

    try {
      const teacherData = {
        firstName,
        lastName,
        email,
        phoneNumber,
        password,
        isApproved: false,
        name: `${firstName} ${lastName}` // Combine first and last name
      };

      const savedData = await TeacherService.register(teacherData);
      
      return successResponse({
        res,
        data: savedData,
        msg: "Teacher registered successfully. Please wait for admin approval.",
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(400).json({
        success: false,
        msg: error.message || "Registration failed"
      });
    }
  }),

  approveTeacher: asyncHandler(async (req, res, next) => {
    const { teacherId } = req.body;
    
    if (!teacherId) {
      return res.status(400).json({ 
        success: false,
        msg: "Teacher ID is required" 
      });
    }

    try {
      const approvedTeacher = await TeacherService.approveTeacher(teacherId);
      
      return successResponse({
        res,
        data: approvedTeacher,
        msg: "Teacher approved successfully",
      });
    } catch (error) {
      console.error('Approval error:', error);
      return res.status(400).json({
        success: false,
        msg: error.message || "Approval failed"
      });
    }
  }),

  getPendingTeachers: asyncHandler(async (req, res, next) => {
    try {
      const pendingTeachers = await TeacherService.getPendingTeachers();
      
      return successResponse({
        res,
        data: pendingTeachers,
        msg: "Pending teachers retrieved successfully",
      });
    } catch (error) {
      console.error('Get pending teachers error:', error);
      return res.status(500).json({
        success: false,
        msg: error.message || "Failed to retrieve pending teachers"
      });
    }
  }),

  checkProfileStatus: asyncHandler(async (req, res, next) => {
    try {
      const decodedUser = req.decodedUser;
      const profileStatus = await TeacherService.checkProfileStatus(decodedUser._id);
      
      return successResponse({
        res,
        data: profileStatus,
        msg: "Profile status retrieved successfully",
      });
    } catch (error) {
      console.error('Check profile status error:', error);
      return res.status(500).json({
        success: false,
        msg: error.message || "Failed to check profile status"
      });
    }
  }),

  getAll: asyncHandler(async (req, res, next) => {
    const teacherDTO = req.body;
    const { savedData, totalCount } = await TeacherService.getAll(teacherDTO);
    return successResponse({
      res,
      data: savedData,
      count: totalCount,
      msg: "All teachers",
    });
  }),

  getById: asyncHandler(async (req, res, next) => {
    const teacherId = req.body;
    const teacherById = await TeacherService.getById(teacherId);
    return successResponse({
      res,
      data: teacherById,
      msg: "teacher By Id",
    });
  }),

  update: asyncHandler(async (req, res, next) => {
    const teacherDTO = req.body;
    const updatedTeacher = await TeacherService.update(teacherDTO);
    return successResponse({
      res,
      data: updatedTeacher,
      msg: "Updated teacher successfully",
    });
  }),

  delete: asyncHandler(async (req, res, next) => {
    const teacherId = req.body;
    const deletedDoc = await TeacherService.delete(teacherId);
    return successResponse({
      res,
      data: deletedDoc,
      msg: "teacher Deleted Successfully",
    });
  }),
  
  signIn: asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;
    const { user, token } = await TeacherService.signIn(email, password);
    return successResponse({
      res,
      data: { user, token },
      msg: " login successful",
    });
  }),

  approvedTeacher:asyncHandler(async(req,res,next)=>{
    const decodedUser = req.decodedUser;
    console.log(decodedUser);
    const user = await TeacherService.approvedTeacher(decodedUser);
    
    return successResponse({
      res,
      data: user,
      
    });
  }),

  forgotPassword: asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    
    if (!email) {
      throw new CustomError(400, "Email is required");
    }
    
    const result = await TeacherService.forgotPassword(email);
    
    return successResponse({
      res,
      data: null,
      msg: result.message,
    });
  }),

  verifyEmailExists: asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    
    if (!email) {
      throw new CustomError(400, "Email is required");
    }
    
    const result = await TeacherService.verifyEmailExists(email);
    
    return successResponse({
      res,
      data: result,
      msg: "Email verified successfully",
    });
  }),

  resetPassword: asyncHandler(async (req, res, next) => {
    const { email, newPassword, token } = req.body;
    
    // Support both old token-based and new email-based reset
    if (token && newPassword) {
      // Old token-based flow
      const result = await TeacherService.resetPassword(token, newPassword);
      return successResponse({
        res,
        data: null,
        msg: result.message,
      });
    } else if (email && newPassword) {
      // New email-based flow
      const result = await TeacherService.resetPasswordByEmail(email, newPassword);
      return successResponse({
        res,
        data: null,
        msg: result.message,
      });
    } else {
      throw new CustomError(400, "Email and new password are required");
    }
  }),
};

module.exports = teacherCtrl;
