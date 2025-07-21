const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

/**
 * Create initial SuperAdmin if none exists
 * This function should be called during application startup
 */
const createInitialSuperAdmin = async () => {
  try {
    // Check if any SuperAdmin exists
    const existingSuperAdmin = await Admin.findOne({ role: 'SuperAdmin', isActive: true });
    
    if (existingSuperAdmin) {
      console.log('✅ SuperAdmin already exists:', existingSuperAdmin.email);
      return existingSuperAdmin;
    }

    // Create default SuperAdmin
    const defaultSuperAdmin = {
      email: process.env.INITIAL_SUPER_ADMIN_EMAIL || 'superadmin@research.com',
      password: process.env.INITIAL_SUPER_ADMIN_PASSWORD || 'SuperAdmin123!',
      fullName: process.env.INITIAL_SUPER_ADMIN_NAME || 'System Administrator',
      role: 'SuperAdmin',
      isActive: true
    };

    const newSuperAdmin = await Admin.createAdmin(defaultSuperAdmin);
    
    console.log('🚀 Initial SuperAdmin created successfully!');
    console.log('📧 Email:', newSuperAdmin.email);
    console.log('🔑 Password:', defaultSuperAdmin.password);
    console.log('⚠️  Please change the default password after first login!');
    
    return newSuperAdmin;
  } catch (error) {
    console.error('❌ Error creating initial SuperAdmin:', error);
    throw error;
  }
};

/**
 * Seed multiple admin accounts for development/testing
 * @param {Array} adminData - Array of admin objects to create
 */
const seedAdminAccounts = async (adminData = []) => {
  try {
    const defaultAdmins = [
      {
        email: 'moderator@research.com',
        password: 'Moderator123!',
        fullName: 'Research Moderator',
        role: 'Moderator',
        isActive: true
      },
      {
        email: 'viewer@research.com', 
        password: 'Viewer123!',
        fullName: 'Research Viewer',
        role: 'Viewer',
        isActive: true
      }
    ];

    const adminsToCreate = adminData.length > 0 ? adminData : defaultAdmins;
    const createdAdmins = [];

    for (const adminInfo of adminsToCreate) {
      try {
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: adminInfo.email });
        
        if (existingAdmin) {
          console.log(`⚠️  Admin already exists: ${adminInfo.email}`);
          createdAdmins.push(existingAdmin);
          continue;
        }

        const newAdmin = await Admin.createAdmin(adminInfo);
        createdAdmins.push(newAdmin);
        console.log(`✅ Created admin: ${newAdmin.email} (${newAdmin.role})`);
      } catch (error) {
        console.error(`❌ Error creating admin ${adminInfo.email}:`, error.message);
      }
    }

    return createdAdmins;
  } catch (error) {
    console.error('❌ Error seeding admin accounts:', error);
    throw error;
  }
};

/**
 * Generate a secure random password
 * @param {number} length - Password length (default: 12)
 * @returns {string} - Generated password
 */
const generateSecurePassword = (length = 12) => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '@$!%*?&';
  
  let password = '';
  
  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Get admin role hierarchy weight
 * Higher number means higher privilege
 * @param {string} role - Admin role
 * @returns {number} - Role weight
 */
const getRoleWeight = (role) => {
  const roleWeights = {
    'Viewer': 1,
    'Moderator': 2,
    'SuperAdmin': 3
  };
  return roleWeights[role] || 0;
};

/**
 * Check if an admin can modify another admin based on role hierarchy
 * @param {Object} currentAdmin - The admin making the request
 * @param {Object} targetAdmin - The admin being modified
 * @returns {Object} - Permission result
 */
const canModifyAdmin = (currentAdmin, targetAdmin) => {
  const currentWeight = getRoleWeight(currentAdmin.role);
  const targetWeight = getRoleWeight(targetAdmin.role);
  
  // SuperAdmins can modify anyone except themselves for certain operations
  if (currentAdmin.role === 'SuperAdmin') {
    return {
      allowed: true,
      reason: 'SuperAdmin has full access'
    };
  }
  
  // Moderators can only modify Viewers
  if (currentAdmin.role === 'Moderator') {
    if (targetAdmin.role === 'Viewer') {
      return {
        allowed: true,
        reason: 'Moderator can modify Viewers'
      };
    }
    
    // Moderators can modify themselves
    if (currentAdmin._id.toString() === targetAdmin._id.toString()) {
      return {
        allowed: true,
        reason: 'Self-modification allowed'
      };
    }
    
    return {
      allowed: false,
      reason: 'Moderators can only modify Viewers and themselves'
    };
  }
  
  // Viewers can only modify themselves
  if (currentAdmin.role === 'Viewer') {
    if (currentAdmin._id.toString() === targetAdmin._id.toString()) {
      return {
        allowed: true,
        reason: 'Self-modification allowed'
      };
    }
    
    return {
      allowed: false,
      reason: 'Viewers can only modify themselves'
    };
  }
  
  return {
    allowed: false,
    reason: 'Invalid role'
  };
};

/**
 * Clean up inactive admin accounts
 * @param {number} daysInactive - Days of inactivity threshold (default: 90)
 * @returns {Object} - Cleanup results
 */
const cleanupInactiveAdmins = async (daysInactive = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
    
    // Find inactive admins (not SuperAdmins, and either never logged in or last login > threshold)
    const inactiveAdmins = await Admin.find({
      role: { $ne: 'SuperAdmin' }, // Don't clean up SuperAdmins
      isActive: true,
      $or: [
        { lastLogin: null },
        { lastLogin: { $lt: cutoffDate } }
      ]
    });
    
    const deactivatedCount = await Admin.updateMany(
      {
        _id: { $in: inactiveAdmins.map(admin => admin._id) }
      },
      {
        $set: { 
          isActive: false,
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`🧹 Cleaned up ${deactivatedCount.modifiedCount} inactive admin accounts`);
    
    return {
      found: inactiveAdmins.length,
      deactivated: deactivatedCount.modifiedCount,
      admins: inactiveAdmins.map(admin => ({
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin
      }))
    };
  } catch (error) {
    console.error('❌ Error cleaning up inactive admins:', error);
    throw error;
  }
};

/**
 * Get admin system statistics
 * @returns {Object} - System statistics
 */
const getSystemStats = async () => {
  try {
    const stats = await Admin.aggregate([
      {
        $group: {
          _id: null,
          totalAdmins: { $sum: 1 },
          activeAdmins: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactiveAdmins: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          },
          superAdmins: {
            $sum: { $cond: [{ $eq: ['$role', 'SuperAdmin'] }, 1, 0] }
          },
          moderators: {
            $sum: { $cond: [{ $eq: ['$role', 'Moderator'] }, 1, 0] }
          },
          viewers: {
            $sum: { $cond: [{ $eq: ['$role', 'Viewer'] }, 1, 0] }
          },
          recentLogins: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    '$lastLogin',
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                  ]
                },
                1,
                0
              ]
            }
          },
          lockedAccounts: {
            $sum: {
              $cond: [
                {
                  $gt: ['$lockUntil', new Date()]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    return stats[0] || {
      totalAdmins: 0,
      activeAdmins: 0,
      inactiveAdmins: 0,
      superAdmins: 0,
      moderators: 0,
      viewers: 0,
      recentLogins: 0,
      lockedAccounts: 0
    };
  } catch (error) {
    console.error('❌ Error getting system stats:', error);
    throw error;
  }
};

/**
 * Initialize the admin system
 * Should be called during application startup
 */
const initializeAdminSystem = async () => {
  try {
    console.log('🚀 Initializing Admin System...');
    
    // Create initial SuperAdmin
    await createInitialSuperAdmin();
    
    // Get current stats
    const stats = await getSystemStats();
    console.log('📊 Current Admin System Stats:');
    console.log(`   Total Admins: ${stats.totalAdmins}`);
    console.log(`   Active Admins: ${stats.activeAdmins}`);
    console.log(`   SuperAdmins: ${stats.superAdmins}`);
    console.log(`   Moderators: ${stats.moderators}`);
    console.log(`   Viewers: ${stats.viewers}`);
    
    console.log('✅ Admin System initialized successfully!');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Admin System:', error);
    throw error;
  }
};

/**
 * Validate environment variables for admin system
 */
const validateAdminConfig = () => {
  const requiredEnvVars = {
    'JWT_SECRET': process.env.JWT_SECRET,
  };
  
  // Check for MongoDB connection - use the same logic as server.js
  const activeEnviroment = process.env.NODE_ENV || 'local';
  const activeDbString = {
    local: process.env.MONGODB_LOCAL || 'mongodb://localhost:27017/researchdecode',
    test: process.env.MONGODB_TEST,
    prod: process.env.MONGODB_PROD,
  };
  
  const mongoUri = activeDbString[activeEnviroment];
  if (!mongoUri) {
    requiredEnvVars[`MONGODB_${activeEnviroment.toUpperCase()}`] = null;
  }
  
  const missingVars = [];
  
  for (const [varName, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables for Admin System:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    throw new Error('Missing required environment variables');
  }
  
  console.log('✅ Admin system environment configuration validated');
  console.log(`   Using MongoDB: ${mongoUri}`);
  return true;
};

module.exports = {
  createInitialSuperAdmin,
  seedAdminAccounts,
  generateSecurePassword,
  getRoleWeight,
  canModifyAdmin,
  cleanupInactiveAdmins,
  getSystemStats,
  initializeAdminSystem,
  validateAdminConfig
}; 