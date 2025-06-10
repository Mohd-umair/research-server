const assignmentCtrl = require("./assignmentCtrl");

const router = require("express").Router();

router.post("/create", assignmentCtrl.create);
router.post("/getAll", assignmentCtrl.getAll);
router.post("/getUser", assignmentCtrl.getById);
router.post("/delete", assignmentCtrl.delete);
router.post("/update", assignmentCtrl.update);


const assignmentRouter = router;

module.exports = { assignmentRouter };
