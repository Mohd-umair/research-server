require("dotenv").config();
const mongoose = require("mongoose");

// Import the Conversation model
const Conversation = require('./src/Modules/Chats/ConversationModel');
const Chat = require('./src/Modules/Chats/ChatModel');

async function clearAllConversations() {
  try {
    console.log('🔍 Connecting to database...');
    
    // Use the same connection logic as server.js
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
    
    console.log(`🌍 Environment: ${activeEnviroment}`);
    console.log(`🔗 Database URI: ${URI}`);
    
    // Connect to MongoDB
    await mongoose.connect(URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to database');
    
    // Check current counts
    const initialConversationCount = await Conversation.countDocuments({});
    const initialChatCount = await Chat.countDocuments({});
    
    console.log(`📊 Current counts:`);
    console.log(`   - Conversations: ${initialConversationCount}`);
    console.log(`   - Chat messages: ${initialChatCount}`);
    
    if (initialConversationCount === 0 && initialChatCount === 0) {
      console.log('ℹ️ Database is already empty!');
      return;
    }
    
    // Delete all conversations
    console.log('🗑️ Deleting all conversations...');
    const conversationResult = await Conversation.deleteMany({});
    console.log(`✅ Deleted ${conversationResult.deletedCount} conversations`);
    
    // Delete all chat messages
    console.log('🗑️ Deleting all chat messages...');
    const chatResult = await Chat.deleteMany({});
    console.log(`✅ Deleted ${chatResult.deletedCount} chat messages`);
    
    // Verify deletion
    const finalConversationCount = await Conversation.countDocuments({});
    const finalChatCount = await Chat.countDocuments({});
    
    console.log('🎉 Database cleared successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Conversations deleted: ${conversationResult.deletedCount}`);
    console.log(`   - Chat messages deleted: ${chatResult.deletedCount}`);
    console.log(`   - Final counts - Conversations: ${finalConversationCount}, Chats: ${finalChatCount}`);
    
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    console.error('Full error:', error);
  } finally {
    // Close the connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
    process.exit(0);
  }
}

// Run the script
clearAllConversations();
