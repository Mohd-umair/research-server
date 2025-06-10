const labsCtrl = require("./labsCtrl");
const { verifyToken } = require("../../Utils/utils");

const labsRouter = require("express").Router();

labsRouter.post("/create", verifyToken, labsCtrl.create);
labsRouter.post("/getById", verifyToken, labsCtrl.search);
labsRouter.route("/").get(labsCtrl.getAll).post(verifyToken, labsCtrl.create);
labsRouter
  .route("/:labId")
  .get(labsCtrl.getLabById)
  .put(verifyToken, labsCtrl.updateLab)
  .delete(verifyToken, labsCtrl.deleteLab);

module.exports = { labsRouter };
