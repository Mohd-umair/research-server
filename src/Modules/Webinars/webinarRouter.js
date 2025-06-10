const {verifyToken, checkAccess} = require("../../Utils/utils");
const webinarCtrl = require("./webinarCtrl");
const router = require("express").Router();

// Routes
router.post("/create", verifyToken, webinarCtrl.create);
router.post("/getAll", webinarCtrl.getAll);
router.post("/getById", webinarCtrl.getById);
router.post("/update",verifyToken, webinarCtrl.update);
router.post("/delete",verifyToken, webinarCtrl.delete);

const webinarRouter = router;
module.exports = {webinarRouter};