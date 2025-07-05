const consultancyCardCtrl = require("./consultancyCardCtrl");
const { verifyToken } = require("../../Utils/utils");
const { verifyAdminToken } = require("../Admin/middleware/verifyAdminToken");
const consultancyCardRouter = require("express").Router();

consultancyCardRouter.post("/create", verifyToken, consultancyCardCtrl.create);
consultancyCardRouter.post("/getById", consultancyCardCtrl.getById);
// Public route for approved consultancies (no auth required)
consultancyCardRouter.post("/getApproved", consultancyCardCtrl.getApprovedConsultancies);
consultancyCardRouter.post("/getAll", verifyToken, consultancyCardCtrl.getAll);
consultancyCardRouter.post("/getUserConsultancyCard", verifyToken, consultancyCardCtrl.getUserConsultancyCard);
consultancyCardRouter.post("/update", verifyToken, consultancyCardCtrl.update);
consultancyCardRouter.post("/delete", verifyToken, consultancyCardCtrl.delete);

// New approval workflow routes (admin only)
consultancyCardRouter.post("/getAllForApproval", verifyToken, consultancyCardCtrl.getAllForApproval);
consultancyCardRouter.post("/getAllConsultanciesForAdmin", verifyAdminToken, consultancyCardCtrl.getAllConsultanciesForAdmin);
consultancyCardRouter.post("/approve", verifyToken, consultancyCardCtrl.approve);
consultancyCardRouter.post("/reject", verifyToken, consultancyCardCtrl.reject);

module.exports = consultancyCardRouter;
