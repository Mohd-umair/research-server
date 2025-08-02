const DatabaseService = require("../../Service/DbService");
const serviceHandler = require("../../Utils/serviceHandler");
const Chats = require("./ChatModel");
const Conversation = require("./ConversationModel");
const Types = require("mongoose").Types;
const { ObjectId } = Types;
const model = new DatabaseService(Chats);
const conversationModel = new DatabaseService(Conversation);

const chatService = {
  /**
   * Enhanced createChats to support conversation threads
   */
  createChats: serviceHandler(async (data) => {
    const { conversationId, sender, recipient, message, messageType = 'text', attachment = null } = data;
    
    // Create the chat message
    const chatData = {
      conversationId: conversationId ? new ObjectId(conversationId) : null,
      sender: new ObjectId(sender),
      recipient: new ObjectId(recipient),
      content: message,
      messageType,
      attachment,
      senderModel: data.senderModel || 'Student',
      recipientModel: data.recipientModel || 'Profile'
    };
    
    const savedChat = await model.save(chatData);
    
    // Update conversation if conversationId is provided
    if (conversationId) {
      const conversation = await conversationModel.getDocumentById({ _id: conversationId });
      if (conversation) {
        // Update last message and unread counts
        await conversation.updateLastMessage(savedChat);
        
        // Increment unread count for recipient
        const recipientParticipant = conversation.participants.find(p => 
          p.user.toString() === recipient.toString()
        );
        if (recipientParticipant) {
          await conversation.incrementUnreadCount(recipientParticipant.role);
        }
      }
    }
    
    return savedChat;
  }),

  /**
   * Get messages for a specific conversation
   */
  getConversationMessages: serviceHandler(async (data) => {
    const { conversationId, page = 1, limit = 50, decodedUser } = data;
    
    // Verify user has access to this conversation
    const conversation = await conversationModel.getDocument({
      _id: conversationId,
      'participants.user': new ObjectId(decodedUser.id),
      isDelete: false
    });
    
    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }
    
    const skip = (page - 1) * limit;
    const query = {
      conversationId: new ObjectId(conversationId),
      isDelete: false
    };
    
    const messages = await model.getAllDocuments(query, {
      sort: { createdAt: -1 },
      skip,
      limit,
      populate: [
        { path: 'sender', select: 'firstName lastName name email profilePicture profileImage' },
        { path: 'recipient', select: 'firstName lastName name email profilePicture profileImage' }
      ]
    });
    
    const totalCount = await model.totalCounts(query);
    
    return {
      messages: messages.reverse(), // Reverse to show oldest first
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    };
  }),

  /**
   * Mark messages as seen in a conversation
   */
  markMessagesAsSeen: serviceHandler(async (data) => {
    const { conversationId, userId } = data;
    
    // Update all unseen messages from other participants
    const updateResult = await Chats.updateMany(
      {
        conversationId: new ObjectId(conversationId),
        recipient: new ObjectId(userId),
        isSeen: false,
        isDelete: false
      },
      { isSeen: true }
    );
    
    return updateResult;
  }),

  // Keep existing methods for backward compatibility
  getInbox: serviceHandler(async (data) => {
    const { decodedUser } = data ?? {};
    const loggedInUserId = decodedUser.id

    const returnObjectId = (id) => {
      return new ObjectId(id)
    }

    const newPipeline = [
      {
        $match: {
          $or: [
            { sender: returnObjectId(loggedInUserId) },
            { recipient: returnObjectId(loggedInUserId) },
          ],
        },
      },
      {
        $addFields: {
          otherUser: {
            $cond: {
              if: { $eq: ["$sender", returnObjectId(loggedInUserId)] },
              then: "$recipient",
              else: "$sender",
            },
          },
          otherUserModel: {
            $cond: {
              if: { $eq: ["$sender", returnObjectId(loggedInUserId)] },
              then: "$recipientModel",
              else: "$senderModel",
            },
          },
        },
      },
      {
        $group: {
          _id: "$otherUser",
          model: { $first: "$otherUserModel" },
        },
      },
      {
        $lookup: {
          from: "chats", // Adjust to your messages collection name if different
          let: { otherUserId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    {
                      $and: [
                        { $eq: ["$sender", "$$otherUserId"] },
                        { $eq: ["$recipient", returnObjectId(loggedInUserId)] },
                      ],
                    },
                    {
                      $and: [
                        { $eq: ["$recipient", "$$otherUserId"] },
                        { $eq: ["$sender", returnObjectId(loggedInUserId)] },
                      ],
                    },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: "lastMessage",
        },
      },
      {
        $addFields: {
          lastMessage: { $arrayElemAt: ["$lastMessage", 0] },
        },
      },
      {
        $lookup: {
          from: "students", // Replace with your actual Student collection name
          localField: "_id",
          foreignField: "_id",
          as: "studentDetails",
        },
      },
      {
        $lookup: {
          from: "profiles", // Replace with your actual Profile collection name
          localField: "_id",
          foreignField: "_id",
          as: "profileDetails",
        },
      },
      {
        $project: {
          model: 1,
          lastMessage: 1,
          details: {
            $cond: {
              if: { $eq: ["$model", "Student"] },
              then: {
                _id: "$_id",
                firstName: { $arrayElemAt: ["$studentDetails.firstName", 0] },
                lastName: { $arrayElemAt: ["$studentDetails.lastName", 0] },
                role: "USER",
              },
              else: {
                _id: "$_id",
                name: { $arrayElemAt: ["$profileDetails.name", 0] },
                role: { $arrayElemAt: ["$profileDetails.role", 0] },
              },
            },
          },
        },
      },
      {
        $sort: { "details.name": 1 },
      },
    ];

    const inbox = await model.aggregatePipeline(newPipeline);

    return inbox;
  }),

  getAll: serviceHandler(async (data) => {
    const query = {};
    data.populate = [{ path: "sender" }, { path: "recipient" }];
    const savedData = await model.getAllDocuments(query, data);
    const totalCount = await model.totalCounts({ isDelete: false });
    return { savedData, totalCount };
  }),

  getChatOfTwoUsers: serviceHandler(async (data) => {
    const { recepientId, createdBy } = data;
    const query = {
      $or: [
        { sender: createdBy, recipient: recepientId },
        { sender: recepientId, recipient: createdBy },
      ],
    };

    const chats = await model.getAllDocuments(query);
    return chats;
  }),

  getById: serviceHandler(async (data) => {
    const { chatId } = data;
    const query = { isDelete: false, _id: chatId };
    const savedDataById = await model.getDocumentById(query);
    return savedDataById;
  }),

  update: serviceHandler(async (updateData) => {
    const { chatId } = updateData;
    const filter = { _id: chatId };
    const updatePayload = { ...updateData };
    const updatedDoc = await model.updateDocument(filter, updatePayload);
    return updatedDoc;
  }),

  delete: serviceHandler(async (deleteId) => {
    const { chatId } = deleteId;
    const deletedDoc = await model.updateDocument(
      { _id: chatId },
      { isDelete: true }
    );
    return deletedDoc;
  }),
};

module.exports = { chatService };
