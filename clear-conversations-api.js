require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Import the Conversation model
const Conversation = require('./src/Modules/Chats/ConversationModel');
const Chat = require('./src/Modules/Chats/ChatModel');

const app = express();
const PORT = process.env.CLEAR_PORT || 4007;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
async function connectDB() {
  try {
    const activeEnviroment = process.env.NODE_ENV || 'prod';
    const activeDbString = {
      local: process.env.MONGODB_LOCAL || 'mongodb://localhost:27017/researchdecode',
      test: process.env.MONGODB_TEST,
      prod: process.env.MONGODB_PROD,
    };

    const URI = activeDbString[activeEnviroment];
    
    if (!URI) {
      throw new Error('No database URI found. Please check your environment variables.');
    }
    
    await mongoose.connect(URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to database');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
}

// API endpoint to clear conversations
app.post('/api/clear-conversations', async (req, res) => {
  try {
    console.log('🗑️ Clearing conversations...');
    
    // Check current counts
    const initialConversationCount = await Conversation.countDocuments({});
    const initialChatCount = await Chat.countDocuments({});
    
    console.log(`📊 Current counts - Conversations: ${initialConversationCount}, Chats: ${initialChatCount}`);
    
    if (initialConversationCount === 0 && initialChatCount === 0) {
      return res.json({
        success: true,
        message: 'Database is already empty!',
        data: {
          conversationsDeleted: 0,
          chatsDeleted: 0,
          finalConversationCount: 0,
          finalChatCount: 0
        }
      });
    }
    
    // Delete all conversations
    const conversationResult = await Conversation.deleteMany({});
    console.log(`✅ Deleted ${conversationResult.deletedCount} conversations`);
    
    // Delete all chat messages
    const chatResult = await Chat.deleteMany({});
    console.log(`✅ Deleted ${chatResult.deletedCount} chat messages`);
    
    // Verify deletion
    const finalConversationCount = await Conversation.countDocuments({});
    const finalChatCount = await Chat.countDocuments({});
    
    console.log('🎉 Database cleared successfully!');
    
    res.json({
      success: true,
      message: 'Database cleared successfully!',
      data: {
        conversationsDeleted: conversationResult.deletedCount,
        chatsDeleted: chatResult.deletedCount,
        finalConversationCount,
        finalChatCount
      }
    });
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear database',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Clear conversations API is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Clear Conversations API',
    endpoints: {
      'POST /api/clear-conversations': 'Clear all conversations and chat messages',
      'GET /api/health': 'Health check'
    }
  });
});

// Start server
async function startServer() {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`🚀 Clear conversations API running on port ${PORT}`);
    console.log(`📝 Usage:`);
    console.log(`   - POST http://localhost:${PORT}/api/clear-conversations`);
    console.log(`   - GET  http://localhost:${PORT}/api/health`);
  });
}

startServer();
