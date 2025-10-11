const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const GlobalErrorHandler = require("./src/Errors/GlobalError");
const { adminRouter, userRouter, apiRouter } = require("./src/Modules/indexRouter");
const { websiteUserRequestRouter } = require("./src/Modules/UserRequest/websiteUserRequestRouter");
const { teacherProfileRouter } = require("./src/Modules/TeacherProfile/teacherProfileRouter");
const { paymentRouter } = require("./src/Modules/Payment/paymentRouter");
const CustomError = require("./src/Errors/CustomError");
const cloudinary = require("cloudinary");
const createPeerServer = require("./src/Modules/PeerServer/peerServer");

cloudinary.config({
  cloud_name: "dydmzp82t",
  api_key: "573256125428726",
  api_secret: "ZxVgyMOzXuHjHqwHLbavF94iOf4", // Replace with your actual API secret
});

const app = express();


// const corsOrigins = [
//   "http://localhost:4200", 
//   "https://localhost:4200", 
//   "http://localhost:4201", 
//   "https://localhost:4201",
//   "http://localhost:3000", 
//   "http://localhost:8080",
//   "http://localhost:3001",
//   "https://researchdecode.com", 
//   "https://www.researchdecode.com", 
//   "https://admin.researchdecode.com",
//   "https://srv695649.hstgr.cloud",
//   "https://srv695649.hstgr.cloud:4200",
//   "https://srv695649.hstgr.cloud:4201",
//   "http://srv695649.hstgr.cloud",
//   "http://srv695649.hstgr.cloud:4200", 
//   "http://srv695649.hstgr.cloud:4201",
//   "http://46.202.166.229",
//   "http://46.202.166.229:4200",
//   "http://46.202.166.229:4201"
// ];

//     app.use(cors({
//       origin: function (origin, callback) {
//         // Allow requests with no origin (like curl, postman)
//         if (!origin) return callback(null, true);
//         if (corsOrigins.indexOf(origin) !== -1) {
//           callback(null, true);
//         } else {
//           console.log('CORS blocked origin:', origin);
//           callback(new Error('Not allowed by CORS'));
//         }
//       },
//       credentials: true,
//       methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
//       allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
//       exposedHeaders: ['Content-Range', 'X-Content-Range'],
//       maxAge: 86400 // 24 hours
//     }));

    app.use(cors({
      origin: '*', // allow all origins temporarily
      credentials: true, // you can disable credentials for testing
    }));
// Handle preflight requests
app.options('*', cors());

// Parse JSON and URL encoded data for all routes EXCEPT upload routes
app.use('/admin/upload', (req, res, next) => {
  // Skip all body parsing for upload routes - let multer handle it
  console.log('Upload route - skipping body parsing');
  next();
});

// Regular JSON parsing for non-upload routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(cookieParser());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// to manage routes of ADMIN_PANEL and WEBSITE seperately
app.get("/", (req, res) => {
  console.log("Root route hit");
  res.send("Hello World");
});

// Health check endpoints for monitoring
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    database: 'connected',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Public website routes (no authentication required)
app.use("/user-request/website", (req, res, next) => { 
  console.log('Public user-request route hit'); 
  next(); 
}, websiteUserRequestRouter);

// Public API routes
app.use("/api", (req, res, next) => { console.log('Public API route hit'); next(); }, apiRouter);
app.use("/admin", (req, res, next) => { console.log('Admin route hit'); next(); }, adminRouter);
app.use("/user", (req, res, next) => { console.log('User route hit'); next(); }, userRouter);

// PeerJS routes will be set up in server.js after the server is created
// app.use("/peerjs", (req, res, next) => { console.log('PeerJS route hit'); next(); }, peerServer);

app.use(GlobalErrorHandler);

// to manage incorrect routes
app.use("*", (req, res) => {
  return res
    .status(404)
    .json({ msg: `Requested Route ${req.originalUrl} does not exist ` });
});

module.exports = app;
