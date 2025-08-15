const express = require("express");
const { verifyToken } = require("../../Utils/utils");
const contactCtrl = require("./contactCtrl");

const contactRouter = express.Router();

// Public routes (no authentication required)
contactRouter.post("/submit", contactCtrl.submitContact);

// Protected routes (require authentication)
contactRouter.use(verifyToken); // Apply authentication middleware to all routes below

// Admin routes
contactRouter.get("/", contactCtrl.getAllContacts);
contactRouter.get("/stats", contactCtrl.getContactStats);
contactRouter.get("/recent", contactCtrl.getRecentContacts);
contactRouter.get("/:id", contactCtrl.getContactById);
contactRouter.put("/:id", contactCtrl.updateContact);
contactRouter.delete("/:id", contactCtrl.deleteContact);

module.exports = contactRouter;
