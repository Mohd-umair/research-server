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

// initialise required modules
app.use(cors({ origin: "*" }));

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
