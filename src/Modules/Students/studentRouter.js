const { verifyToken } = require('../../Utils/utils');
const studentCtrl = require('./studentCtrl')
const { conversationController } = require('../Chats/ConversationController');

const router = require('express').Router();

// Authentication routes (no token required)
router.post("/create" , studentCtrl.create)
router.post("/signIn" , studentCtrl.signIn)
router.get("/verify", studentCtrl.verifyEmail);
router.post("/verify-email", studentCtrl.verifyEmailExists);
router.post("/forgot-password", studentCtrl.forgotPassword);
router.post("/reset-password", studentCtrl.resetPassword);

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

// Conversation routes (require authentication)
router.get("/conversations", verifyToken, conversationController.getUserConversations);
router.post("/conversations/initiate", verifyToken, conversationController.initiateConversation);
router.get("/conversations/:conversationId/messages", verifyToken, conversationController.getConversationMessages);
router.post("/conversations/:conversationId/messages", verifyToken, conversationController.sendMessage);
router.put("/conversations/:conversationId/messages/seen", verifyToken, conversationController.markMessagesAsSeen);
router.get("/conversations/:conversationId", verifyToken, conversationController.getConversationById);
router.put("/conversations/:conversationId/status", verifyToken, conversationController.updateConversationStatus);
router.put("/conversations/:conversationId/read", verifyToken, conversationController.markAsRead);
router.put("/conversations/:conversationId/archive", verifyToken, conversationController.archiveConversation);
router.delete("/conversations/:conversationId", verifyToken, conversationController.deleteConversation);

// router.post("/upload", studentCtrl.uploadStudentFile);

const studentRouter = router

module.exports= {studentRouter}