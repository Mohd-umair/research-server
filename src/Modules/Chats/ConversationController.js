const { conversationService } = require("./ConversationService");
const { chatService } = require("./ChatService");
const successResponse = require("../../Utils/apiResponse");
const { verifyToken } = require("../../Utils/utils");

const conversationController = {
  
  /**
   * POST /api/conversations/initiate
   * Initiate a new conversation between student and teacher
   * This is the main endpoint for "Chat Before Purchase" functionality
   */
  initiateConversation: async (req, res) => {
    try {
      const { teacherId, consultancyId, consultancyTitle } = req.body;
      const decodedUser = req.user || req.decodedUser; // From JWT middleware
      
      // Validation
      if (!teacherId) {
        return res.status(400).json({ msg: "Teacher ID is required" });
      }
      
      if (!decodedUser || !decodedUser._id) {
        return res.status(401).json({ msg: "Authentication required" });
      }
      
      // Ensure only students can initiate conversations
      if (decodedUser.userType !== 'USER') {
        return res.status(403).json({ msg: "Only students can initiate conversations with teachers" });
      }
      
      const result = await conversationService.initiateConversation({
        studentId: decodedUser._id,
        teacherId,
        consultancyId,
        consultancyTitle,
        decodedUser
      });
      
      return successResponse({
        res,
        msg: result.message,
        data: result
      });
      
    } catch (error) {
      console.error("Error initiating conversation:", error);
      return res.status(500).json({ msg: error.message || "Failed to initiate conversation" });
    }
  },

  /**
   * GET /api/conversations
   * Get all conversations for the authenticated user
   */
  getUserConversations: async (req, res) => {
    try {
      const decodedUser = req.user || req.decodedUser;
      
      if (!decodedUser || !decodedUser._id) {
        return res.status(401).json({ msg: "Authentication required" });
      }
      
      const conversations = await conversationService.getUserConversations({
        decodedUser
      });
      
      return successResponse({
        res,
        msg: "Conversations fetched successfully",
        data: {
          conversations,
          count: conversations.length
        }
      });
      
    } catch (error) {
      console.error("Error fetching conversations:", error);
      return res.status(500).json({ msg: error.message || "Failed to fetch conversations" });
    }
  },

  /**
   * GET /api/conversations/:conversationId
   * Get specific conversation by ID
   */
  getConversationById: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const decodedUser = req.user || req.decodedUser;
      
      if (!decodedUser || !decodedUser._id) {
        return res.status(401).json({ msg: "Authentication required" });
      }
      
      if (!conversationId) {
        return res.status(400).json({ msg: "Conversation ID is required" });
      }
      
      const conversation = await conversationService.getConversationById({
        conversationId,
        decodedUser
      });
      
      return successResponse({
        res,
        msg: "Conversation fetched successfully",
        data: { conversation }
      });
      
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return res.status(500).json({ msg: error.message || "Failed to fetch conversation" });
    }
  },

  /**
   * GET /api/conversations/:conversationId/messages
   * Get messages for a specific conversation
   */
  getConversationMessages: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const decodedUser = req.user || req.decodedUser;
      
      if (!decodedUser || !decodedUser._id) {
        return res.status(401).json({ msg: "Authentication required" });
      }
      
      if (!conversationId) {
        return res.status(400).json({ msg: "Conversation ID is required" });
      }
      
      const result = await chatService.getConversationMessages({
        conversationId,
        page: parseInt(page),
        limit: parseInt(limit),
        decodedUser
      });
      
      return successResponse({
        res,
        msg: "Messages fetched successfully",
        data: result
      });
      
    } catch (error) {
      console.error("Error fetching messages:", error);
      return res.status(500).json({ msg: error.message || "Failed to fetch messages" });
    }
  },

  /**
   * POST /api/conversations/:conversationId/messages
   * Send a message in a conversation
   */
  sendMessage: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { content, messageType = 'text', attachment = null } = req.body;
      const decodedUser = req.user || req.decodedUser;
      
      if (!decodedUser || !decodedUser._id) {
        return res.status(401).json({ msg: "Authentication required" });
      }
      
      if (!conversationId || !content) {
        return res.status(400).json({ msg: "Conversation ID and message content are required" });
      }
      
      // First, verify the user has access to this conversation
      const conversation = await conversationService.getConversationById({
        conversationId,
        decodedUser
      });
      
      // Find the recipient (other participant)
      const otherParticipant = conversation.participants.find(p => 
        p.user.toString() !== decodedUser._id
      );
      
      if (!otherParticipant) {
        return res.status(400).json({ msg: "Recipient not found in conversation" });
      }
      
      const messageData = {
        conversationId,
        sender: decodedUser._id,
        recipient: otherParticipant.user,
        message: content,
        messageType,
        attachment,
        senderModel: decodedUser.userType === 'USER' ? 'Student' : 'Profile',
        recipientModel: otherParticipant.userModel
      };
      
      const savedMessage = await chatService.createChats(messageData);
      
      return successResponse({
        res,
        msg: "Message sent successfully",
        data: { message: savedMessage }
      });
      
    } catch (error) {
      console.error("Error sending message:", error);
      return res.status(500).json({ msg: error.message || "Failed to send message" });
    }
  },

  /**
   * PUT /api/conversations/:conversationId/messages/seen
   * Mark messages as seen in a conversation
   */
  markMessagesAsSeen: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const decodedUser = req.user || req.decodedUser;
      
      if (!decodedUser || !decodedUser._id) {
        return res.status(401).json({ msg: "Authentication required" });
      }
      
      if (!conversationId) {
        return res.status(400).json({ msg: "Conversation ID is required" });
      }
      
      const result = await chatService.markMessagesAsSeen({
        conversationId,
        userId: decodedUser._id
      });
      
      return successResponse({
        res,
        msg: "Messages marked as seen",
        data: result
      });
      
    } catch (error) {
      console.error("Error marking messages as seen:", error);
      return res.status(500).json({ msg: error.message || "Failed to mark messages as seen" });
    }
  },

  /**
   * PUT /api/conversations/:conversationId/status
   * Update conversation status
   */
  updateConversationStatus: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { status } = req.body;
      const decodedUser = req.user || req.decodedUser;
      
      if (!decodedUser || !decodedUser._id) {
        return res.status(401).json({ msg: "Authentication required" });
      }
      
      if (!conversationId || !status) {
        return res.status(400).json({ msg: "Conversation ID and status are required" });
      }
      
      // Validate status
      const validStatuses = ['active', 'archived', 'closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ msg: "Invalid status. Must be one of: active, archived, closed" });
      }
      
      const updatedConversation = await conversationService.updateConversationStatus({
        conversationId,
        status,
        decodedUser
      });
      
      return successResponse({
        res,
        msg: "Conversation status updated successfully",
        data: { conversation: updatedConversation }
      });
      
    } catch (error) {
      console.error("Error updating conversation status:", error);
      return res.status(500).json({ msg: error.message || "Failed to update conversation status" });
    }
  },

  /**
   * PUT /api/conversations/:conversationId/read
   * Mark conversation as read
   */
  markAsRead: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const decodedUser = req.user || req.decodedUser;
      
      if (!decodedUser || !decodedUser._id) {
        return res.status(401).json({ msg: "Authentication required" });
      }
      
      if (!conversationId) {
        return res.status(400).json({ msg: "Conversation ID is required" });
      }
      
      const result = await conversationService.markAsRead({
        conversationId,
        decodedUser
      });
      
      return successResponse({
        res,
        msg: result.message,
        data: result
      });
      
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      return res.status(500).json({ msg: error.message || "Failed to mark conversation as read" });
    }
  },

  /**
   * PUT /api/conversations/:conversationId/archive
   * Archive conversation
   */
  archiveConversation: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const decodedUser = req.user || req.decodedUser;
      
      if (!decodedUser || !decodedUser._id) {
        return res.status(401).json({ msg: "Authentication required" });
      }
      
      if (!conversationId) {
        return res.status(400).json({ msg: "Conversation ID is required" });
      }
      
      const archivedConversation = await conversationService.archiveConversation({
        conversationId,
        decodedUser
      });
      
      return successResponse({
        res,
        msg: "Conversation archived successfully",
        data: { conversation: archivedConversation }
      });
      
    } catch (error) {
      console.error("Error archiving conversation:", error);
      return res.status(500).json({ msg: error.message || "Failed to archive conversation" });
    }
  },

  /**
   * DELETE /api/conversations/:conversationId
   * Delete conversation (soft delete)
   */
  deleteConversation: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const decodedUser = req.user || req.decodedUser;
      
      if (!decodedUser || !decodedUser._id) {
        return res.status(401).json({ msg: "Authentication required" });
      }
      
      if (!conversationId) {
        return res.status(400).json({ msg: "Conversation ID is required" });
      }
      
      const deletedConversation = await conversationService.deleteConversation({
        conversationId,
        decodedUser
      });
      
      return successResponse({
        res,
        msg: "Conversation deleted successfully",
        data: { conversation: deletedConversation }
      });
      
    } catch (error) {
      console.error("Error deleting conversation:", error);
      return res.status(500).json({ msg: error.message || "Failed to delete conversation" });
    }
  }
};

module.exports = { conversationController }; 