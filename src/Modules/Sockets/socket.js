const socketIo = require("socket.io");
const { chatService } = require("../Chats/ChatService");
const { conversationService } = require("../Chats/ConversationService");
const jwt = require("jsonwebtoken");

const corsOptions = {
  origin: "*", // Add allowed origins here
  methods: ["GET", "POST"],
  credentials: false,
};

const onlineUsers = new Map();

// Middleware to authenticate socket connections
const authenticateSocket = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify JWT token using the same secret as the rest of the backend
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Be consistent with the verifyToken middleware - JWT contains _id, but we use id
    socket.userId = decoded._id; // JWT token contains _id
    socket.user = {
      id: decoded._id, // Set id for consistency with req.user format
      firstName: decoded.firstName,
      userType: decoded.userType
    };
    
    console.log(`Socket authenticated for user: ${socket.userId}`);
    next();
  } catch (err) {
    console.error('Socket authentication failed:', err.message);
    next(new Error('Authentication error: Invalid token'));
  }
};

const conSocket = (server, port) => {
  console.log(`Socket is running on port ${port}`)
  const io = socketIo(server, {
    cors: corsOptions, // Apply CORS configuration
  });

  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    console.log("A new client connected", socket.id, "User:", socket.userId);
    const clientsCount = io.sockets.sockets.size;
    console.log("Total connected clients:", clientsCount);

    // Track online users
    if (socket.userId) {
      onlineUsers.set(socket.userId, socket.id);
      console.log("User online:", socket.userId);
      
      // Broadcast updated online users list
      const onlineUserIds = Array.from(onlineUsers.keys());
      io.emit("onlineUsers", onlineUserIds);
    }

    // Join conversation room - enhanced for conversation threads
    socket.on("joinConversation", (conversationId) => {
      console.log("Joining conversation:", conversationId, "User:", socket.userId);
      socket.join(`conversation_${conversationId}`);
      
      // Notify others in the conversation that user joined
      socket.to(`conversation_${conversationId}`).emit("userJoinedConversation", {
        userId: socket.userId,
        conversationId
      });
    });

    // Leave conversation room
    socket.on("leaveConversation", (conversationId) => {
      console.log("Leaving conversation:", conversationId, "User:", socket.userId);
      socket.leave(`conversation_${conversationId}`);
      
      // Notify others in the conversation that user left
      socket.to(`conversation_${conversationId}`).emit("userLeftConversation", {
        userId: socket.userId,
        conversationId
      });
    });

    // Handle new message sending (matching Angular frontend)
    socket.on("sendMessage", async (messageData) => {
      try {
        console.log("Received sendMessage event:", messageData);
        
        const { 
          conversationId, 
          message, 
          senderId, 
          senderName,
          type = 'text',
          fileUrl = null,
          fileName = null
        } = messageData;

        // Validate required fields
        if (!conversationId || !message || !senderId) {
          socket.emit("messageError", { error: "Missing required fields: conversationId, message, senderId" });
          return;
        }

        // Verify user has access to this conversation
        const conversation = await conversationService.getConversationById({
          conversationId,
          decodedUser: { id: senderId } // Use consistent id format
        });

        if (!conversation) {
          socket.emit("messageError", { error: "Conversation not found or access denied" });
          return;
        }

        // Find the recipient (other participant)
        const otherParticipant = conversation.participants.find(p => 
          p.user.toString() !== senderId
        );

        if (!otherParticipant) {
          socket.emit("messageError", { error: "Recipient not found in conversation" });
          return;
        }

        // Save message to database
        const savedMessage = await chatService.createChats({
          conversationId,
          sender: senderId,
          recipient: otherParticipant.user,
          message,
          messageType: type,
          attachment: fileUrl ? { url: fileUrl, filename: fileName } : null,
          senderModel: socket.user.userType === 'USER' ? 'Student' : 'Profile',
          recipientModel: otherParticipant.userModel
        });

        // Create response message
        const responseMessage = {
          id: savedMessage._id,
          conversationId,
          message,
          senderId,
          senderName,
          timestamp: new Date(),
          type,
          fileUrl,
          fileName,
          isRead: false
        };

        // Emit to conversation room for real-time delivery
        io.to(`conversation_${conversationId}`).emit("newMessage", responseMessage);
        
        // Send notification to recipient if online
        const recipientSocketId = onlineUsers.get(otherParticipant.user.toString());
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("messageNotification", {
            conversationId,
            senderId,
            senderName,
            message,
            timestamp: new Date()
          });
        }

        console.log("Message sent successfully:", responseMessage.id);
        
      } catch (error) {
        console.error("Error handling sendMessage event:", error);
        socket.emit("messageError", { error: error.message });
      }
    });

    // Enhanced chat message handling with conversation support (legacy support)
    socket.on("conversationMessage", async (params) => {
      try {
        const { conversationId, sender, recipient, message, messageType = 'text', attachment = null } = params;
        
        // Save message to database
        const savedMessage = await chatService.createChats({
          conversationId,
          sender,
          recipient,
          message,
          messageType,
          attachment,
          senderModel: params.senderModel || 'Student',
          recipientModel: params.recipientModel || 'Profile'
        });
        
        // Emit to conversation room
        io.to(`conversation_${conversationId}`).emit("newMessage", {
          ...savedMessage.toObject(),
          timestamp: new Date()
        });
        
        // Notify recipient if online
        const recipientSocketId = onlineUsers.get(recipient);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit("messageNotification", {
            conversationId,
            sender,
            message,
            timestamp: new Date()
          });
        }
        
      } catch (error) {
        console.error("Error handling conversation message:", error);
        socket.emit("messageError", { error: error.message });
      }
    });

    // Mark messages as read
    socket.on("markAsRead", async (data) => {
      try {
        const { conversationId, messageIds } = data;
        const userId = socket.userId;
        
        // Mark messages as seen
        await chatService.markMessagesAsSeen({ conversationId, userId });
        
        // Update conversation unread count
        await conversationService.markAsRead({ 
          conversationId, 
          decodedUser: { id: userId } // Use consistent id format
        });
        
        // Notify conversation participants
        io.to(`conversation_${conversationId}`).emit("messagesSeen", {
          conversationId,
          userId,
          messageIds,
          timestamp: new Date()
        });
        
      } catch (error) {
        console.error("Error marking messages as read:", error);
        socket.emit("readError", { error: error.message });
      }
    });

    // Legacy message seen support
    socket.on("markConversationSeen", async (data) => {
      try {
        const { conversationId, userId } = data;
        
        // Mark messages as seen
        await chatService.markMessagesAsSeen({ conversationId, userId });
        
        // Update conversation unread count
        await conversationService.markAsRead({ 
          conversationId, 
          decodedUser: { id: userId } // Use consistent id format
        });
        
        // Notify conversation participants
        io.to(`conversation_${conversationId}`).emit("messagesSeen", {
          conversationId,
          userId,
          timestamp: new Date()
        });
        
      } catch (error) {
        console.error("Error marking conversation as seen:", error);
        socket.emit("seenError", { error: error.message });
      }
    });

    // Legacy message seen support
    socket.on("markSeen", async (data) => {
      console.log("Seen event triggered", data);
      const { messageId } = data;
      await chatService.update({ chatId: messageId, isSeen: true });
    });

    // Typing indicators for conversations
    socket.on("typing", (data) => {
      const { conversationId, isTyping } = data;
      const userId = socket.userId;
      
      socket.to(`conversation_${conversationId}`).emit("userTyping", {
        conversationId,
        userId,
        isTyping,
        timestamp: new Date()
      });
    });

    // Legacy support for existing room joining
    socket.on("joinRoom", (roomId) => {
      console.log("Joining room:", roomId);
      socket.join(roomId);
    });

    socket.on("leaveroom", (params) => {
      console.log("Leaving room:", params);
    });

    // Track online users (legacy)
    socket.on("online", (userId) => {
      console.log("User online (legacy):", userId);
      onlineUsers.set(userId, socket.id);
      console.log("Online users count:", onlineUsers.size);
    });

    // Legacy chat support (backward compatibility)
    socket.on("chat", async (params) => {
      const { roomId } = params;
      io.to(roomId).emit("message", params);
      await chatService.createChats(params);
    });

    // Handle user going offline
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id, "User:", socket.userId);
      
      // Remove from online users
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        console.log("Removed user from online list:", socket.userId);
        
        // Broadcast updated online users list
        const onlineUserIds = Array.from(onlineUsers.keys());
        io.emit("onlineUsers", onlineUserIds);
      }
      
      // Legacy support
      socket.broadcast.emit("callEnded");
    });

    // Video call support (existing functionality)
    socket.on("callUser", (data) => {
      io.to(data.userToCall).emit("callUser", {
        signal: data.signalData,
        from: data.from,
        name: data.name,
      });
    });

    socket.on("answerCall", (data) => {
      io.to(data.to).emit("callAccepted", data.signal);
    });

    socket.on("offer", (data) => {
      socket.broadcast.emit("offer", data);
    });

    socket.on("answer", (data) => {
      socket.broadcast.emit("answer", data);
    });

    socket.on("ice-candidate", (data) => {
      socket.broadcast.emit("ice-candidate", data);
    });
  });

  return io;
};

module.exports = conSocket;
