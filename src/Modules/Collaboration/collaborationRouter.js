const { collaborationRequestCtrl } = require("./collaborationCtrl");
const { verifyToken } = require("../../Utils/utils");

const collaborationRequestRouter = require("express").Router();

collaborationRequestRouter.post("/create",verifyToken, collaborationRequestCtrl.create);
collaborationRequestRouter.post("/getAll", verifyToken, collaborationRequestCtrl.getAll);
collaborationRequestRouter.post("/getById", collaborationRequestCtrl.getById);
collaborationRequestRouter.post("/update", collaborationRequestCtrl.update);
collaborationRequestRouter.post("/delete", collaborationRequestCtrl.delete);

collaborationRequestRouter.post(
  "/student",
  collaborationRequestCtrl.getByStudentId
);

// Admin routes
collaborationRequestRouter.post("/admin/all", verifyToken, collaborationRequestCtrl.getAllForAdmin);
collaborationRequestRouter.post("/admin/getById", verifyToken, collaborationRequestCtrl.getByIdForAdmin);
collaborationRequestRouter.post("/admin/approve", verifyToken, collaborationRequestCtrl.approveCollaboration);
collaborationRequestRouter.post("/admin/reject", verifyToken, collaborationRequestCtrl.rejectCollaboration);
collaborationRequestRouter.post("/admin/approved", verifyToken, collaborationRequestCtrl.getApprovedCollaborations);

// Public routes (no authentication required)
collaborationRequestRouter.post("/public/approved", collaborationRequestCtrl.getPublicApprovedCollaborations);

module.exports = { collaborationRequestRouter };
