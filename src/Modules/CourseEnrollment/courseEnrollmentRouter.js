const { verifyToken } = require("../../Utils/utils");
const courseEnrollCtrl = require("./courseEnrollmentCtrl");

const router = require("express").Router();

router.post("/enroll", courseEnrollCtrl.create);
router.post("/verifyEnroll", courseEnrollCtrl.verifyEnroll);
router.post("/isStudentEnrolled", courseEnrollCtrl.isStudentEnrolled);

router.post("/allenrolledStudents", courseEnrollCtrl.AllEnrolledStudents);
const courseEnrollmentRouter = router;

module.exports = courseEnrollmentRouter;
