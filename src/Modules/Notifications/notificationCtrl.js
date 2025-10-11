const notificationService = require("./notificationService");
const asyncHandler = require("../../Utils/asyncHandler");
const successResponse = require("../../Utils/apiResponse");

const notificationCtrl = {
  /**
   * Get all notifications for the authenticated user
   * GET /user/notifications
   */
  getNotifications: asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.user?._id;
    
    const { page, limit, unreadOnly, type } = req.query;

    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      unreadOnly: unreadOnly === "true",
      type: type || null,
    };

    const result = await notificationService.getUserNotifications(
      userId,
      options
    );

    return successResponse({
      res: res,
      data: result,
      msg: "Notifications fetched successfully"
    });
  }),

  /**
   * Get unread notification count
   * GET /user/notifications/unread-count
   */
  getUnreadCount: asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.user?._id;

    const count = await notificationService.getUnreadCount(userId);

    return successResponse({
      res: res,
      data: { unreadCount: count },
      msg: "Unread count fetched"
    });
  }),

  /**
   * Mark a notification as read
   * PUT /user/notifications/:id/read
   */
  markAsRead: asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;

    const notification = await notificationService.markAsRead(id, userId);

    return successResponse({
      res: res,
      data: notification,
      msg: "Notification marked as read"
    });
  }),

  /**
   * Mark all notifications as read
   * PUT /user/notifications/mark-all-read
   */
  markAllAsRead: asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.user?._id;

    const result = await notificationService.markAllAsRead(userId);

    return successResponse({
      res: res,
      data: result,
      msg: "All notifications marked as read"
    });
  }),

  /**
   * Delete a notification
   * DELETE /user/notifications/:id
   */
  deleteNotification: asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;

    await notificationService.deleteNotification(id, userId);

    return successResponse({
      res: res,
      data: null,
      msg: "Notification deleted successfully"
    });
  }),

  /**
   * Delete all read notifications
   * DELETE /user/notifications/read
   */
  deleteAllRead: asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.user?._id;

    const result = await notificationService.deleteAllRead(userId);

    return successResponse({
      res: res,
      data: result,
      msg: "Read notifications deleted"
    });
  }),
};

module.exports = notificationCtrl;
