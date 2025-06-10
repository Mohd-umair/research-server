const Teacher = require("./teacherModel.js");
const DbService = require("../../Service/DbService.js");
const serviceHandler = require("../../Utils/serviceHandler.js");
const CustomError = require("../../Errors/CustomError.js");
const callRazorpayApi= require("../../Utils/razorpayHelper.js")
const {
  hashPassword,
  comparePasswords,
  generateToken,
} = require("../../Utils/utils.js");
const bcrypt = require("bcryptjs");

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
    throw new CustomError(400, "Email and password are required");
  }
  
  // Use a separate secure query function for authentication
  const teacher = await getTeacherForAuthentication(email);
  
  // Verify teacher exists
  if (!teacher) {
    // Use generic message to prevent user enumeration
    throw new CustomError(401, "Invalid credentials");
  }
  
  // Verify account is active
  if (teacher.isDelete === true) {
    throw new CustomError(403, "Account is no longer active");
  }

  // Compare passwords using constant-time comparison
  const isPasswordMatch = await comparePasswords(password, teacher.password);
  
  if (!isPasswordMatch) {
    // Use same generic error message to prevent timing attacks
    throw new CustomError(401, "Invalid credentials");
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