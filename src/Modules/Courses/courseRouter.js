const { verifyToken } = require("../../Utils/utils");

const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const uploadFields = upload.fields([
  { name: "courseBanner" },
  { name: "courseThumbnail" },
]);

const courseCtrl = require("./courseCtrl");
const courseRouter = require("express").Router();

courseRouter.post("/create", verifyToken, courseCtrl.create);
courseRouter.post("/getAll", courseCtrl.getAll);
courseRouter.post("/getById", verifyToken, courseCtrl.getById);
courseRouter.post("/getUserCourses", verifyToken, courseCtrl.getUserCourses);
courseRouter.post("/update", courseCtrl.update);
courseRouter.post("/delete", courseCtrl.delete);

module.exports = { courseRouter };
