const DatabaseService = require("../../Service/DbService");
const serviceHandler = require("../../Utils/serviceHandler");
const Conversation = require("./ConversationModel");
const Types = require("mongoose").Types;
const { ObjectId } = Types;

const model = new DatabaseService(Conversation);

const conversationService = {
  
  /**
   * Initiate or get existing conversation between student and teacher
   * This is the main method for "Chat Before Purchase" functionality
   */
  initiateConversation: serviceHandler(async (data) => {
    const { 
      studentId, 
      teacherId, 
      consultancyId = null, 
      consultancyTitle = null,
      decodedUser 
    } = data;

    // Security check: Ensure the requesting user is the student
    if (decodedUser.id !== studentId) {
      throw new Error("Unauthorized: You can only initiate chats for yourself");
    }

    // Check if conversation already exists between these participants
    const existingConversation = await model.getDocument({
      $and: [
        { 'participants.user': new ObjectId(studentId) },
        { 'participants.user': new ObjectId(teacherId) },
        { isDelete: false }
      ]
    });

    if (existingConversation) {
      // Update consultancy context if provided and conversation is still pre-purchase
      if (consultancyId && existingConversation.consultancyContext.isPrePurchase) {
        existingConversation.consultancyContext.consultancyId = consultancyId;
        existingConversation.consultancyContext.consultancyTitle = consultancyTitle;
        await existingConversation.save();
      }
      
      return {
        conversation: existingConversation,
        isNew: false,
        message: "Existing conversation found"
      };
    }

    // Create new conversation
    const newConversation = {
      participants: [
        {
          user: new ObjectId(studentId),
          userModel: "Student",
          role: "student"
        },
        {
          user: new ObjectId(teacherId),
          userModel: "Profile",
          role: "teacher"
        }
      ],
      consultancyContext: {
        consultancyId: consultancyId ? new ObjectId(consultancyId) : null,
        consultancyTitle: consultancyTitle || null,
        isPrePurchase: true
      },
      status: "active"
    };

    const savedConversation = await model.save(newConversation);
    
    return {
      conversation: savedConversation,
      isNew: true,
      message: "New conversation created"
    };
  }),

  /**
   * Get all conversations for a user (enhanced inbox)
   */
  getUserConversations: serviceHandler(async (data) => {
    const { decodedUser } = data;
    const userId = decodedUser.id;

    console.log('🔍 Getting conversations for user:', userId);

    // Debug: Check available collections
    try {
      const collections = await model.db.listCollections().toArray();
      console.log('🔍 Available collections:', collections.map(c => c.name));
    } catch (error) {
      console.log('⚠️ Could not list collections:', error.message);
    }

    const pipeline = [
      {
        $match: {
          'participants.user': new ObjectId(userId),
          isDelete: false
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: 'participants.user',
          foreignField: '_id',
          as: 'studentDetails'
        }
      },
      {
        $lookup: {
          from: 'profiles',
          localField: 'participants.user',
          foreignField: '_id',
          as: 'profileDetails'
        }
      },
      {
        $addFields: {
          otherParticipant: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$participants',
                  cond: { $ne: ['$$this.user', new ObjectId(userId)] }
                }
              },
              0
            ]
          }
        }
      },
      {
        $addFields: {
          otherParticipantDetails: {
            $cond: {
              if: { $eq: ['$otherParticipant.userModel', 'Student'] },
              then: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: '$studentDetails',
                      cond: { $eq: ['$$this._id', '$otherParticipant.user'] }
                    }
                  },
                  0
                ]
              },
              else: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: '$profileDetails',
                      cond: { $eq: ['$$this._id', '$otherParticipant.user'] }
                    }
                  },
                  0
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          consultancyContext: 1,
          lastMessage: 1,
          status: 1,
          unreadCount: 1,
          createdAt: 1,
          updatedAt: 1,
          otherParticipant: {
            _id: '$otherParticipant.user',
            role: '$otherParticipant.role',
            userModel: '$otherParticipant.userModel',
            details: {
              $cond: {
                if: { $eq: ['$otherParticipant.userModel', 'Student'] },
                then: {
                  firstName: '$otherParticipantDetails.firstName',
                  lastName: '$otherParticipantDetails.lastName',
                  email: '$otherParticipantDetails.email',
                  profilePicture: '$otherParticipantDetails.profilePicture'
                },
                else: {
                  name: '$otherParticipantDetails.name',
                  email: '$otherParticipantDetails.email',
                  profileImage: '$otherParticipantDetails.profileImage',
                  specialisation: '$otherParticipantDetails.specialisation'
                }
              }
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.timestamp': -1, updatedAt: -1 }
      }
    ];

    const conversations = await model.aggregatePipeline(pipeline);
    
    // Debug logging
    console.log('🔍 Raw conversations from aggregation:', conversations);
    conversations.forEach((conv, index) => {
      console.log(`🔍 Conversation ${index + 1}:`, {
        id: conv._id,
        hasOtherParticipant: !!conv.otherParticipant,
        otherParticipant: conv.otherParticipant,
        otherParticipantDetails: conv.otherParticipant?.details,
        teacherName: conv.otherParticipant?.details?.name,
        teacherEmail: conv.otherParticipant?.details?.email,
        userModel: conv.otherParticipant?.userModel
      });
    });
    
    return conversations;
  }),

  /**
   * Get conversation by ID with participant details
   */
  getConversationById: serviceHandler(async (data) => {
    const { conversationId, decodedUser } = data;
    const userId = decodedUser.id;

    const conversation = await model.getDocument({
      _id: conversationId,
      'participants.user': new ObjectId(userId),
      isDelete: false
    });

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    // Populate participant details
    await conversation.populate([
      {
        path: 'participants.user',
        select: 'firstName lastName name email profilePicture profileImage specialisation'
      }
    ]);

    return conversation;
  }),

  /**
   * Update conversation status
   */
  updateConversationStatus: serviceHandler(async (data) => {
    const { conversationId, status, decodedUser } = data;
    const userId = decodedUser.id;

    const conversation = await model.getDocument({
      _id: conversationId,
      'participants.user': new ObjectId(userId),
      isDelete: false
    });

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    conversation.status = status;
    const updatedConversation = await conversation.save();
    
    return updatedConversation;
  }),

  /**
   * Mark conversation as read for current user
   */
  markAsRead: serviceHandler(async (data) => {
    const { conversationId, decodedUser } = data;
    const userId = decodedUser.id;

    const conversation = await model.getDocument({
      _id: conversationId,
      'participants.user': new ObjectId(userId),
      isDelete: false
    });

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    // Determine user role
    const userParticipant = conversation.participants.find(p => 
      p.user.toString() === userId
    );
    
    if (userParticipant) {
      await conversation.resetUnreadCount(userParticipant.role);
    }

    return { success: true, message: "Conversation marked as read" };
  }),

  /**
   * Archive conversation
   */
  archiveConversation: serviceHandler(async (data) => {
    const { conversationId, decodedUser } = data;
    
    return await conversationService.updateConversationStatus({
      conversationId,
      status: 'archived',
      decodedUser
    });
  }),

  /**
   * Delete conversation (soft delete)
   */
  deleteConversation: serviceHandler(async (data) => {
    const { conversationId, decodedUser } = data;
    const userId = decodedUser.id;

    const conversation = await model.getDocument({
      _id: conversationId,
      'participants.user': new ObjectId(userId),
      isDelete: false
    });

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    conversation.isDelete = true;
    const deletedConversation = await conversation.save();
    
    return deletedConversation;
  })
};

module.exports = { conversationService }; 