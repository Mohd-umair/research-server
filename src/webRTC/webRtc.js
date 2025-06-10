const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const rtcServer = http.createServer(app);
const io = socketIo(rtcServer, {
  cors: {
    origin: "http://localhost:5173", // Your client app's URL
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("join", (room) => {
    socket.join(room);
    socket.to(room).emit("user-joined", socket.id);
  });

  socket.on("offer", (data) => {
    socket.to(data.room).emit("offer", data);
  });

  socket.on("answer", (data) => {
    socket.to(data.room).emit("answer", data);
  });

  socket.on("candidate", (data) => {
    socket.to(data.room).emit("candidate", data);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

module.exports = rtcServer;
