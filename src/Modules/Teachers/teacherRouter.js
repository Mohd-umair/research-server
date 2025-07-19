const { verifyToken } = require('../../Utils/utils');
const teacherCtrl = require('./teacherCtrl')
const { conversationController } = require('../Chats/ConversationController');

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
router.post("/sigIn" , teacherCtrl.signIn)
router.post("/isApproved",verifyToken,teacherCtrl.approvedTeacher)

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

const teacherRouter = router

module.exports= {teacherRouter}