const socketIo = require("socket.io");
const { chatService } = require("../Chats/ChatService");
const corsOptions = {
  origin: "*", // Add allowed origins here
  methods: ["GET", "POST"],
  credentials: false,
};

const onlineUsers = new Map();
const conSocket = (server) => {
  console.log(`Scoekt is running on port ${server.address()?.port}`)
  const io = socketIo(server, {
    cors: corsOptions, // Apply CORS configuration
  });

  io.on("connection", (socket) => {
    console.log("A new client connected", socket.id);
    const clientsCount = io.sockets.sockets.size;
    console.log(clientsCount)

    socket.on("joinRoom", (roomId) => {
      console.log(roomId);

      socket.join(roomId);
      socket.on("leaveroom", (params) => {
        console.log(params);
      });
    });

    socket.on("online", (teacherId) => {
      console.log(teacherId);
      onlineUsers.set(teacherId, socket.id);
      console.log(onlineUsers.size)
    })


    socket.on("chat", async (params) => {
      const { roomId } = params;
      io.to(roomId).emit("message", params);
      await chatService.createChats(params);
    });

    socket.on("markSeen", async (data) => {
      console.log("Seen event triggered", data)
      const { messageId } = data

      await chatService.update({chatId : messageId, isSeen:true})
    })

    socket.on("disconnect", () => {
      console.log("disconnected")
      socket.broadcast.emit("callEnded");
    });

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

    socket.on("candidate", (data) => {
      console.log("Candidate received:", data);
      socket.broadcast.emit("candidate", data);
    });
  });
};

module.exports = conSocket;
