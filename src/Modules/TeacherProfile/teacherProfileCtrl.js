const CustomError = require("../../Errors/CustomError");
const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const TeacherProfileService = require("./teacherProfileService");

const teacherProfileCtrl = {

  // Public method to get teacher profile by ID (for consultancy detail page)
  getPublicProfile: asyncHandler(async (req, res, next) => {
    const { teacherId } = req.params;
    
    if (!teacherId) {
      throw new CustomError(400, "Teacher ID is required");
    }
    
    const profile = await TeacherProfileService.getPublicProfile(teacherId);
    
    return successResponse({
      res,
      data: profile,
      msg: "Teacher profile retrieved successfully",
    });
  }),

  // Get current user's profile
  getCurrentProfile: asyncHandler(async (req, res, next) => {
    const userId = req.decodedUser._id;
    const profile = await TeacherProfileService.getCurrentUserProfile(userId);
    
    return successResponse({
      res,
      data: profile,
      msg: profile ? "Profile retrieved successfully" : "No profile found",
    });
  }),

  // Create or update current user's profile
  createOrUpdateProfile: asyncHandler(async (req, res, next) => {
    const userId = req.decodedUser._id;
    const profileData = req.body;
    
    const profile = await TeacherProfileService.createOrUpdateProfile(userId, profileData);
    
    return successResponse({
      res,
      data: profile,
      msg: "Profile saved successfully",
    });
  }),

  // Update current user's profile
  updateCurrentProfile: asyncHandler(async (req, res, next) => {
    const userId = req.decodedUser._id;
    const updateData = req.body;
    
    const updatedProfile = await TeacherProfileService.updateCurrentUserProfile(userId, updateData);
    
    return successResponse({
      res,
      data: updatedProfile,
      msg: "Profile updated successfully",
    });
  }),

  // Get profile completion status
  getCompletionStatus: asyncHandler(async (req, res, next) => {
    const userId = req.decodedUser._id;
    const completionStatus = await TeacherProfileService.getProfileCompletionStatus(userId);
    
    return successResponse({
      res,
      data: completionStatus,
      msg: "Profile completion status retrieved successfully",
    });
  }),

  // Submit profile for verification
  submitForVerification: asyncHandler(async (req, res, next) => {
    const userId = req.decodedUser._id;
    const profile = await TeacherProfileService.submitForVerification(userId);
    
    return successResponse({
      res,
      data: profile,
      msg: "Profile submitted for verification successfully",
    });
  }),

  // Get skills suggestions
  getSkillsSuggestions: asyncHandler(async (req, res, next) => {
    const { specialization } = req.query;
    
    if (!specialization) {
      throw new CustomError(400, "Specialization parameter is required");
    }
    
    const skills = await TeacherProfileService.getSkillsSuggestions(specialization);
    
    return successResponse({
      res,
      data: skills,
      msg: "Skills suggestions retrieved successfully",
    });
  }),

  // Delete current user's profile
  deleteCurrentProfile: asyncHandler(async (req, res, next) => {
    const userId = req.decodedUser._id;
    const deletedProfile = await TeacherProfileService.deleteProfile(userId);
    
    return successResponse({
      res,
      data: deletedProfile,
      msg: "Profile deleted successfully",
    });
  }),

  // ADMIN ROUTES - For profile management

  // Get all profiles (Admin only)
  getAllProfiles: asyncHandler(async (req, res, next) => {
    const { skip = 0, limit = 10, status, search } = req.body;
    
    const queryParams = {
      skip: parseInt(skip),
      limit: parseInt(limit),
      status,
      search
    };
    
    const result = await TeacherProfileService.getAllProfiles(queryParams);
    
    return successResponse({
      res,
      data: result.profiles,
      count: result.totalCount,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalCount: result.totalCount,
        hasNextPage: result.currentPage < result.totalPages,
        hasPrevPage: result.currentPage > 1
      },
      msg: "Profiles retrieved successfully",
    });
  }),

  // Get profile by ID (Admin only)
  getProfileById: asyncHandler(async (req, res, next) => {
    const { profileId } = req.body;
    
    if (!profileId) {
      throw new CustomError(400, "Profile ID is required");
    }
    
    const profile = await TeacherProfileService.getProfileById(profileId);
    
    return successResponse({
      res,
      data: profile,
      msg: "Profile retrieved successfully",
    });
  }),

  // Approve profile (Admin only)
  approveProfile: asyncHandler(async (req, res, next) => {
    const { profileId } = req.body;
    
    if (!profileId) {
      throw new CustomError(400, "Profile ID is required");
    }
    
    const approvedProfile = await TeacherProfileService.approveProfile(profileId);
    
    return successResponse({
      res,
      data: approvedProfile,
      msg: "Profile approved successfully",
    });
  }),

  // Reject profile (Admin only)
  rejectProfile: asyncHandler(async (req, res, next) => {
    const { profileId, rejectionReasons = [] } = req.body;
    
    if (!profileId) {
      throw new CustomError(400, "Profile ID is required");
    }
    
    if (!Array.isArray(rejectionReasons) || rejectionReasons.length === 0) {
      throw new CustomError(400, "At least one rejection reason is required");
    }
    
    const rejectedProfile = await TeacherProfileService.rejectProfile(profileId, rejectionReasons);
    
    return successResponse({
      res,
      data: rejectedProfile,
      msg: "Profile rejected successfully",
    });
  }),

  // Get profile statistics (Admin only)
  getProfileStatistics: asyncHandler(async (req, res, next) => {
    // Get counts for each status
    const [incomplete, pending, approved, rejected] = await Promise.all([
      TeacherProfileService.getAllProfiles({ status: 'incomplete' }),
      TeacherProfileService.getAllProfiles({ status: 'pending' }),
      TeacherProfileService.getAllProfiles({ status: 'approved' }),
      TeacherProfileService.getAllProfiles({ status: 'rejected' })
    ]);
    
    const statistics = {
      totalProfiles: incomplete.totalCount + pending.totalCount + approved.totalCount + rejected.totalCount,
      incompleteProfiles: incomplete.totalCount,
      pendingProfiles: pending.totalCount,
      approvedProfiles: approved.totalCount,
      rejectedProfiles: rejected.totalCount,
      completionRates: {
        incomplete: incomplete.totalCount,
        pending: pending.totalCount,
        approved: approved.totalCount,
        rejected: rejected.totalCount
      }
    };
    
    return successResponse({
      res,
      data: statistics,
      msg: "Profile statistics retrieved successfully",
    });
  }),

  // Validate bank details
  validateBankDetails: asyncHandler(async (req, res, next) => {
    const { accountNumber, ifscCode, bankName } = req.body;
    
    if (!accountNumber || !ifscCode || !bankName) {
      throw new CustomError(400, "Account number, IFSC code, and bank name are required");
    }
    
    // Basic validation for IFSC code format
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode.toUpperCase())) {
      return successResponse({
        res,
        data: {
          isValid: false,
          error: "Invalid IFSC code format"
        },
        msg: "Bank details validation completed",
      });
    }
    
    // Basic validation for account number (9-18 digits)
    const accountRegex = /^\d{9,18}$/;
    if (!accountRegex.test(accountNumber)) {
      return successResponse({
        res,
        data: {
          isValid: false,
          error: "Invalid account number format (should be 9-18 digits)"
        },
        msg: "Bank details validation completed",
      });
    }
    
    // If validation passes, return success
    // In a real application, you might want to integrate with a bank verification API
    return successResponse({
      res,
      data: {
        isValid: true,
        bankInfo: {
          bankName: bankName,
          branchName: "Branch information not available",
          branchAddress: "Address information not available"
        }
      },
      msg: "Bank details validated successfully",
    });
  }),

  // Upload profile picture endpoint (can be integrated with upload service)
  uploadProfilePicture: asyncHandler(async (req, res, next) => {
    const userId = req.decodedUser._id;
    
    // This would typically handle file upload
    // For now, we'll just update the profile with the image URL
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      throw new CustomError(400, "Image URL is required");
    }
    
    const updatedProfile = await TeacherProfileService.updateCurrentUserProfile(userId, {
      'personalInfo.profilePicture': imageUrl
    });
    
    return successResponse({
      res,
      data: updatedProfile,
      msg: "Profile picture updated successfully",
    });
  }),

  // Upload resume endpoint
  uploadResume: asyncHandler(async (req, res, next) => {
    const userId = req.decodedUser._id;
    
    // This would typically handle file upload
    // For now, we'll just update the profile with the resume URL
    const { resumeUrl } = req.body;
    
    if (!resumeUrl) {
      throw new CustomError(400, "Resume URL is required");
    }
    
    const updatedProfile = await TeacherProfileService.updateCurrentUserProfile(userId, {
      'professional.resume': resumeUrl
    });
    
    return successResponse({
      res,
      data: updatedProfile,
      msg: "Resume uploaded successfully",
    });
  })

};

module.exports = teacherProfileCtrl; 