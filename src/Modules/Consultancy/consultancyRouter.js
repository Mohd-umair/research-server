const { verifyToken } = require("../../Utils/utils");
const consultancyCtrl = require("./consultancyCtrl");

const consultancyRouter = require("express").Router();

consultancyRouter.post("/create",verifyToken, consultancyCtrl.create);
consultancyRouter.post("/getAll", consultancyCtrl.getAll);
consultancyRouter.post("/getById", consultancyCtrl.getById);
consultancyRouter.post("/verifypayment", consultancyCtrl.verifyPayment);
consultancyRouter.post("/verifyConsultancy",verifyToken, consultancyCtrl.verifyConsultancy);
consultancyRouter.post("/endConsultancy",verifyToken, consultancyCtrl.endConsultancy);
consultancyRouter.post("/activeOrInactiveConsultancy", verifyToken, consultancyCtrl.activeOrInactiveConsultancy);
consultancyRouter.post("/getConsultancyByTeacherOrAdmin", verifyToken, consultancyCtrl.getConsultancyByTeacherOrAdmin);
consultancyRouter.get("/check-booking", verifyToken, consultancyCtrl.checkExistingBooking);
consultancyRouter.get("/bookings/:studentId", verifyToken, consultancyCtrl.getUserBookings);
consultancyRouter.get("/expert-bookings/:teacherId", verifyToken, consultancyCtrl.getExpertBookings);
consultancyRouter.put("/accept/:consultancyId", verifyToken, consultancyCtrl.acceptConsultancy);
consultancyRouter.put("/reject/:consultancyId", verifyToken, consultancyCtrl.rejectConsultancy);
module.exports = consultancyRouter;
