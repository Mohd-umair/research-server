const multer = require("multer");

const { paperRequestCtrl } = require("./paperRequestCtrl");
const { verifyToken } = require("../../Utils/utils");
const paperRequestRouter = require("express").Router();


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

module.exports = { paperRequestRouter };
