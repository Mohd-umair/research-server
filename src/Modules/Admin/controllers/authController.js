const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const CustomError = require('../../../Errors/CustomError');

/**
 * Generate JWT token for admin
 */
const generateToken = (admin) => {
  const payload = {
    adminId: admin._id,
    email: admin.email,
    role: admin.role,
    permissions: admin.permissions,
    iat: Math.floor(Date.now() / 1000)
  };

  const options = {
    expiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '24h',
    issuer: 'research-admin-system',
    audience: 'admin-panel'
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'your-default-secret', options);
};

/**
 * Set secure cookie with token
 */
const setTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
  };

  res.cookie('adminToken', token, cookieOptions);
};

/**
 * Admin login
 * POST /api/admin/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    // Validation
    if (!email || !password) {
      return next(new CustomError('Email and password are required.', 400));
    }

    // Find admin by email and include password for comparison
    const admin = await Admin.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+password +loginAttempts +lockUntil');

    if (!admin) {
      return next(new CustomError('Invalid email or password.', 401));
    }

    // Check if account is locked
    if (admin.isLocked) {
      const lockTimeRemaining = Math.ceil((admin.lockUntil - Date.now()) / (1000 * 60));
      return next(new CustomError(
        `Account is temporarily locked due to multiple failed login attempts. Try again in ${lockTimeRemaining} minutes.`,
        423
      ));
    }

    // Check if account is active
    if (!admin.isActive) {
      return next(new CustomError('Account is deactivated. Please contact system administrator.', 401));
    }

    // Compare password
    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      // Increment login attempts
      await admin.incLoginAttempts();
      
      // Check if account should be locked after this attempt
      const updatedAdmin = await Admin.findById(admin._id).select('+loginAttempts +lockUntil');
      if (updatedAdmin.isLocked) {
        const lockTimeRemaining = Math.ceil((updatedAdmin.lockUntil - Date.now()) / (1000 * 60));
        return next(new CustomError(
          `Account has been locked due to multiple failed login attempts. Try again in ${lockTimeRemaining} minutes.`,
          423
        ));
      }

      const remainingAttempts = 5 - (updatedAdmin.loginAttempts || 0);
      return next(new CustomError(
        `Invalid email or password. ${remainingAttempts} attempts remaining.`,
        401
      ));
    }

    // Password is correct - reset login attempts and update last login
    await admin.resetLoginAttempts();
    await admin.updateLastLogin();

    // Generate token
    const token = generateToken(admin);

    // Set cookie if requested
    if (rememberMe) {
      setTokenCookie(res, token);
    }

    // Remove sensitive data from response
    const adminResponse = admin.toJSON();
    delete adminResponse.password;
    delete adminResponse.loginAttempts;
    delete adminResponse.lockUntil;

    // Log successful login
    console.log(`[ADMIN LOGIN] ${new Date().toISOString()} - Admin: ${admin.email} (${admin.role}) - IP: ${req.ip}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        admin: adminResponse,
        token,
        tokenType: 'Bearer',
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    next(new CustomError('Login failed. Please try again.', 500));
  }
};

/**
 * Get current admin profile
 * GET /api/admin/auth/me
 */
const getProfile = async (req, res, next) => {
  try {
    // Admin is already attached to req by verifyAdminToken middleware
    const admin = req.admin;

    if (!admin) {
      return next(new CustomError('Admin not found.', 404));
    }

    // Get fresh data from database to ensure accuracy
    const freshAdmin = await Admin.findById(admin._id)
      .populate('createdBy', 'fullName email role')
      .populate('updatedBy', 'fullName email role');

    if (!freshAdmin) {
      return next(new CustomError('Admin account not found.', 404));
    }

    if (!freshAdmin.isActive) {
      return next(new CustomError('Admin account is deactivated.', 401));
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        admin: freshAdmin
      }
    });

  } catch (error) {
    console.error('Get admin profile error:', error);
    next(new CustomError('Failed to retrieve profile.', 500));
  }
};

/**
 * Admin logout
 * POST /api/admin/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    // Clear the admin token cookie
    res.clearCookie('adminToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    // Log logout
    if (req.admin) {
      console.log(`[ADMIN LOGOUT] ${new Date().toISOString()} - Admin: ${req.admin.email} (${req.admin.role}) - IP: ${req.ip}`);
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Admin logout error:', error);
    next(new CustomError('Logout failed.', 500));
  }
};

/**
 * Refresh admin token
 * POST /api/admin/auth/refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    // Admin is already attached to req by verifyAdminToken middleware
    const admin = req.admin;

    if (!admin) {
      return next(new CustomError('Admin not found.', 404));
    }

    // Check if admin is still active
    const freshAdmin = await Admin.findById(admin._id);
    
    if (!freshAdmin || !freshAdmin.isActive || freshAdmin.isLocked) {
      return next(new CustomError('Admin account is no longer valid.', 401));
    }

    // Generate new token
    const newToken = generateToken(freshAdmin);

    // Update last login time
    await freshAdmin.updateLastLogin();

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        tokenType: 'Bearer',
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('Admin token refresh error:', error);
    next(new CustomError('Token refresh failed.', 500));
  }
};

/**
 * Verify admin token (utility endpoint)
 * GET /api/admin/auth/verify
 */
const verifyToken = async (req, res, next) => {
  try {
    // If we reach this point, the token is valid (middleware passed)
    const admin = req.admin;

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: {
        admin: {
          id: admin._id,
          email: admin.email,
          fullName: admin.fullName,
          role: admin.role,
          permissions: admin.permissions,
          lastLogin: admin.lastLogin
        },
        tokenValid: true
      }
    });

  } catch (error) {
    console.error('Admin token verification error:', error);
    next(new CustomError('Token verification failed.', 500));
  }
};

/**
 * Change admin password
 * POST /api/admin/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const admin = req.admin;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return next(new CustomError('Current password, new password, and confirmation are required.', 400));
    }

    if (newPassword !== confirmPassword) {
      return next(new CustomError('New password and confirmation do not match.', 400));
    }

    if (newPassword.length < 8) {
      return next(new CustomError('New password must be at least 8 characters long.', 400));
    }

    // Get admin with password
    const adminWithPassword = await Admin.findById(admin._id).select('+password');
    
    if (!adminWithPassword) {
      return next(new CustomError('Admin not found.', 404));
    }

    // Verify current password
    const isCurrentPasswordValid = await adminWithPassword.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return next(new CustomError('Current password is incorrect.', 401));
    }

    // Update password
    adminWithPassword.password = newPassword;
    adminWithPassword.updatedBy = admin._id;
    await adminWithPassword.save();

    // Log password change
    console.log(`[ADMIN PASSWORD CHANGE] ${new Date().toISOString()} - Admin: ${admin.email} (${admin.role}) - IP: ${req.ip}`);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Admin password change error:', error);
    next(new CustomError('Password change failed.', 500));
  }
};

/**
 * Forgot password - Send reset token
 * POST /api/admin/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return next(new CustomError('Email is required.', 400));
    }

    // Find admin by email
    const admin = await Admin.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true 
    });

    // Always return success for security reasons (don't reveal if email exists)
    if (!admin) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token (simplified version - in production, use crypto.randomBytes)
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Save reset token to admin (you may want to add these fields to your Admin model)
    admin.resetPasswordToken = resetToken;
    admin.resetPasswordExpires = resetTokenExpires;
    await admin.save();

    // In a real application, you would send an email here
    // For now, we'll just log it (remove in production)
    console.log(`[PASSWORD RESET] ${new Date().toISOString()} - Reset token for ${admin.email}: ${resetToken}`);

    // Log the request
    console.log(`[ADMIN FORGOT PASSWORD] ${new Date().toISOString()} - Email: ${email} - IP: ${req.ip}`);

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
      // Remove this in production - only for development
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });

  } catch (error) {
    console.error('Admin forgot password error:', error);
    next(new CustomError('Failed to process password reset request.', 500));
  }
};

/**
 * Reset password with token
 * POST /api/admin/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    // Validation
    if (!token || !newPassword || !confirmPassword) {
      return next(new CustomError('Reset token, new password, and confirmation are required.', 400));
    }

    if (newPassword !== confirmPassword) {
      return next(new CustomError('New password and confirmation do not match.', 400));
    }

    if (newPassword.length < 8) {
      return next(new CustomError('New password must be at least 8 characters long.', 400));
    }

    // Find admin with valid reset token
    const admin = await Admin.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
      isActive: true
    }).select('+password');

    if (!admin) {
      return next(new CustomError('Invalid or expired reset token.', 400));
    }

    // Update password and clear reset token
    admin.password = newPassword;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    admin.updatedBy = admin._id;
    await admin.save();

    // Log password reset
    console.log(`[ADMIN PASSWORD RESET] ${new Date().toISOString()} - Admin: ${admin.email} (${admin.role}) - IP: ${req.ip}`);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please login with your new password.'
    });

  } catch (error) {
    console.error('Admin password reset error:', error);
    next(new CustomError('Password reset failed.', 500));
  }
};

/**
 * Update current admin profile
 * PATCH /api/admin/auth/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { fullName, email } = req.body;
    const admin = req.admin;

    // Validation
    if (!fullName && !email) {
      return next(new CustomError('At least one field (fullName or email) is required for update.', 400));
    }

    const updateData = { updatedBy: admin._id };

    if (fullName) {
      if (typeof fullName !== 'string' || fullName.trim().length < 2) {
        return next(new CustomError('Full name must be at least 2 characters long.', 400));
      }
      updateData.fullName = fullName.trim();
    }

    if (email) {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return next(new CustomError('Please provide a valid email address.', 400));
      }
      
      // Check if email is already taken by another admin
      const existingAdmin = await Admin.findOne({ 
        email: email.toLowerCase().trim(),
        _id: { $ne: admin._id }
      });
      
      if (existingAdmin) {
        return next(new CustomError('Email is already in use by another admin.', 409));
      }
      
      updateData.email = email.toLowerCase().trim();
    }

    // Update admin
    const updatedAdmin = await Admin.findByIdAndUpdate(
      admin._id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'fullName email role')
     .populate('updatedBy', 'fullName email role');

    if (!updatedAdmin) {
      return next(new CustomError('Admin not found.', 404));
    }

    // Log profile update
    console.log(`[ADMIN PROFILE UPDATE] ${new Date().toISOString()} - Admin: ${admin.email} (${admin.role}) - IP: ${req.ip}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        admin: updatedAdmin
      }
    });

  } catch (error) {
    console.error('Admin profile update error:', error);
    next(new CustomError('Profile update failed.', 500));
  }
};

module.exports = {
  login,
  getProfile,
  logout,
  refreshToken,
  verifyToken,
  changePassword,
  forgotPassword,
  resetPassword,
  updateProfile,
  generateToken,
  setTokenCookie
}; 