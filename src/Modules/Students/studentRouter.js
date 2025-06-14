const { verifyToken } = require('../../Utils/utils');
const studentCtrl = require('./studentCtrl')

const router = require('express').Router();

// Authentication routes (no token required)
router.post("/create" , studentCtrl.create)
router.post("/signIn" , studentCtrl.signIn)
router.get("/verify", studentCtrl.verifyEmail);

// Admin/General routes (may need admin verification in future)
router.post("/getAll" , studentCtrl.getAll)
router.post("/getUser" , studentCtrl.getById)
router.post("/delete" , studentCtrl.delete)
router.post("/update" , studentCtrl.update)
router.post("/search", studentCtrl.searchStudents)

// Profile routes (require authentication)
router.get("/profile/me", verifyToken, studentCtrl.getCurrentProfile);
router.put("/profile/me", verifyToken, studentCtrl.updateProfile);
router.post("/profile/upload-picture", verifyToken, studentCtrl.uploadProfilePicture);
router.get("/profile/completion-status", verifyToken, studentCtrl.getProfileCompletionStatus);

// router.post("/upload", studentCtrl.uploadStudentFile);

const studentRouter = router

module.exports= {studentRouter}