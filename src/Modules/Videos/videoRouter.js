const { verifyToken } = require("../../Utils/utils");
const videoCtrl = require("./videoCtrl");
const videoRouter = require("express").Router();
const multer = require("multer");




videoRouter.post(
  "/create",
  verifyToken,
  videoCtrl.create
);
videoRouter.post("/getAll", videoCtrl.getAll);
videoRouter.post("/getById", videoCtrl.getById);
videoRouter.post("/update", videoCtrl.update);
videoRouter.post("/delete", videoCtrl.delete);
videoRouter.post("/byCourseId", videoCtrl.getByCourseId);

module.exports = { videoRouter };
