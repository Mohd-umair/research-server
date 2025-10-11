const express = require("express");
const notificationCtrl = require("./notificationCtrl");
const { verifyToken } = require("../../Utils/utils");

const notificationRouter = express.Router();

// All routes require authentication
notificationRouter.use(verifyToken);

// Get all notifications for the authenticated user
notificationRouter.get("/", notificationCtrl.getNotifications);

// Get unread notification count
notificationRouter.get("/unread-count", notificationCtrl.getUnreadCount);

// Mark all notifications as read
notificationRouter.put("/mark-all-read", notificationCtrl.markAllAsRead);

// Mark a specific notification as read
notificationRouter.put("/:id/read", notificationCtrl.markAsRead);

// Delete all read notifications
notificationRouter.delete("/read", notificationCtrl.deleteAllRead);

// Delete a specific notification
notificationRouter.delete("/:id", notificationCtrl.deleteNotification);

module.exports = notificationRouter;

