const { validationResult } = require("express-validator");
const CustomError = require("../../Errors/CustomError");
const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const StudentService = require("./studentService");
const { SignupValidationSchema, SignInValidationSchema, ProfileValidationSchema } = require("./studentValidation");
const jwt = require("jsonwebtoken");
const multer = require('multer');
const cloudinary = require("../../Service/cloudinaryConfig");

// Configure multer for profile picture uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'), false);
    }
  }
});

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
    upload.single('profilePicture'), // Add multer middleware for file upload
    ProfileValidationSchema,
    asyncHandler(async (req, res, next) => {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        throw new CustomError(400, errors.array().map(err => err.msg).join(', '));
      }
      
      const userId = req.decodedUser._id;
      let profileData = req.body;
      
      // Handle profile picture upload if file is provided
      if (req.file) {
        try {
          console.log('Profile picture file received:', {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size
          });

          // Upload to Cloudinary
          const uploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              {
                resource_type: 'image',
                folder: 'student-profiles',
                transformation: [
                  { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                  { quality: 'auto' },
                  { format: 'auto' }
                ]
              },
              (error, result) => {
                if (error) {
                  console.error('Cloudinary upload error:', error);
                  reject(error);
                } else {
                  console.log('Cloudinary upload success:', result.secure_url);
                  resolve(result);
                }
              }
            ).end(req.file.buffer);
          });

          // Add the uploaded image URL to profile data
          profileData.profilePicture = uploadResult.secure_url;
          
        } catch (uploadError) {
          console.error('Error uploading profile picture:', uploadError);
          throw new CustomError(500, 'Failed to upload profile picture');
        }
      }
      
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

  forgotPassword: asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    
    if (!email) {
      throw new CustomError(400, "Email is required");
    }
    
    const result = await StudentService.forgotPassword(email);
    
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
    
    const result = await StudentService.verifyEmailExists(email);
    
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
      const result = await StudentService.resetPassword(token, newPassword);
      return successResponse({
        res,
        data: null,
        msg: result.message,
      });
    } else if (email && newPassword) {
      // New email-based flow
      const result = await StudentService.resetPasswordByEmail(email, newPassword);
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

module.exports = studentCtrl;
