const {verifyToken} = require("../../Utils/utils");
const WebinarEnrollmentsCtrl = require("./webinarEnrollmentCtrl")

const router = require("express").Router();

router.post("/enroll", verifyToken, WebinarEnrollmentsCtrl.create);
router.post("/myEnrollments", verifyToken, WebinarEnrollmentsCtrl.allEnrolledWebinars);
router.post("/unenroll", verifyToken,  WebinarEnrollmentsCtrl.delete);
router.post("/isEnroll", verifyToken,  WebinarEnrollmentsCtrl.isEnroll);
const webinarEnrollmentRouter = router;
module.exports = webinarEnrollmentRouter;