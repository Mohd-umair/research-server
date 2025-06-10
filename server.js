require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const CustomError = require("./src/Errors/CustomError");
const http = require("http");
const conSocket = require("./src/Modules/Sockets/socket");

// Define ports
const SOCKET_PORT = process.env.SOCKET_PORT || 5000;
const PORT = process.env.PORT || 5001;

// Create HTTP server
const server = http.createServer(app);

// Initialize socket
conSocket(server);

// Connect to MongoDB
const activeEnviroment = process.env.NODE_ENV || 'local';
const activeDbString = {
  local: process.env.MONGODB_LOCAL || 'mongodb://localhost:27017/furniture',
  test: process.env.MONGODB_TEST,
  prod: process.env.MONGODB_PROD,
};

const URI = activeDbString[activeEnviroment];

mongoose
  .connect(URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB Connected:", URI);
    // Start server after DB connection
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

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
