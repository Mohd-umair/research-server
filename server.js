require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const CustomError = require("./src/Errors/CustomError");
const http = require("http");
const conSocket = require("./src/Modules/Sockets/socket");
const createPeerServer = require("./src/Modules/PeerServer/peerServer");

// Import admin system utilities
const { initializeAdminSystem, validateAdminConfig } = require('./src/Modules/Admin/utils/adminUtils');

// Define ports
const SOCKET_PORT = process.env.SOCKET_PORT || 3000;
const PORT = process.env.PORT || 4006;

// Create HTTP server
const server = http.createServer(app);

// Set up PeerJS server
const peerServer = createPeerServer(server);
app.use("/peerjs", (req, res, next) => { 
  console.log('PeerJS route hit'); 
  next(); 
}, peerServer);

// Connect to MongoDB
const activeEnviroment = process.env.NODE_ENV || 'local';
const activeDbString = {
  local: process.env.MONGODB_LOCAL || 'mongodb://localhost:27017/researchdecode',
  test: process.env.MONGODB_TEST,
  prod: process.env.MONGODB_PROD,
};

const URI = activeDbString[activeEnviroment];

// Startup function
async function startServer() {
  try {
    // Connect to MongoDB
    await mongoose.connect(URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected:", URI);

    // Validate admin configuration
    validateAdminConfig();
    
    // Initialize admin system
    await initializeAdminSystem();
    
    // Start server after DB connection and admin initialization
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      
      // Initialize socket after server starts listening
      conSocket(server, SOCKET_PORT);
    });
  } catch (err) {
    console.error("Server startup error:", err);
    process.exit(1);
  }
}

// Start the server
startServer();

// Error handling
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  console.log("Shutting down server...");
  server.close(() => {
    process.exit(1);
  });
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  console.log("Shutting down server...");
  server.close(() => {
    process.exit(1);
  });
});
