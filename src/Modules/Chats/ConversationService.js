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
      collaborationId = null,
      collaborationTitle = null,
      creatorId = null,
      creatorName = null,
      chatType = "general",
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
      // Update or add context based on chat type
      if (chatType === "consultancy" && consultancyId) {
        existingConversation.consultancyContext.consultancyId = consultancyId;
        existingConversation.consultancyContext.consultancyTitle = consultancyTitle;
        existingConversation.consultancyContext.isPrePurchase = true;
        
        // Add to contexts array if not already present
        const contextExists = existingConversation.contexts.some(ctx => 
          ctx.type === 'consultancy' && ctx.contextId.toString() === consultancyId
        );
        
        if (!contextExists) {
          existingConversation.contexts.push({
            type: 'consultancy',
            contextId: new ObjectId(consultancyId),
            title: consultancyTitle,
            addedAt: new Date()
          });
        }
      } else if (chatType === "collaboration" && collaborationId) {
        existingConversation.collaborationContext.collaborationId = collaborationId;
        existingConversation.collaborationContext.collaborationTitle = collaborationTitle;
        existingConversation.collaborationContext.creatorId = creatorId;
        existingConversation.collaborationContext.creatorName = creatorName;
        
        // Add to contexts array if not already present
        const contextExists = existingConversation.contexts.some(ctx => 
          ctx.type === 'collaboration' && ctx.contextId.toString() === collaborationId
        );
        
        if (!contextExists) {
          existingConversation.contexts.push({
            type: 'collaboration',
            contextId: new ObjectId(collaborationId),
            title: collaborationTitle,
            addedAt: new Date()
          });
        }
        
        // Update participant userModel if creator is actually a student
        if (creatorId) {
          const secondParticipant = existingConversation.participants.find(p => 
            p.user.toString() === teacherId
          );
          
          if (secondParticipant) {
            try {
              // Check if creator exists in students collection
              const StudentModel = require('../Students/studentModel');
              const studentModel = new DatabaseService(StudentModel);
              const creatorAsStudent = await studentModel.getDocument({ _id: new ObjectId(creatorId) });
              
              if (creatorAsStudent && secondParticipant.userModel !== "Student") {
                secondParticipant.userModel = "Student";
                secondParticipant.role = "student";
                console.log('🔍 Updated existing conversation: Creator is a student');
              }
            } catch (error) {
              console.log('⚠️ Error updating existing conversation user type:', error.message);
            }
          }
        }
      }
      
      // Update chat type to reflect the most recent context
      existingConversation.chatType = chatType;
      
      await existingConversation.save();
      
      return {
        conversation: existingConversation,
        isNew: false,
        message: "Existing conversation found and updated with new context"
      };
    }

    // Determine the actual user type for the second participant
    let secondParticipantUserModel = "Profile";
    let secondParticipantRole = "teacher";
    
    // For collaboration, check if creator is actually a student
    console.log('🔍 Collaboration chat creation:', {
      chatType,
      creatorId,
      teacherId,
      isSameUser: creatorId === teacherId
    });
    
    if (chatType === "collaboration" && creatorId) {
      try {
        // Check if creator exists in students collection
        const StudentModel = require('../Students/studentModel');
        const studentModel = new DatabaseService(StudentModel);
        const creatorAsStudent = await studentModel.getDocument({ _id: new ObjectId(creatorId) });
        
        console.log('🔍 Checking creator in students collection:', {
          creatorId,
          creatorAsStudent: !!creatorAsStudent,
          studentDetails: creatorAsStudent ? {
            firstName: creatorAsStudent.firstName,
            lastName: creatorAsStudent.lastName,
            email: creatorAsStudent.email
          } : null
        });
        
        if (creatorAsStudent) {
          secondParticipantUserModel = "Student";
          secondParticipantRole = "student";
          console.log('✅ Creator is a student, setting userModel to Student');
        } else {
          // Check if creator exists in teachers collection
          const TeacherModel = require('../Teachers/teacherModel');
          const teacherModel = new DatabaseService(TeacherModel);
          const creatorAsTeacher = await teacherModel.getDocument({ _id: new ObjectId(creatorId) });
          
          console.log('🔍 Checking creator in teachers collection:', {
            creatorId,
            creatorAsTeacher: !!creatorAsTeacher,
            teacherDetails: creatorAsTeacher ? {
              firstName: creatorAsTeacher.firstName,
              lastName: creatorAsTeacher.lastName,
              email: creatorAsTeacher.email
            } : null
          });
          
          if (creatorAsTeacher) {
            secondParticipantUserModel = "Teacher";
            secondParticipantRole = "teacher";
            console.log('✅ Creator is a teacher, setting userModel to Teacher');
          } else {
            console.log('⚠️ Creator not found in students or teachers collection, using default Profile');
          }
        }
      } catch (error) {
        console.log('⚠️ Error checking user type, using default Profile:', error.message);
      }
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
          userModel: secondParticipantUserModel,
          role: secondParticipantRole
        }
      ],
      chatType: chatType,
      contexts: [],
      consultancyContext: {
        consultancyId: consultancyId ? new ObjectId(consultancyId) : null,
        consultancyTitle: consultancyTitle || null,
        isPrePurchase: true
      },
      collaborationContext: {
        collaborationId: collaborationId ? new ObjectId(collaborationId) : null,
        collaborationTitle: collaborationTitle || null,
        creatorId: creatorId ? new ObjectId(creatorId) : null,
        creatorName: creatorName || null
      },
      status: "active"
    };

    // Add initial context
    if (chatType === "consultancy" && consultancyId) {
      newConversation.contexts.push({
        type: 'consultancy',
        contextId: new ObjectId(consultancyId),
        title: consultancyTitle,
        addedAt: new Date()
      });
    } else if (chatType === "collaboration" && collaborationId) {
      newConversation.contexts.push({
        type: 'collaboration',
        contextId: new ObjectId(collaborationId),
        title: collaborationTitle,
        addedAt: new Date()
      });
    }

    const savedConversation = await model.save(newConversation);
    
    console.log('✅ New conversation created with participants:', {
      student: {
        id: studentId,
        userModel: "Student",
        role: "student"
      },
      secondParticipant: {
        id: teacherId,
        userModel: secondParticipantUserModel,
        role: secondParticipantRole
      },
      chatType: chatType,
      collaborationContext: {
        creatorId,
        creatorName
      }
    });
    
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
      
      // Check if teachers collection has data
      const teachersCount = await model.db.collection('teachers').countDocuments();
      console.log('🔍 Teachers collection count:', teachersCount);
      
      // Check if profiles collection has data
      const profilesCount = await model.db.collection('profiles').countDocuments();
      console.log('🔍 Profiles collection count:', profilesCount);
      
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
        $lookup: {
          from: 'teachers',
          localField: 'participants.user',
          foreignField: '_id',
          as: 'teacherDetails'
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
                $cond: {
                  if: { $gt: [{ $size: '$profileDetails' }, 0] },
                  then: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$profileDetails',
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
                          input: '$teacherDetails',
                          cond: { $eq: ['$$this._id', '$otherParticipant.user'] }
                        }
                      },
                      0
                    ]
                  }
                }
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          consultancyContext: 1,
          collaborationContext: 1,
          chatType: 1,
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
                if: { $ne: ['$otherParticipantDetails.firstName', null] },
                then: {
                  // Student format
                  firstName: '$otherParticipantDetails.firstName',
                  lastName: '$otherParticipantDetails.lastName',
                  email: '$otherParticipantDetails.email',
                  profilePicture: '$otherParticipantDetails.profilePicture',
                  name: {
                    $concat: [
                      { $ifNull: ['$otherParticipantDetails.firstName', ''] },
                      ' ',
                      { $ifNull: ['$otherParticipantDetails.lastName', ''] }
                    ]
                  }
                },
                else: {
                  // Teacher/Profile format
                  name: {
                    $cond: {
                      if: { $ne: ['$otherParticipantDetails.name', null] },
                      then: '$otherParticipantDetails.name',
                      else: {
                        $concat: [
                          { $ifNull: ['$otherParticipantDetails.firstName', ''] },
                          ' ',
                          { $ifNull: ['$otherParticipantDetails.lastName', ''] }
                        ]
                      }
                    }
                  },
                  email: '$otherParticipantDetails.email',
                  profileImage: '$otherParticipantDetails.profileImage',
                  specialisation: '$otherParticipantDetails.specialisation',
                  firstName: '$otherParticipantDetails.firstName',
                  lastName: '$otherParticipantDetails.lastName'
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
    
    // Enhanced debug logging
    console.log('🔍 Raw conversations from aggregation:', conversations);
    conversations.forEach((conv, index) => {
      console.log(`🔍 Conversation ${index + 1}:`, {
        id: conv._id,
        chatType: conv.chatType,
        hasOtherParticipant: !!conv.otherParticipant,
        otherParticipant: conv.otherParticipant,
        otherParticipantDetails: conv.otherParticipant?.details,
        teacherName: conv.otherParticipant?.details?.name,
        teacherEmail: conv.otherParticipant?.details?.email,
        userModel: conv.otherParticipant?.userModel,
        collaborationContext: conv.collaborationContext,
        consultancyContext: conv.consultancyContext,
        // Debug aggregation results
        studentDetailsCount: conv.studentDetails?.length || 0,
        teacherDetailsCount: conv.teacherDetails?.length || 0,
        profileDetailsCount: conv.profileDetails?.length || 0
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

    // Store original participant IDs before population
    const originalParticipants = conversation.participants.map(p => ({
      originalId: p.user,
      userModel: p.userModel,
      role: p.role,
      _id: p._id
    }));
    
    await conversation.populate([
      {
        path: 'participants.user',
        select: 'firstName lastName name email profilePicture profileImage specialisation'
      }
    ]);
    
    // Fix any failed populations by restoring original IDs
    conversation.participants.forEach((participant, index) => {
      if (!participant.user && originalParticipants[index]) {
        participant.user = originalParticipants[index].originalId;
        participant._isUnpopulated = true; // Flag to indicate this is just an ID
      }
    });

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
  }),

  /**
   * Get conversation context information
   */
  getConversationContext: serviceHandler(async (data) => {
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

    // Return context information
    return {
      chatType: conversation.chatType,
      contexts: conversation.contexts,
      consultancyContext: conversation.consultancyContext,
      collaborationContext: conversation.collaborationContext,
      currentContext: conversation.chatType === 'consultancy' ? conversation.consultancyContext : 
                     conversation.chatType === 'collaboration' ? conversation.collaborationContext : null
    };
  })
};

module.exports = { conversationService }; 