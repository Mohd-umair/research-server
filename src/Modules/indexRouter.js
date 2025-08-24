const { verifyToken } = require("../Utils/utils");
const { assignmentRouter } = require("./Assignments/assignmentRouter");
const { chatRouter } = require("./Chats/ChatRouter");
const conversationRouter = require("./Chats/ConversationRoutes");
const consultancyRouter = require("./Consultancy/consultancyRouter");
const consultancyCardRouter = require("./ConsultancyCard/consultancyCardRouter");
const courseEnrollmentRouter = require("./CourseEnrollment/courseEnrollmentRouter");
const { courseRouter } = require("./Courses/courseRouter");
const { earningsRouter } = require("./Earnings/earningsRouter");
const { paperRequestRouter } = require("./PaperRequest/paperRequestRouter");
const { profileRouter } = require("./Profiles/profileRouter");
const { teacherProfileRouter } = require("./TeacherProfile/teacherProfileRouter");
const { researchPaperRouter } = require("./ResearchPapers/researchPaperRouter");
const { studentRouter } = require("./Students/studentRouter");
const { subjectRouter } = require("./Subject/subjectRouter");
const { teacherRouter } = require("./Teachers/teacherRouter");
const { videoRouter } = require("./Videos/videoRouter");
const { labsRouter } = require("./Labs/labsRouter");
const {
  collaborationRequestRouter,
} = require("./Collaboration/collaborationRouter");
const { teacherCollaborationRouter } = require("./Collaboration/teacherCollaborationRouter");
const { teacherOnBoardingRouter } = require("./TeacherOnBording/teacherOnBoardingRoute");
const { webinarRouter } = require("./Webinars/webinarRouter");
const webinarEnrollmentRouter = require("./WebinarEnrollment/webinarEnrollmentRouter");
const { paymentRouter } = require("./Payment/paymentRouter");
const uploadRouter = require("./Upload/uploadRouter");
const { eventRouter } = require("./Events/eventRouter");
const { userRequestRouter } = require("./UserRequest/userRequestRouter");
const razorpayPayoutRouter = require("./RazorpayPayout/razorpayPayoutRouter");
const contactRouter = require("./Contact/contactRouter");

// Import admin authentication routes
const adminAuthRoutes = require("./Admin/routes/adminRoutes");

const adminRouter = require("express").Router();
const userRouter = require("express").Router();
const apiRouter = require("express").Router(); // New public API router

const withdrawalRouter = require("./Withdrawal/withdrawalRouter");

// PUBLIC API ROUTES (no authentication required for specific endpoints)
apiRouter.use("/teacherProfile", teacherProfileRouter);
apiRouter.use("/payment", paymentRouter);
apiRouter.use("/contact", contactRouter);
apiRouter.use("/collaboration", collaborationRequestRouter);

// ADMIN AUTHENTICATION ROUTES (mounted at /api/admin)
// These are handled separately from the main admin routes
// Login is public, other routes require admin authentication

// ADMIN ROUTES
adminRouter.use("/", adminAuthRoutes); // Mount admin auth routes at the root of admin router
adminRouter.use("/profile", profileRouter);
adminRouter.use("/teacher-profile", teacherProfileRouter);
adminRouter.use("/subject", subjectRouter);
adminRouter.use("/teacher", teacherRouter);
adminRouter.use("/course", verifyToken, courseRouter);
adminRouter.use("/video", verifyToken, videoRouter);
adminRouter.use("/researchPaper", researchPaperRouter);
adminRouter.use("/assignment", assignmentRouter);
adminRouter.use("/consultancyCard",verifyToken, consultancyCardRouter);
adminRouter.use("/consultancy", consultancyRouter);
adminRouter.use("/labs", labsRouter);
adminRouter.use("/teacheronboarding", teacherOnBoardingRouter);
adminRouter.use("/webinar",verifyToken, webinarRouter);
adminRouter.use("/courseEnrollment", courseEnrollmentRouter);
adminRouter.use("/student", studentRouter)
adminRouter.use("/withdraw", withdrawalRouter);
adminRouter.use("/upload", uploadRouter);
adminRouter.use("/events", verifyToken, eventRouter);
adminRouter.use("/teacher-collaboration", verifyToken, teacherCollaborationRouter);
adminRouter.use("/user-request", userRequestRouter);
adminRouter.use("/contact", contactRouter);
adminRouter.use("/earnings", earningsRouter);
adminRouter.use("/razorpay", razorpayPayoutRouter);
adminRouter.use("/collaboration", collaborationRequestRouter);
userRouter.use("/collaboration", collaborationRequestRouter);



// USER ROUTES
userRouter.use("/teacher-profile", teacherProfileRouter);
userRouter.use("/paperRequest", paperRequestRouter);
userRouter.use("/student", studentRouter);
userRouter.use("/course", courseRouter);
userRouter.use("/chats", chatRouter);
userRouter.use("/conversations", conversationRouter);
userRouter.use("/video", videoRouter);
userRouter.use("/teacher", teacherRouter);
userRouter.use("/consultancyCard", consultancyCardRouter);
userRouter.use("/consultancy", consultancyRouter);
userRouter.use("/courseEnrollment", verifyToken, courseEnrollmentRouter);
userRouter.use("/labs", labsRouter);
userRouter.use("/collaboration", collaborationRequestRouter);
userRouter.use("/teacheronboarding",teacherOnBoardingRouter);
userRouter.use("/webinarEnrollment",verifyToken, webinarEnrollmentRouter);
userRouter.use("/payment",paymentRouter)
userRouter.use("/user-request", userRequestRouter);
userRouter.use("/collaboration", collaborationRequestRouter);
userRouter.use("/earnings", earningsRouter);
userRouter.use("/razorpay", razorpayPayoutRouter);
apiRouter.use("/conversations", conversationRouter);



module.exports = { adminRouter, userRouter, apiRouter };