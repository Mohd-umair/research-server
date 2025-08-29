const express = require("express");
const { conversationController } = require("./ConversationController");
const { verifyToken } = require("../../Utils/utils");

const router = express.Router();

/**
 * @route   POST /api/conversations/initiate
 * @desc    Initiate a new conversation between student and teacher
 * @access  Private (Students only)
 * @body    { teacherId, consultancyId?, consultancyTitle? }
 */
router.post("/initiate", verifyToken, conversationController.initiateConversation);

/**
 * @route   GET /api/conversations
 * @desc    Get all conversations for the authenticated user
 * @access  Private
 */
router.get("/", verifyToken, conversationController.getUserConversations);

/**
 * @route   GET /api/conversations/:conversationId
 * @desc    Get specific conversation by ID
 * @access  Private
 */
router.get("/:conversationId", verifyToken, conversationController.getConversationById);

/**
 * @route   GET /api/conversations/:conversationId/messages
 * @desc    Get messages for a specific conversation
 * @access  Private
 * @query   { page?, limit? }
 */
router.get("/:conversationId/messages", verifyToken, conversationController.getConversationMessages);

/**
 * @route   POST /api/conversations/:conversationId/messages
 * @desc    Send a message in a conversation
 * @access  Private
 * @body    { content, messageType?, attachment? }
 */
router.post("/:conversationId/messages", verifyToken, conversationController.sendMessage);

/**
 * @route   PUT /api/conversations/:conversationId/messages/seen
 * @desc    Mark messages as seen in a conversation
 * @access  Private
 */
router.put("/:conversationId/messages/seen", verifyToken, conversationController.markMessagesAsSeen);

/**
 * @route   PUT /api/conversations/:conversationId/status
 * @desc    Update conversation status
 * @access  Private
 * @body    { status }
 */
router.put("/:conversationId/status", verifyToken, conversationController.updateConversationStatus);

/**
 * @route   PUT /api/conversations/:conversationId/read
 * @desc    Mark conversation as read
 * @access  Private
 */
router.put("/:conversationId/read", verifyToken, conversationController.markAsRead);

/**
 * @route   PUT /api/conversations/:conversationId/archive
 * @desc    Archive conversation
 * @access  Private
 */
router.put("/:conversationId/archive", verifyToken, conversationController.archiveConversation);

/**
 * @route   DELETE /api/conversations/:conversationId
 * @desc    Delete conversation (soft delete)
 * @access  Private
 */
router.delete("/:conversationId", verifyToken, conversationController.deleteConversation);

/**
 * @route   GET /api/conversations/:conversationId/context
 * @desc    Get conversation context information
 * @access  Private
 */
router.get("/:conversationId/context", verifyToken, conversationController.getConversationContext);

module.exports = router; 