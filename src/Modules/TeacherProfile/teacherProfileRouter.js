const teacherProfileCtrl = require('./teacherProfileCtrl');
const { verifyToken } = require("../../Utils/utils");

const router = require('express').Router();

// All routes require authentication since they deal with user profiles

// Current user profile routes (Teacher/User access)
router.get("/me", verifyToken, teacherProfileCtrl.getCurrentProfile);
router.post("/me", verifyToken, teacherProfileCtrl.createOrUpdateProfile);
router.put("/me", verifyToken, teacherProfileCtrl.updateCurrentProfile);
router.delete("/me", verifyToken, teacherProfileCtrl.deleteCurrentProfile);

// Profile management routes
router.get("/me/completion-status", verifyToken, teacherProfileCtrl.getCompletionStatus);
router.post("/me/submit-for-verification", verifyToken, teacherProfileCtrl.submitForVerification);

// Utility routes
router.get("/skills-suggestions", verifyToken, teacherProfileCtrl.getSkillsSuggestions);
router.post("/validate-bank-details", verifyToken, teacherProfileCtrl.validateBankDetails);

// File upload routes (require integration with upload service)
router.post("/upload-profile-picture", verifyToken, teacherProfileCtrl.uploadProfilePicture);
router.post("/upload-resume", verifyToken, teacherProfileCtrl.uploadResume);

// Admin routes for profile management
router.post("/admin/all", verifyToken, teacherProfileCtrl.getAllProfiles);
router.post("/admin/profile", verifyToken, teacherProfileCtrl.getProfileById);
router.post("/admin/approve", verifyToken, teacherProfileCtrl.approveProfile);
router.post("/admin/reject", verifyToken, teacherProfileCtrl.rejectProfile);
router.get("/admin/statistics", verifyToken, teacherProfileCtrl.getProfileStatistics);

const teacherProfileRouter = router;

module.exports = { teacherProfileRouter }; 