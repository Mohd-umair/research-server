const { verifyToken } = require("../../Utils/utils");
const { verifyAdminToken } = require("../Admin/middleware/verifyAdminToken");
const paymentRequestController = require("./paymentRequestController");

const paymentRequestRouter = require("express").Router();

// Admin routes for managing payment requests
paymentRequestRouter.get("/admin/all", verifyAdminToken, paymentRequestController.getAllPaymentRequests);
paymentRequestRouter.get("/admin/stats", verifyAdminToken, paymentRequestController.getPaymentRequestStats);
paymentRequestRouter.get("/admin/:requestId", verifyAdminToken, paymentRequestController.getPaymentRequestById);
paymentRequestRouter.put("/admin/:requestId/status", verifyAdminToken, paymentRequestController.updatePaymentRequestStatus);

// Teacher routes for viewing their payment requests
paymentRequestRouter.get("/teacher/:teacherId", verifyToken, paymentRequestController.getTeacherPaymentRequests);

// Expert earnings routes (for experts to view their earnings from completed payouts)
paymentRequestRouter.get("/expert/earnings", verifyToken, paymentRequestController.getExpertEarnings);
paymentRequestRouter.get("/expert/earnings/summary", verifyToken, paymentRequestController.getExpertEarningsSummary);

module.exports = paymentRequestRouter;
