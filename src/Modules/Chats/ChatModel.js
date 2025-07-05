const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    // Reference to conversation thread
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true
    },
    
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "senderModel",
    },
    senderModel: {
      type: String,
      required: true,
      enum: ["Student", "Profile"],
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "recipientModel",
    },
    recipientModel: {
      type: String,
      required: true,
      enum: ["Student", "Profile"],
    },
    content: {
      type: String,
      required: true,
    },
    
    // Message type for future enhancements
    messageType: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text"
    },
    
    // File attachment support
    attachment: {
      url: String,
      filename: String,
      fileType: String,
      fileSize: Number
    },
    
    isSeen: {
      type: Boolean,
      default: false
    },
    
    // Soft delete for individual messages
    isDelete: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
chatSchema.index({ conversationId: 1, createdAt: -1 });
chatSchema.index({ sender: 1, recipient: 1 });
chatSchema.index({ isSeen: 1 });

const Chat = mongoose.model("Chat", chatSchema);
module.exports = Chat;
