const Student = require("./studentModel");
const DbService = require("../../Service/DbService");
const serviceHandler = require("../../Utils/serviceHandler");
const CustomError = require("../../Errors/CustomError");
const { AUTH_ERRORS, VALIDATION_ERRORS } = require("../../Utils/errorMessages");
const {
  hashPassword,
  comparePasswords,
  generateToken,
  verifyToken,
} = require("../../Utils/utils");
const { sendVerificationEmail } = require("../../Utils/mailer");
const { sendPasswordResetEmail } = require("../../Utils/mailer");
const model = new DbService(Student);

const studentService = {
  create: serviceHandler(async (data) => {
    const { email, password, ...userData } = data;
    if (!email || !password) {
      throw new Error("Email and password are required");
    }
    const hashedPassword = await hashPassword(password);
    const savedData = await model.save({
      email,
      ...userData,
      password: hashedPassword,
    });

    const student = {
      _id: savedData._id,
      firstName: savedData.firstName,
      userType: savedData.userType

    }
    const token = generateToken(student)
    await sendVerificationEmail(email, token);
    return { msg: "Student created Successfully", data: savedData, token };
  }),

  getAll: serviceHandler(async (data) => {
    const query = { isDelete: false };
    const savedData = await model.getAllDocuments(query, data);
    const totalCount = await model.totalCounts({ isDelete: false });

    return { savedData, totalCount };
  }),
  getBotUsers: serviceHandler(async (data) => {
    const query = { userType: "BOT" };
    const savedData = await model.getAllDocuments(query, data);
    const totalCount = await model.totalCounts({ isDelete: false });
    return { savedData, totalCount };
  }),
  getById: serviceHandler(async (dataId) => {
    const { studentId } = dataId;
    const query = { isDelete: false, _id: studentId };
    const savedDataById = await model.getDocumentById(query);
    return savedDataById;
  }),

  update: serviceHandler(async (updateData) => {
    const { StudentId } = updateData;
    const filter = { _id: StudentId };
    const updatePayload = { ...updateData };
    const updatedDoc = await model.updateDocument(filter, updatePayload);
    return updatedDoc;
  }),

  delete: serviceHandler(async (deleteId) => {
    const { StudentId } = deleteId;
    const deletedDoc = await model.updateDocument(
      { _id: StudentId },
      { isDelete: true }
    );
    return deletedDoc;
  }),

  signIn: serviceHandler(async (email, password) => {
    // Validate inputs
    if (!email || !password) {
      throw new CustomError(AUTH_ERRORS.EMAIL_PASSWORD_REQUIRED, 400);
    }

    // Query should explicitly exclude deleted users
    const filter = {
      email,
      isDelete: { $ne: true }  // Exclude documents where isDelete is true
    };
    const student = await model.getDocument(filter);

    if (!student) {
      throw new CustomError(AUTH_ERRORS.ACCOUNT_NOT_FOUND, 404);
    }

    // Additional safety check for deleted accounts
    if (student.isDelete === true) {
      throw new CustomError(AUTH_ERRORS.ACCOUNT_DELETED, 404);
    }

    // Check if user is active
    if (student.isActive === false) {
      throw new CustomError(AUTH_ERRORS.ACCOUNT_DEACTIVATED, 403);
    }

    const isPasswordMatch = await comparePasswords(password, student.password);

    if (!isPasswordMatch) {
      throw new CustomError(AUTH_ERRORS.PASSWORD_INCORRECT, 401);
    }

    const token = generateToken(student);
    student.password = "";
    return { user: student, token };
  }),
  getUsersChattedWith: serviceHandler(async (userObj) => { }),

  verifyEmail: serviceHandler(async (token) => {
    const decoded = verifyToken(token);
    const filter = { _id: decoded._id };
    const updatePayload = { emailVerified: true };
    const updatedDoc = await model.updateDocument(filter, updatePayload);
    return updatedDoc;
  }),

  // Forgot password - send reset email
  forgotPassword: serviceHandler(async (email) => {
    if (!email) {
      throw new CustomError("Email is required.", 400);
    }

    const filter = { email: email.toLowerCase().trim(), isDelete: { $ne: true } };
    const student = await model.getDocument(filter);

    if (!student) {
      // Return success even if email doesn't exist for security
      return { message: "If an account with that email exists, a password reset link has been sent." };
    }

    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Save reset token
    await model.updateDocument(
      { _id: student._id },
      { 
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpires
      }
    );

    // Send reset email
    await sendPasswordResetEmail(email, resetToken, 'student');

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

    // Find student with valid reset token
    const filter = {
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
      isDelete: { $ne: true }
    };
    
    const student = await model.getDocument(filter);

    if (!student) {
      throw new CustomError("Invalid or expired reset token.", 400);
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear reset token
    await model.updateDocument(
      { _id: student._id },
      {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      }
    );

    return { message: "Password has been reset successfully." };
  }),

  // Profile-specific methods
  getCurrentProfile: serviceHandler(async (userId) => {
    const query = { _id: userId, isDelete: false };
    const student = await model.getDocument(query);

    if (!student) {
      throw new CustomError(404, "Student profile not found");
    }

    // Remove password from response
    const studentProfile = student.toObject();
    delete studentProfile.password;

    // Add profile completion data
    studentProfile.completionPercentage = student.getProfileCompletionPercentage();
    studentProfile.missingFields = student.getMissingProfileFields();
    return studentProfile;
  }),

  updateProfile: serviceHandler(async (userId, profileData) => {
    const query = { _id: userId, isDelete: false };
    const existingStudent = await model.getDocument(query);

    if (!existingStudent) {
      throw new CustomError(404, "Student not found");
    }

    // Prepare update data (exclude email and password from profile updates)
    const { email, password, ...updateData } = profileData;
    const updatedStudent = await model.updateDocument(
      query,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );

    // Remove password from response
    const studentProfile = updatedStudent.toObject();
    delete studentProfile.password;
    return studentProfile;
  }),

  uploadProfilePicture: serviceHandler(async (userId, profilePictureUrl) => {
    const query = { _id: userId, isDelete: false };
    const existingStudent = await model.getDocument(query);

    if (!existingStudent) {
      throw new CustomError(404, "Student not found");
    }

    const updatedStudent = await model.updateDocument(
      query,
      { profilePicture: profilePictureUrl, updatedAt: new Date() },
      { new: true }
    );

    // Remove password from response
    const studentProfile = updatedStudent.toObject();
    delete studentProfile.password;

    return studentProfile;
  }),

  getProfileCompletionStatus: serviceHandler(async (userId) => {
    const query = { _id: userId, isDelete: false };
    const student = await model.getDocument(query);

    if (!student) {
      throw new CustomError(404, "Student not found");
    }

    const completionPercentage = student.getProfileCompletionPercentage();
    const missingFields = student.getMissingProfileFields();
    const isComplete = completionPercentage === 100;

    return {
      isComplete,
      completionPercentage,
      missingFields,
      totalFields: 8,
      completedFields: 8 - missingFields.length
    };
  }),

  // Search students by name, email, or college
  searchStudents: serviceHandler(async (searchQuery, queryParams = {}) => {
    const { skip = 0, limit = 10 } = queryParams;

    let query = { isDelete: false };

    if (searchQuery) {
      query.$or = [
        { firstName: { $regex: searchQuery, $options: 'i' } },
        { lastName: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } },
        { collegeName: { $regex: searchQuery, $options: 'i' } },
        { department: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    const students = await model.getAllDocuments(query, { skip, limit });
    const totalCount = await model.totalCounts(query);

    // Remove passwords from all student records
    const studentsWithoutPasswords = students.map(student => {
      const studentObj = student.toObject();
      delete studentObj.password;
      return studentObj;
    });

    return {
      students: studentsWithoutPasswords,
      totalCount,
      currentPage: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(totalCount / limit)
    };
  }),

};

const StudentService = studentService;
module.exports = StudentService;
