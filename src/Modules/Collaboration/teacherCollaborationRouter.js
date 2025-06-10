const { teacherCollaborationCtrl } = require("./teacherCollaborationCtrl");
const { verifyToken } = require("../../Utils/utils");

const teacherCollaborationRouter = require("express").Router();

// Create teacher collaboration
teacherCollaborationRouter.post("/create", verifyToken, teacherCollaborationCtrl.create);

// Get all teacher collaborations
teacherCollaborationRouter.post("/getAll", teacherCollaborationCtrl.getAll);

// Get teacher collaboration by ID
teacherCollaborationRouter.post("/getById", teacherCollaborationCtrl.getById);

// Update teacher collaboration
teacherCollaborationRouter.post("/update", verifyToken, teacherCollaborationCtrl.update);

// Delete teacher collaboration
teacherCollaborationRouter.post("/delete", verifyToken, teacherCollaborationCtrl.delete);

// Update collaboration status (toggle isActive)
teacherCollaborationRouter.post("/updateStatus", verifyToken, teacherCollaborationCtrl.updateStatus);

// Search teacher collaborations
teacherCollaborationRouter.post("/search", teacherCollaborationCtrl.search);

// Get collaborations by teacher ID
teacherCollaborationRouter.post("/teacher", teacherCollaborationCtrl.getByTeacherId);

// Get current teacher's collaborations
teacherCollaborationRouter.post("/my-collaborations", verifyToken, teacherCollaborationCtrl.getMyCollaborations);

// Get collaboration statistics
teacherCollaborationRouter.post("/statistics", teacherCollaborationCtrl.getStatistics);

// Get collaboration options (categories, durations, etc.)
//teacherCollaborationRouter.get("/options", teacherCollaborationCtrl.getOptions);

module.exports = { teacherCollaborationRouter }; 