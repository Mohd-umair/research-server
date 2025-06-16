const { verifyToken } = require("../../Utils/utils");
const userRequestCtrl = require("./userRequestCtrl");
const { websiteUserRequestRouter } = require("./websiteUserRequestRouter");
const userRequestRouter = require("express").Router();

// ===== WEBSITE PUBLIC ROUTES =====
// Mount website-specific routes
userRequestRouter.use("/website", websiteUserRequestRouter);

// ===== AUTHENTICATED USER ROUTES =====
// Create new user request
userRequestRouter.post("/create", verifyToken, userRequestCtrl.create);

// Get all user requests (filtered by logged-in user)
userRequestRouter.post("/getAll", verifyToken, userRequestCtrl.getAll);

// Get user request by ID
userRequestRouter.post("/getById", verifyToken, userRequestCtrl.getById);

// Update user request
userRequestRouter.post("/update", verifyToken, userRequestCtrl.update);

// Delete user request
userRequestRouter.post("/delete", verifyToken, userRequestCtrl.delete);

// Get user's request statistics
userRequestRouter.post("/getStatistics", verifyToken, userRequestCtrl.getStatistics);

// Update request status (for admin use)
userRequestRouter.post("/updateStatus", verifyToken, userRequestCtrl.updateStatus);

// Update fulfillment status (user confirms/rejects found document)
userRequestRouter.post("/updateFulfillmentStatus", verifyToken, userRequestCtrl.updateFulfillmentStatus);

// Search user requests
userRequestRouter.post("/search", verifyToken, userRequestCtrl.search);

module.exports = { userRequestRouter }; 