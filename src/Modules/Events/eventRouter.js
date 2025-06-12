const {verifyToken, checkAccess} = require("../../Utils/utils");
const eventCtrl = require("./eventCtrl");
const router = require("express").Router();

// CRUD Routes
router.post("/create", verifyToken, eventCtrl.create);
router.post("/getAll", verifyToken, eventCtrl.getAll);
router.post("/getById", eventCtrl.getById);
router.post("/update", verifyToken, eventCtrl.update);
router.post("/delete", verifyToken, eventCtrl.delete);

// Additional Routes
router.post("/updateStatus", verifyToken, eventCtrl.updateStatus);
router.post("/updateAttendeeCount", verifyToken, eventCtrl.updateAttendeeCount);

const eventRouter = router;
module.exports = {eventRouter}; 