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
   * Create notification for teacher approval
   */
  createTeacherApprovalNotification: serviceHandler(async (data) => {
    console.log(`[DEBUG] createTeacherApprovalNotification called with data:`, data);
    const { teacherId, teacherName, adminId } = data;

    console.log(`[DEBUG] Creating notification for teacher: ${teacherName} (ID: ${teacherId})`);
    
    const notification = await notificationService.createNotification({
      recipient: teacherId,
      recipientModel: "Teacher",
      type: "TEACHER_APPROVED",
      title: "Account Approved! 🎉",
      message: "Welcome aboard! Your eSupervisor account has been approved. You can now start creating project cards and offering your expertise.",
      triggeredBy: adminId,
      priority: "high",
      actionUrl: `/user-dashboard`,
      metadata: {
        teacherName,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });

    console.log(`[DEBUG] Notification created successfully: ${notification._id}`);
    return notification;
  }),

  /**
   * Create notification for teacher rejection
   */
  createTeacherRejectionNotification: serviceHandler(async (data) => {
    console.log(`[DEBUG] createTeacherRejectionNotification called with data:`, data);
    const { teacherId, teacherName, adminId, rejectionReasons } = data;

    console.log(`[DEBUG] Creating rejection notification for teacher: ${teacherName} (ID: ${teacherId})`);
    
    // Create a user-friendly rejection message
    const reasonsText = rejectionReasons && rejectionReasons.length > 0 
      ? ` Reasons: ${rejectionReasons.join(', ')}.` 
      : '';
    
    const notification = await notificationService.createNotification({
      recipient: teacherId,
      recipientModel: "Teacher",
      type: "TEACHER_REJECTED",
      title: "Application Update",
      message: `Your eSupervisor account wasn't approved. You can reapply after updating your profile.${reasonsText}`,
      triggeredBy: adminId,
      priority: "high",
      actionUrl: `/user-dashboard`,
      metadata: {
        teacherName,
        rejectedBy: adminId,
        rejectedAt: new Date(),
        rejectionReasons: rejectionReasons || [],
      },
    });

    console.log(`[DEBUG] Rejection notification created successfully: ${notification._id}`);
    return notification;
  }),

  /**
   * Create notification for consultancy approval
   */
  createConsultancyApprovalNotification: serviceHandler(async (data) => {
    console.log(`[DEBUG] createConsultancyApprovalNotification called with data:`, data);
    const { teacherId, teacherName, adminId, consultancyTitle } = data;

    console.log(`[DEBUG] Creating consultancy approval notification for teacher: ${teacherName} (ID: ${teacherId})`);
    
    const notification = await notificationService.createNotification({
      recipient: teacherId,
      recipientModel: "Teacher",
      type: "CONSULTANCY_APPROVED",
      title: "Consultancy Card Approved! 🎉",
      message: "Your consultancy card is live! Clients can now discover and book your services.",
      triggeredBy: adminId,
      priority: "high",
      actionUrl: `/dashboard/consultancy`,
      metadata: {
        teacherName,
        consultancyTitle: consultancyTitle || 'Consultancy Card',
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });

    console.log(`[DEBUG] Consultancy approval notification created successfully: ${notification._id}`);
    return notification;
  }),

  /**
   * Create notification for consultancy completion
   */
  createConsultancyCompletionNotification: serviceHandler(async (data) => {
    const { teacherId, teacherName, studentId, studentName, consultancyTitle } = data;
    
    const notification = await notificationService.createNotification({
      recipient: teacherId,
      recipientModel: "Teacher",
      type: "CONSULTANCY_COMPLETED",
      title: "Project marked as completed by the student.",
      message: `${studentName} has marked their consultancy project${consultancyTitle ? ` "${consultancyTitle}"` : ''} as completed. You can now review the work and request payment.`,
      triggeredBy: studentId,
      priority: "high",
      actionUrl: `/dashboard/expert-bookings`,
      metadata: {
        teacherName,
        studentName,
        studentId,
        consultancyTitle: consultancyTitle || 'Consultancy Session',
        completedAt: new Date(),
      },
    });

    return notification;
  }),

  /**
   * Create notification for new consultancy booking
   */
  createConsultancyBookingNotification: serviceHandler(async (data) => {
    const { teacherId, teacherName, studentId, studentName, consultancyTitle } = data;
    
    const notification = await notificationService.createNotification({
      recipient: teacherId,
      recipientModel: "Teacher",
      type: "CONSULTANCY_BOOKED",
      title: "You've got a new booking request! 🎉",
      message: `${studentName} has booked your consultancy${consultancyTitle ? ` "${consultancyTitle}"` : ''}. Check your bookings to accept or manage this request.`,
      triggeredBy: studentId,
      priority: "high",
      actionUrl: `/dashboard/expert-bookings`,
      metadata: {
        teacherName,
        studentName,
        studentId,
        consultancyTitle: consultancyTitle || 'Consultancy Session',
        bookedAt: new Date(),
      },
    });

    return notification;
  }),

  /**
   * Create notification for new message received
   */
  createMessageReceivedNotification: serviceHandler(async (data) => {
    const { recipientId, recipientType, senderName, senderId, messagePreview, conversationId } = data;
    
    const notification = await notificationService.createNotification({
      recipient: recipientId,
      recipientModel: recipientType === 'teacher' ? "Teacher" : "Student",
      type: "MESSAGE_RECEIVED",
      title: "You've received a new message",
      message: `${senderName} sent you a message${messagePreview ? `: "${messagePreview}"` : '.'}`,
      triggeredBy: senderId,
      priority: "medium",
      actionUrl: `/dashboard/chat?conversation=${conversationId}`,
      metadata: {
        senderName,
        senderId,
        conversationId,
        messagePreview: messagePreview || '',
        receivedAt: new Date(),
      },
    });

    return notification;
  }),

  /**
   * Create notification for new collaboration created
   */
  createCollaborationCreatedNotification: serviceHandler(async (data) => {
    const { collaborationId, collaborationTitle, creatorName, creatorId } = data;
    
    // Get all active students and teachers to notify
    const StudentModel = require("../Students/studentModel");
    const TeacherModel = require("../Teachers/teacherModel");
    
    const [students, teachers] = await Promise.all([
      StudentModel.find({ isDelete: false, isActive: true }).select('_id'),
      TeacherModel.find({ isDelete: false, isActive: true }).select('_id')
    ]);
    
    const notifications = [];
    
    // Create notifications for all students
    for (const student of students) {
      // Don't notify the creator if they're a student
      if (student._id.toString() === creatorId) continue;
      
      const notification = await notificationService.createNotification({
        recipient: student._id,
        recipientModel: "Student",
        type: "COLLABORATION_CREATED",
        title: "New Collaboration Available",
        message: `Someone is looking for collaborators on project "${collaborationTitle}".`,
        triggeredBy: creatorId,
        priority: "medium",
        actionUrl: `/dashboard/collaborations/${collaborationId}`,
        relatedEntity: {
          entityType: "Collaboration",
          entityId: collaborationId
        },
        metadata: {
          collaborationTitle,
          creatorName,
          creatorId,
          createdAt: new Date(),
        },
      });
      
      notifications.push(notification);
    }
    
    // Create notifications for all teachers
    for (const teacher of teachers) {
      // Don't notify the creator if they're a teacher
      if (teacher._id.toString() === creatorId) continue;
      
      const notification = await notificationService.createNotification({
        recipient: teacher._id,
        recipientModel: "Teacher",
        type: "COLLABORATION_CREATED",
        title: "New Collaboration Available",
        message: `Someone is looking for collaborators on project "${collaborationTitle}".`,
        triggeredBy: creatorId,
        priority: "medium",
        actionUrl: `/dashboard/collaborations/${collaborationId}`,
        relatedEntity: {
          entityType: "Collaboration",
          entityId: collaborationId
        },
        metadata: {
          collaborationTitle,
          creatorName,
          creatorId,
          createdAt: new Date(),
        },
      });
      
      notifications.push(notification);
    }

    return notifications;
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
