const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'participants.userModel'
      },
      userModel: {
        type: String,
        required: true,
        enum: ["Student", "Profile"]
      },
      role: {
        type: String,
        enum: ["student", "teacher"],
        required: true
      }
    }],
    
    // Chat type to track the primary context (most recent)
    chatType: {
      type: String,
      enum: ["consultancy", "collaboration", "general"],
      default: "general"
    },
    
    // Track all contexts this conversation has been used for
    contexts: [{
      type: {
        type: String,
        enum: ["consultancy", "collaboration"],
        required: true
      },
      contextId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      title: {
        type: String,
        required: true
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Chat context for consultancy inquiries
    consultancyContext: {
      consultancyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ConsultancyCard',
        default: null
      },
      consultancyTitle: {
        type: String,
        default: null
      },
      isPrePurchase: {
        type: Boolean,
        default: true
      }
    },
    
    // Chat context for collaboration inquiries
    collaborationContext: {
      collaborationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Collaboration',
        default: null
      },
      collaborationTitle: {
        type: String,
        default: null
      },
      creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
      },
      creatorName: {
        type: String,
        default: null
      }
    },
    
    // Last message for quick access
    lastMessage: {
      content: String,
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'lastMessage.senderModel'
      },
      senderModel: {
        type: String,
        enum: ["Student", "Profile"]
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    },
    
    // Status tracking
    status: {
      type: String,
      enum: ["active", "archived", "blocked"],
      default: "active"
    },
    
    // Unread message counts for each participant
    unreadCount: {
      student: {
        type: Number,
        default: 0
      },
      teacher: {
        type: Number,
        default: 0
      }
    },
    
    isDelete: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
conversationSchema.index({ 'participants.user': 1 });
conversationSchema.index({ 'consultancyContext.consultancyId': 1 });
conversationSchema.index({ 'collaborationContext.collaborationId': 1 });
conversationSchema.index({ chatType: 1 });
conversationSchema.index({ 'contexts.contextId': 1 });
conversationSchema.index({ status: 1, isDelete: 1 });

// Method to get the other participant
conversationSchema.methods.getOtherParticipant = function(currentUserId) {
  return this.participants.find(p => !p.user.equals(currentUserId));
};

// Method to update last message
conversationSchema.methods.updateLastMessage = function(messageData) {
  this.lastMessage = {
    content: messageData.content,
    sender: messageData.sender,
    senderModel: messageData.senderModel,
    timestamp: new Date()
  };
  return this.save();
};

// Method to increment unread count
conversationSchema.methods.incrementUnreadCount = function(recipientRole) {
  if (recipientRole === 'student') {
    this.unreadCount.student += 1;
  } else if (recipientRole === 'teacher') {
    this.unreadCount.teacher += 1;
  }
  return this.save();
};

// Method to reset unread count
conversationSchema.methods.resetUnreadCount = function(userRole) {
  if (userRole === 'student') {
    this.unreadCount.student = 0;
  } else if (userRole === 'teacher') {
    this.unreadCount.teacher = 0;
  }
  return this.save();
};

const Conversation = mongoose.model("Conversation", conversationSchema);
module.exports = Conversation; 