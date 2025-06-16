const multer = require("multer");

const { paperRequestCtrl } = require("./paperRequestCtrl");
const { verifyToken } = require("../../Utils/utils");
const paperRequestRouter = require("express").Router();

// Configure multer for file uploads (memory storage for Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

paperRequestRouter.post("/createRequest", paperRequestCtrl.create);
paperRequestRouter.post(
  "/approveRequest",
  verifyToken,
  paperRequestCtrl.approve
);
paperRequestRouter.post(
  "/rejectRequest",
  verifyToken,
  paperRequestCtrl.rejectRequest
);

paperRequestRouter.post(
  "/uploadRequestPaper",
  verifyToken,
  paperRequestCtrl.upload
);
paperRequestRouter.post(
  "/pendingRequests",
  paperRequestCtrl.getAllPendingRequests
);

paperRequestRouter.post(
  "/getPendingRequestById",
  paperRequestCtrl.getPendingRequestById
);
paperRequestRouter.post(
  "/getPendingRequestByUserId",
  paperRequestCtrl.getRequestByUserId
);

paperRequestRouter.post("/fulfillUserRequest", verifyToken, upload.single('file'), paperRequestCtrl.fulfillUserRequest);

module.exports = { paperRequestRouter };
