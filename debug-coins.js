const mongoose = require('mongoose');
require('dotenv').config();

const URI = process.env.MONGODB_PROD;

mongoose.connect(URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('🔍 Debugging Coin Award Issue:\n');
    
    // Check recent user requests that were marked as fulfilled
    const UserRequests = mongoose.connection.collection('userrequests');
    const fulfilledRequests = await UserRequests.find({ 
      isFulfilled: true 
    }).sort({ updatedAt: -1 }).limit(3).toArray();
    
    console.log('📋 Recent Fulfilled Requests:');
    if (fulfilledRequests.length > 0) {
      for (let i = 0; i < fulfilledRequests.length; i++) {
        const req = fulfilledRequests[i];
        console.log(`\n${i + 1}. Request ID: ${req._id}`);
        console.log(`   Title: ${req.title || req.documentDetails?.title || 'N/A'}`);
        console.log(`   Status: ${req.status}`);
        console.log(`   isFulfilled: ${req.isFulfilled}`);
        console.log(`   Updated: ${new Date(req.updatedAt).toLocaleString()}`);
        
        // Check corresponding PaperRequest
        const PaperRequests = mongoose.connection.collection('paperrequests');
        const paperReq = await PaperRequests.findOne({ requestBy: req._id });
        
        if (paperReq) {
          console.log(`   📄 Document uploader: ${paperReq.fulfilledBy}`);
          console.log(`   📄 Paper status: ${paperReq.requestStatus}`);
        } else {
          console.log(`   ❌ No PaperRequest found for this request`);
        }
      }
    } else {
      console.log('   No fulfilled requests found.');
    }
    
    // Check recent coin transactions
    const Coins = mongoose.connection.collection('coins');
    const recentCoins = await Coins.find({}).sort({ createdAt: -1 }).limit(5).toArray();
    
    console.log('\n\n💰 Recent Coin Transactions (All Sources):');
    if (recentCoins.length > 0) {
      recentCoins.forEach((coin, idx) => {
        console.log(`\n${idx + 1}. User: ${coin.userId}`);
        console.log(`   Amount: +${coin.amount} coins`);
        console.log(`   Source: ${coin.source}`);
        console.log(`   Description: ${coin.description}`);
        console.log(`   Date: ${new Date(coin.createdAt).toLocaleString()}`);
      });
    } else {
      console.log('   No coin transactions found.');
    }
    
    // Check specifically for request_fulfillment coins
    const fulfillmentCoins = await Coins.find({ 
      source: 'request_fulfillment' 
    }).sort({ createdAt: -1 }).limit(3).toArray();
    
    console.log('\n\n🎯 Request Fulfillment Coins:');
    if (fulfillmentCoins.length > 0) {
      fulfillmentCoins.forEach((coin, idx) => {
        console.log(`\n${idx + 1}. User: ${coin.userId}`);
        console.log(`   Amount: +${coin.amount} coins`);
        console.log(`   Description: ${coin.description}`);
        console.log(`   Date: ${new Date(coin.createdAt).toLocaleString()}`);
      });
    } else {
      console.log('   ❌ NO request_fulfillment coins found!');
      console.log('   This means the coin awarding code is not executing.');
    }
    
    mongoose.connection.close();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
