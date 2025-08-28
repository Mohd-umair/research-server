const mongoose = require('mongoose');

const coinSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel',
    required: true
  },
  userModel: {
    type: String,
    required: true,
    enum: ['Student', 'Profile'] // Student or Expert (Profile)
  },
  coins: {
    type: Number,
    default: 100, // Default 100 coins for new users
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to ensure one coin record per user
coinSchema.index({ user: 1, userModel: 1 }, { unique: true });

// Virtual for user type
coinSchema.virtual('userType').get(function() {
  return this.userModel === 'Student' ? 'student' : 'expert';
});

// Method to deduct coins
coinSchema.methods.deductCoins = function(amount) {
  if (this.coins >= amount) {
    this.coins -= amount;
    this.lastUpdated = new Date();
    return true;
  }
  return false;
};

// Method to add coins
coinSchema.methods.addCoins = function(amount) {
  this.coins += amount;
  this.lastUpdated = new Date();
  return this.coins;
};

// Method to check if user has enough coins
coinSchema.methods.hasEnoughCoins = function(amount) {
  return this.coins >= amount;
};

const CoinModel = mongoose.model('Coin', coinSchema);

module.exports = CoinModel;
