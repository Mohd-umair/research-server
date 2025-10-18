const { verifyToken } = require('../../Utils/utils');
const teacherCtrl = require('./teacherCtrl')
const { conversationController } = require('../Chats/ConversationController');
const notificationCtrl = require('../Notifications/notificationCtrl');

const router = require('express').Router();

router.post("/create" , teacherCtrl.create)
router.post("/register" , teacherCtrl.register)
router.post("/approve" , teacherCtrl.approveTeacher)
router.post("/getPending" , teacherCtrl.getPendingTeachers)
router.post("/checkProfileStatus", verifyToken, teacherCtrl.checkProfileStatus)
router.post("/getAll" , teacherCtrl.getAll)
router.post("/getById" , teacherCtrl.getById)
router.post("/delete" , teacherCtrl.delete)
router.post("/update" , teacherCtrl.update)
router.post("/signIn" , teacherCtrl.signIn)
router.post("/isApproved",verifyToken,teacherCtrl.approvedTeacher)
router.post("/verify-email", teacherCtrl.verifyEmailExists);
router.post("/forgot-password", teacherCtrl.forgotPassword);
router.post("/reset-password", teacherCtrl.resetPassword);

// Teacher conversation routes
router.get("/conversations", verifyToken, conversationController.getUserConversations);
router.get("/conversations/:conversationId", verifyToken, conversationController.getConversationById);
router.get("/conversations/:conversationId/messages", verifyToken, conversationController.getConversationMessages);
router.post("/conversations/:conversationId/messages", verifyToken, conversationController.sendMessage);
router.put("/conversations/:conversationId/messages/seen", verifyToken, conversationController.markMessagesAsSeen);
router.put("/conversations/:conversationId/read", verifyToken, conversationController.markAsRead);
router.put("/conversations/:conversationId/status", verifyToken, conversationController.updateConversationStatus);
router.put("/conversations/:conversationId/archive", verifyToken, conversationController.archiveConversation);
router.delete("/conversations/:conversationId", verifyToken, conversationController.deleteConversation);

// Teacher notification routes
router.get("/notifications", verifyToken, notificationCtrl.getNotifications);
router.get("/notifications/unread-count", verifyToken, notificationCtrl.getUnreadCount);
router.put("/notifications/:id/read", verifyToken, notificationCtrl.markAsRead);
router.put("/notifications/mark-all-read", verifyToken, notificationCtrl.markAllAsRead);
router.delete("/notifications/:id", verifyToken, notificationCtrl.deleteNotification);

const teacherRouter = router

module.exports= {teacherRouter}