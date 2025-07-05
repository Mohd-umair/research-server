const socketIo = require("socket.io");
const { chatService } = require("../Chats/ChatService");
const { conversationService } = require("../Chats/ConversationService");
const corsOptions = {
  origin: "*", // Add allowed origins here
  methods: ["GET", "POST"],
  credentials: false,
};

const onlineUsers = new Map();
const conSocket = (server) => {
  console.log(`Socket is running on port ${server.address()?.port}`)
  const io = socketIo(server, {
    cors: corsOptions, // Apply CORS configuration
  });

  io.on("connection", (socket) => {
    console.log("A new client connected", socket.id);
    const clientsCount = io.sockets.sockets.size;
    console.log(clientsCount)

    // Join conversation room - enhanced for conversation threads
    socket.on("joinConversation", (conversationId) => {
      console.log("Joining conversation:", conversationId);
      socket.join(`conversation_${conversationId}`);
      
      // Leave any previous conversation rooms
      socket.on("leaveConversation", (prevConversationId) => {
        console.log("Leaving conversation:", prevConversationId);
        socket.leave(`conversation_${prevConversationId}`);
      });
    });

    // Legacy support for existing room joining
    socket.on("joinRoom", (roomId) => {
      console.log("Joining room:", roomId);
      socket.join(roomId);
      socket.on("leaveroom", (params) => {
        console.log("Leaving room:", params);
      });
    });

    // Track online users
    socket.on("online", (userId) => {
      console.log("User online:", userId);
      onlineUsers.set(userId, socket.id);
      console.log("Online users count:", onlineUsers.size);
    });

    // Enhanced chat message handling with conversation support
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

    // Legacy chat support (backward compatibility)
    socket.on("chat", async (params) => {
      const { roomId } = params;
      io.to(roomId).emit("message", params);
      await chatService.createChats(params);
    });

    // Mark messages as seen in conversation
    socket.on("markConversationSeen", async (data) => {
      try {
        const { conversationId, userId } = data;
        
        // Mark messages as seen
        await chatService.markMessagesAsSeen({ conversationId, userId });
        
        // Update conversation unread count
        await conversationService.markAsRead({ 
          conversationId, 
          decodedUser: { _id: userId } 
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
      const { conversationId, userId, isTyping } = data;
      socket.to(`conversation_${conversationId}`).emit("userTyping", {
        userId,
        isTyping,
        timestamp: new Date()
      });
    });

    // Handle user going offline
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      
      // Remove from online users
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          console.log("Removed user from online list:", userId);
          break;
        }
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
