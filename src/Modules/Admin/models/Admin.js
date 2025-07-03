const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  role: {
    type: String,
    enum: {
      values: ['SuperAdmin', 'Moderator', 'Viewer'],
      message: 'Role must be either SuperAdmin, Moderator, or Viewer'
    },
    required: [true, 'Role is required'],
    default: 'Viewer'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: {
    type: [String],
    default: function() {
      // Set default permissions based on role
      switch(this.role) {
        case 'SuperAdmin':
          return ['*']; // All permissions
        case 'Moderator':
          return ['read', 'create', 'update'];
        case 'Viewer':
          return ['read'];
        default:
          return ['read'];
      }
    }
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  resetPasswordToken: {
    type: String,
    default: null,
    select: false // Don't include in queries by default
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
    select: false // Don't include in queries by default
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      delete ret.__v;
      return ret;
    }
  }
});

// Virtual for checking if account is locked
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Indexes for performance
adminSchema.index({ email: 1 });
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
adminSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to set permissions based on role
adminSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    switch(this.role) {
      case 'SuperAdmin':
        this.permissions = ['*'];
        break;
      case 'Moderator':
        this.permissions = ['read', 'create', 'update', 'moderate'];
        break;
      case 'Viewer':
        this.permissions = ['read'];
        break;
      default:
        this.permissions = ['read'];
    }
  }
  next();
});

// Instance method to compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to increment login attempts
adminSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        lockUntil: 1
      },
      $set: {
        loginAttempts: 1
      }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // If we're at max attempts and not locked yet, lock the account
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
adminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    }
  });
};

// Instance method to update last login
adminSchema.methods.updateLastLogin = function() {
  return this.updateOne({ $set: { lastLogin: new Date() } });
};

// Instance method to check permissions
adminSchema.methods.hasPermission = function(permission) {
  if (this.permissions.includes('*')) return true;
  return this.permissions.includes(permission);
};

// Static method to find active admins
adminSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Static method to find by role
adminSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method for safe admin creation
adminSchema.statics.createAdmin = async function(adminData, createdBy = null) {
  const admin = new this({
    ...adminData,
    createdBy
  });
  
  return await admin.save();
};

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin; 