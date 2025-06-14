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

module.exports = { collaborationRequestRouter };
