const Teacher = require("./teacherModel.js");
const DbService = require("../../Service/DbService.js");
const serviceHandler = require("../../Utils/serviceHandler.js");
const CustomError = require("../../Errors/CustomError.js");
const { AUTH_ERRORS, VALIDATION_ERRORS } = require("../../Utils/errorMessages");
const callRazorpayApi= require("../../Utils/razorpayHelper.js")
const {
  hashPassword,
  comparePasswords,
  generateToken,
} = require("../../Utils/utils.js");
const bcrypt = require("bcryptjs");
const { sendPasswordResetEmail } = require("../../Utils/mailer");

const model = new DbService(Teacher);


const teacherService = {
  create: serviceHandler(async (data) => {
    const { password, ...teacherData } = data;
    const hashedPassword = await hashPassword(password);

    const savedData = await model.save({
      ...teacherData,
      password: hashedPassword,
    });
    return savedData;
  }),

  register: serviceHandler(async (data) => {
    // Check if teacher already exists
    const existingTeacher = await Teacher.findOne({ email: data.email });
    if (existingTeacher) {
      throw new CustomError(400, "Teacher with this email already exists");
    }

    const { password, ...teacherData } = data;
    const hashedPassword = await hashPassword(password);

    const newTeacher = new Teacher({
      ...teacherData,
      password: hashedPassword,
      isApproved: false
    });

    const savedData = await newTeacher.save();
    
    // Return teacher data without password
    const { password: _, ...teacherResponse } = savedData.toObject();
    return teacherResponse;
  }),

  approveTeacher: serviceHandler(async (teacherId) => {
    // Find the teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      throw new CustomError(404, "Teacher not found");
    }

    // Check if already approved
    if (teacher.isApproved) {
      throw new CustomError(400, "Teacher is already approved");
    }

    // Update approval status
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { isApproved: true },
      { new: true }
    ).select('-password');

    return updatedTeacher;
  }),

  getPendingTeachers: serviceHandler(async () => {
    const pendingTeachers = await Teacher.find({
      isApproved: false,
      isDelete: false
    }).select('-password').sort({ createdAt: -1 });

    return pendingTeachers;
  }),

  checkProfileStatus: serviceHandler(async (teacherId) => {
    const teacher = await Teacher.findById(teacherId).select('-password');
    
    if (!teacher) {
      throw new CustomError(404, "Teacher not found");
    }

    // Check if profile is complete (you can customize these fields based on your requirements)
    const requiredFields = ['firstName', 'lastName', 'email', 'phoneNumber'];
    const missingFields = requiredFields.filter(field => !teacher[field]);
    
    const profileStatus = {
      isApproved: teacher.isApproved,
      isProfileComplete: missingFields.length === 0,
      missingFields: missingFields,
      teacher: teacher
    };

    return profileStatus;
  }),

  getAll: serviceHandler(async (data) => {
    const query = { isDelete: false, role: "TEACHER" };
    const savedData = await model.getAllDocuments(query, data);
    const totalCount = await model.totalCounts({
      isDelete: false,
      role: "TEACHER",
    });

    return { savedData, totalCount };
  }),
  getById: serviceHandler(async (dataId) => {
    const { supervisorId } = dataId;
    const query = { isDelete: false, _id: supervisorId };
    const savedDataById = await model.getDocumentById(query);
    return savedDataById;
  }),

  approvedTeacher: serviceHandler(async (data) => {
  const { _id } = data;

  if (!_id) {
    throw new Error("Teacher ID is required.");
  }

  const findUser = await model.getDocumentById({ _id:_id});

  if (!findUser) {
    throw new Error("User not found.");
  }
  // return findUser.isBankActive ;

  if (findUser.isBankActive===false) {
    return false
  }

  return findUser.name
}),

  update: serviceHandler(async (updateData) => {
    const { teacherId } = updateData;
    const filter = { _id: teacherId };
    const updatePayload = { ...updateData };
    const updatedDoc = await model.updateDocument(filter, updatePayload);
    return updatedDoc;
  }),
  delete: serviceHandler(async (deleteId) => {
    const { teacherId } = deleteId;
    const deletedDoc = await model.updateDocument(
      { _id: teacherId },
      { isDelete: true }
    );
    return deletedDoc;
  }),
  /**
   * Securely authenticates a teacher using email and password
   * @param {string} email - Teacher's email address
   * @param {string} password - Teacher's password
   * @returns {Object} Authentication result with user data and token
   */
  signIn: serviceHandler(async (email, password) => {
  // Validate inputs
  if (!email || !password) {
    throw new CustomError(AUTH_ERRORS.EMAIL_PASSWORD_REQUIRED, 400);
  }
  
  // Use a separate secure query function for authentication
  const teacher = await getTeacherForAuthentication(email);
  
  // Verify teacher exists
  if (!teacher) {
    // Use generic message to prevent user enumeration
    throw new CustomError(AUTH_ERRORS.INVALID_CREDENTIALS, 401);
  }
  
  // Verify account is active
  if (teacher.isDelete === true) {
    throw new CustomError(AUTH_ERRORS.ACCOUNT_DELETED, 403);
  }

  // Check if account is approved (for teachers)
  if (teacher.isApproved === false) {
    throw new CustomError(AUTH_ERRORS.ACCOUNT_PENDING_APPROVAL, 403);
  }

  // Compare passwords using constant-time comparison
  const isPasswordMatch = await comparePasswords(password, teacher.password);
  
  if (!isPasswordMatch) {
    // Use same generic error message to prevent timing attacks
    throw new CustomError(AUTH_ERRORS.INVALID_CREDENTIALS, 401);
  }
  
  // Generate JWT token with appropriate claims and expiration
  const token = generateToken(teacher);
  
  // Return user information including approval status
  const userData = {
    id: teacher._id,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    name: teacher.name || `${teacher.firstName} ${teacher.lastName}`,
    email: teacher.email,
    phoneNumber: teacher.phoneNumber,
    userType: "expert",
    isApproved: teacher.isApproved // Include approval status in response
  };
  
  return { user: userData, token };
}),
};
const TeacherService = teacherService;
module.exports = TeacherService;


/**
 * Secure query function specifically for authentication
 * @param {string} email - Teacher's email address
 * @returns {Object|null} Teacher document or null if not found
 * @private
 */
async function getTeacherForAuthentication(email) {
  try {
    // Only select fields needed for authentication to minimize data exposure
    const teacher = await Teacher.findOne({ 
      email: email,
    }).select('+password +isActive +isApproved');
    
    return teacher;
  } catch (error) {
    console.error('Authentication query error:', error.message);
    throw new CustomError(500, "Authentication service unavailable");
  }
}

// Add forget password functionality
const teacherServiceWithReset = {
  ...teacherService,
  
  // Forgot password - send reset email
  forgotPassword: serviceHandler(async (email) => {
    if (!email) {
      throw new CustomError("Email is required.", 400);
    }

    const filter = { email: email.toLowerCase().trim(), isDelete: { $ne: true } };
    const teacher = await model.getDocument(filter);

    if (!teacher) {
      // Return success even if email doesn't exist for security
      return { message: "If an account with that email exists, a password reset link has been sent." };
    }

    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Save reset token
    await model.updateDocument(
      { _id: teacher._id },
      { 
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpires
      }
    );

    // Send reset email
    await sendPasswordResetEmail(email, resetToken, 'teacher');

    return { message: "If an account with that email exists, a password reset link has been sent." };
  }),

  // Reset password with token
  resetPassword: serviceHandler(async (token, newPassword) => {
    if (!token || !newPassword) {
      throw new CustomError("Reset token and new password are required.", 400);
    }

    if (newPassword.length < 6) {
      throw new CustomError("Password must be at least 6 characters long.", 400);
    }

    // Find teacher with valid reset token
    const filter = {
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
      isDelete: { $ne: true }
    };
    
    const teacher = await model.getDocument(filter);

    if (!teacher) {
      throw new CustomError("Invalid or expired reset token.", 400);
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear reset token
    await model.updateDocument(
      { _id: teacher._id },
      {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      }
    );

    return { message: "Password has been reset successfully." };
  }),
};

module.exports = teacherServiceWithReset;