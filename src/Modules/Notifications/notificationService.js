const Notification = require("./notificationModel");
const CustomError = require("../../Errors/CustomError");
const serviceHandler = require("../../Utils/serviceHandler");

const notificationService = {
  /**
   * Create a new notification
   */
  createNotification: serviceHandler(async (data) => {
    const {
      recipient,
      recipientModel = "Teacher",
      type,
      title,
      message,
      relatedEntity,
      triggeredBy,
      priority = "medium",
      actionUrl,
      metadata = {},
    } = data;

    if (!recipient || !type || !title || !message) {
      throw new CustomError(400, "Missing required notification fields");
    }

    const notification = new Notification({
      recipient,
      recipientModel,
      type,
      title,
      message,
      relatedEntity,
      triggeredBy,
      priority,
      actionUrl,
      metadata,
    });

    await notification.save();
    return notification;
  }),

  /**
   * Create notification for document upload to a request
   */
  createDocumentUploadNotification: serviceHandler(async (data) => {
    const { requestOwnerId, uploaderName, documentTitle, userRequestId } = data;

    const notification = await notificationService.createNotification({
      recipient: requestOwnerId,
      recipientModel: "Teacher", // Assuming students are stored in Teacher model
      type: "DOCUMENT_UPLOADED",
      title: "Someone is trying to fulfill your request! 📄",
      message: `${uploaderName} has uploaded a document to fulfill your request${documentTitle ? `: "${documentTitle}"` : ""}. Please review and approve or reject the document.`,
      relatedEntity: {
        entityType: "UserRequest",
        entityId: userRequestId,
      },
      priority: "high",
      actionUrl: `/user-dashboard/request`,
      metadata: {
        uploaderName,
        documentTitle,
        userRequestId,
        requiresApproval: true,
      },
    });

    return notification;
  }),

  /**
   * Create notification for fulfillment approval
   */
  createFulfillmentApprovedNotification: serviceHandler(async (data) => {
    const { fulfillerId, requesterName, requestTitle, userRequestId } = data;

    const notification = await notificationService.createNotification({
      recipient: fulfillerId,
      recipientModel: "Teacher",
      type: "FULFILLMENT_APPROVED",
      title: "Your document was approved! 🎉",
      message: `${requesterName} has approved the document you uploaded for their request${requestTitle ? `: "${requestTitle}"` : ""}. You have earned coins for helping!`,
      relatedEntity: {
        entityType: "UserRequest",
        entityId: userRequestId,
      },
      priority: "high",
      actionUrl: `/user-dashboard/request`,
      metadata: {
        requesterName,
        requestTitle,
        userRequestId,
        approved: true,
      },
    });

    return notification;
  }),

  /**
   * Create notification for fulfillment rejection
   */
  createFulfillmentRejectedNotification: serviceHandler(async (data) => {
    const { fulfillerId, requesterName, requestTitle, userRequestId } = data;

    const notification = await notificationService.createNotification({
      recipient: fulfillerId,
      recipientModel: "Teacher",
      type: "FULFILLMENT_REJECTED",
      title: "Document feedback received",
      message: `${requesterName} has reviewed the document you uploaded for their request${requestTitle ? `: "${requestTitle}"` : ""}. The document did not meet their requirements.`,
      relatedEntity: {
        entityType: "UserRequest",
        entityId: userRequestId,
      },
      priority: "medium",
      actionUrl: `/user-dashboard/request`,
      metadata: {
        requesterName,
        requestTitle,
        userRequestId,
        approved: false,
      },
    });

    return notification;
  }),

  /**
   * Get all notifications for a user
   */
  getUserNotifications: serviceHandler(async (userId, options = {}) => {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      type = null,
    } = options;

    const query = {
      recipient: userId,
      isDeleted: false,
    };

    if (unreadOnly) {
      query.isRead = false;
    }

    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("triggeredBy", "firstName lastName email profilePicture")
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: userId, isRead: false, isDeleted: false }),
    ]);

    return {
      notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit,
      },
      unreadCount,
    };
  }),

  /**
   * Get unread notification count
   */
  getUnreadCount: serviceHandler(async (userId) => {
    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
      isDeleted: false,
    });

    return count;
  }),

  /**
   * Mark notification as read
   */
  markAsRead: serviceHandler(async (notificationId, userId) => {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipient: userId,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );

    if (!notification) {
      throw new CustomError(404, "Notification not found");
    }

    return notification;
  }),

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead: serviceHandler(async (userId) => {
    const result = await Notification.updateMany(
      {
        recipient: userId,
        isRead: false,
        isDeleted: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    return {
      modifiedCount: result.modifiedCount,
      message: `${result.modifiedCount} notifications marked as read`,
    };
  }),

  /**
   * Delete a notification (soft delete)
   */
  deleteNotification: serviceHandler(async (notificationId, userId) => {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipient: userId,
      },
      {
        isDeleted: true,
      },
      { new: true }
    );

    if (!notification) {
      throw new CustomError(404, "Notification not found");
    }

    return notification;
  }),

  /**
   * Delete all read notifications for a user
   */
  deleteAllRead: serviceHandler(async (userId) => {
    const result = await Notification.updateMany(
      {
        recipient: userId,
        isRead: true,
        isDeleted: false,
      },
      {
        isDeleted: true,
      }
    );

    return {
      modifiedCount: result.modifiedCount,
      message: `${result.modifiedCount} notifications deleted`,
    };
  }),

  /**
   * Clean up old notifications (can be run as a cron job)
   * Deletes notifications older than 30 days
   */
  cleanupOldNotifications: serviceHandler(async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Notification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo },
      isRead: true,
    });

    return {
      deletedCount: result.deletedCount,
      message: `${result.deletedCount} old notifications permanently deleted`,
    };
  }),
};

module.exports = notificationService;
