const TeacherProfile = require("./teacherProfileModel");
const DbService = require("../../Service/DbService");
const serviceHandler = require("../../Utils/serviceHandler");
const CustomError = require("../../Errors/CustomError");

const model = new DbService(TeacherProfile);

const teacherProfileService = {
  
  // Public method to get teacher profile by ID (for consultancy detail page)
  getPublicProfile: serviceHandler(async (teacherId) => {
    const query = { 
      userId: teacherId,
      isDeleted: false
      // Temporarily removed profileStatus: 'approved' for development
    };
    
    const profile = await model.getDocument(query);
    
    if (!profile) {
      throw new CustomError(404, "Teacher profile not found");
    }
    
    // Return only public information
    const publicProfile = {
      _id: profile._id,
      personalInfo: {
        firstName: profile.personalInfo?.firstName,
        lastName: profile.personalInfo?.lastName,
        profilePicture: profile.personalInfo?.profilePicture
      },
      professional: {
        currentPosition: profile.professional?.currentPosition,
        institution: profile.professional?.institution,
        experience: profile.professional?.experience,
        specialization: profile.professional?.specialization,
        skills: profile.professional?.skills,
        professionalSummary: profile.professional?.professionalSummary,
        hourlyRate: profile.professional?.hourlyRate,
        availabilityStatus: profile.professional?.availabilityStatus
      },
      ratings: profile.ratings,
      completedSessions: profile.completedSessions,
      profileStatus: profile.profileStatus,
      createdAt: profile.createdAt
    };
    
    return publicProfile;
  }),

  // Get current user's profile by userId from token
  getCurrentUserProfile: serviceHandler(async (userId) => {
    const query = { userId: userId, isDeleted: false };
    const profile = await model.getDocument(query);
    
    if (!profile) {
      // If no profile exists, return null instead of throwing error
      return null;
    }
    
    return profile;
  }),

  // Create or update current user's profile
  createOrUpdateProfile: serviceHandler(async (userId, profileData) => {
    const existingProfile = await model.getDocument({ 
      userId: userId, 
      isDeleted: false 
    });

    if (existingProfile) {
      // Update existing profile
      const updateData = {
        ...profileData,
        userId: userId,
        userType: "Teacher",
        updatedAt: new Date()
      };

      const updatedProfile = await model.updateDocument(
        { userId: userId, isDeleted: false },
        updateData
      );
      
      return updatedProfile;
    } else {
      // Create new profile
      const newProfileData = {
        ...profileData,
        userId: userId,
        userType: "Teacher"
      };

      const savedProfile = await model.save(newProfileData);
      return savedProfile;
    }
  }),

  // Update current user's profile (authenticated user only)
  updateCurrentUserProfile: serviceHandler(async (userId, updateData) => {
    const existingProfile = await model.getDocument({ 
      userId: userId, 
      isDeleted: false 
    });

    if (!existingProfile) {
      throw new CustomError(404, "Profile not found");
    }

    const profileData = {
      ...updateData,
      userId: userId,
      userType: "Teacher",
      updatedAt: new Date()
    };

    // If profile was previously rejected and now being updated, reset status
    if (existingProfile.profileStatus === 'rejected') {
      profileData.profileStatus = 'incomplete';
      profileData.rejectionReasons = [];
    }

    const updatedProfile = await model.updateDocument(
      { userId: userId, isDeleted: false },
      profileData
    );
    
    return updatedProfile;
  }),

  // Get profile completion status
  getProfileCompletionStatus: serviceHandler(async (userId) => {
    const profile = await model.getDocument({ 
      userId: userId, 
      isDeleted: false 
    });

    if (!profile) {
      return {
        isComplete: false,
        completionPercentage: 0,
        profileStatus: 'incomplete',
        missingFields: [
          'personalInfo.firstName',
          'personalInfo.lastName', 
          'personalInfo.email',
          'personalInfo.phoneNumber',
          'address.street',
          'address.city',
          'address.state',
          'address.country',
          'address.postalCode',
          'professional.currentPosition',
          'professional.institution',
          'professional.experience',
          'professional.specialization',
          'professional.skills',
          'professional.professionalSummary',
          'bankDetails.bankName',
          'bankDetails.accountHolderName',
          'bankDetails.accountNumber',
          'bankDetails.ifscCode',
          'bankDetails.accountType'
        ]
      };
    }

    const missingFields = [];
    
    // Check personal info
    if (!profile.personalInfo?.firstName) missingFields.push('personalInfo.firstName');
    if (!profile.personalInfo?.lastName) missingFields.push('personalInfo.lastName');
    if (!profile.personalInfo?.email) missingFields.push('personalInfo.email');
    if (!profile.personalInfo?.phoneNumber) missingFields.push('personalInfo.phoneNumber');
    if (!profile.personalInfo?.dateOfBirth) missingFields.push('personalInfo.dateOfBirth');
    if (!profile.personalInfo?.gender) missingFields.push('personalInfo.gender');

    // Check address
    if (!profile.address?.street) missingFields.push('address.street');
    if (!profile.address?.city) missingFields.push('address.city');
    if (!profile.address?.state) missingFields.push('address.state');
    if (!profile.address?.country) missingFields.push('address.country');
    if (!profile.address?.postalCode) missingFields.push('address.postalCode');

    // Check professional info
    if (!profile.professional?.currentPosition) missingFields.push('professional.currentPosition');
    if (!profile.professional?.institution) missingFields.push('professional.institution');
    if (profile.professional?.experience === undefined) missingFields.push('professional.experience');
    if (!profile.professional?.specialization) missingFields.push('professional.specialization');
    if (!profile.professional?.skills || profile.professional.skills.length === 0) missingFields.push('professional.skills');
    if (!profile.professional?.professionalSummary) missingFields.push('professional.professionalSummary');

    // Check bank details
    if (!profile.bankDetails?.bankName) missingFields.push('bankDetails.bankName');
    if (!profile.bankDetails?.accountHolderName) missingFields.push('bankDetails.accountHolderName');
    if (!profile.bankDetails?.accountNumber) missingFields.push('bankDetails.accountNumber');
    if (!profile.bankDetails?.ifscCode) missingFields.push('bankDetails.ifscCode');
    if (!profile.bankDetails?.accountType) missingFields.push('bankDetails.accountType');

    return {
      isComplete: profile.isProfileComplete,
      completionPercentage: profile.completionPercentage,
      profileStatus: profile.profileStatus,
      missingFields: missingFields,
      submittedAt: profile.submittedAt,
      approvedAt: profile.approvedAt,
      rejectionReasons: profile.rejectionReasons
    };
  }),

  // Submit profile for verification
  submitForVerification: serviceHandler(async (userId) => {
    const profile = await model.getDocument({ 
      userId: userId, 
      isDeleted: false 
    });

    if (!profile) {
      throw new CustomError(404, "Profile not found");
    }

    if (profile.completionPercentage < 100) {
      throw new CustomError(400, "Profile is not complete. Please fill in all required fields.");
    }

    const updatedProfile = await model.updateDocument(
      { userId: userId, isDeleted: false },
      { 
        profileStatus: 'pending',
        submittedAt: new Date()
      }
    );

    return updatedProfile;
  }),

  // Admin methods for profile management
  getAllProfiles: serviceHandler(async (queryParams = {}) => {
    const { 
      skip = 0, 
      limit = 10, 
      status, 
      search 
    } = queryParams;

    let query = { isDeleted: false };

    // Filter by status if provided
    if (status && ['incomplete', 'pending', 'approved', 'rejected'].includes(status)) {
      query.profileStatus = status;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
        { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
        { 'personalInfo.email': { $regex: search, $options: 'i' } },
        { 'professional.institution': { $regex: search, $options: 'i' } },
        { 'professional.specialization': { $regex: search, $options: 'i' } }
      ];
    }

    const profiles = await model.getAllDocuments(query, { skip, limit });
    const totalCount = await model.totalCounts(query);

    return { 
      profiles, 
      totalCount,
      currentPage: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(totalCount / limit)
    };
  }),

  // Admin: Get profile by ID
  getProfileById: serviceHandler(async (profileId) => {
    const profile = await model.getDocumentById({ _id: profileId, isDeleted: false });
    
    if (!profile) {
      throw new CustomError(404, "Profile not found");
    }
    
    return profile;
  }),

  // Admin: Approve profile
  approveProfile: serviceHandler(async (profileId) => {
    const profile = await model.getDocumentById({ _id: profileId, isDeleted: false });
    
    if (!profile) {
      throw new CustomError(404, "Profile not found");
    }

    if (profile.profileStatus !== 'pending') {
      throw new CustomError(400, "Only pending profiles can be approved");
    }

    const updatedProfile = await model.updateDocument(
      { _id: profileId },
      { 
        profileStatus: 'approved',
        approvedAt: new Date(),
        rejectionReasons: []
      }
    );

    return updatedProfile;
  }),

  // Admin: Reject profile
  rejectProfile: serviceHandler(async (profileId, rejectionReasons = []) => {
    const profile = await model.getDocumentById({ _id: profileId, isDeleted: false });
    
    if (!profile) {
      throw new CustomError(404, "Profile not found");
    }

    if (profile.profileStatus !== 'pending') {
      throw new CustomError(400, "Only pending profiles can be rejected");
    }

    const updatedProfile = await model.updateDocument(
      { _id: profileId },
      { 
        profileStatus: 'rejected',
        rejectionReasons: rejectionReasons,
        approvedAt: null
      }
    );

    return updatedProfile;
  }),

  // Delete profile (soft delete)
  deleteProfile: serviceHandler(async (userId) => {
    const profile = await model.getDocument({ 
      userId: userId, 
      isDeleted: false 
    });

    if (!profile) {
      throw new CustomError(404, "Profile not found");
    }

    const deletedProfile = await model.updateDocument(
      { userId: userId },
      { isDeleted: true }
    );

    return deletedProfile;
  }),

  // Get skills suggestions based on specialization
  getSkillsSuggestions: serviceHandler(async (specialization) => {
    const skillsMap = {
      'Computer Science': [
        'Programming', 'Data Structures', 'Algorithms', 'Software Engineering',
        'Database Management', 'Web Development', 'Mobile Development'
      ],
      'Data Science': [
        'Python', 'R', 'Machine Learning', 'Statistics', 'Data Visualization',
        'SQL', 'Big Data', 'Deep Learning'
      ],
      'Mathematics': [
        'Calculus', 'Linear Algebra', 'Statistics', 'Probability',
        'Mathematical Modeling', 'Numerical Analysis'
      ],
      'Physics': [
        'Classical Mechanics', 'Quantum Mechanics', 'Thermodynamics',
        'Electromagnetism', 'Research Methods', 'Laboratory Skills'
      ],
      'Engineering': [
        'Problem Solving', 'Project Management', 'CAD', 'Technical Writing',
        'System Design', 'Quality Control'
      ]
    };

    return skillsMap[specialization] || [
      'Teaching', 'Research', 'Communication', 'Problem Solving',
      'Critical Thinking', 'Project Management'
    ];
  }),

  // Fix profile status for existing profiles
  fixProfileStatus: serviceHandler(async (userId) => {
    const profile = await model.getDocument({ 
      userId: userId, 
      isDeleted: false 
    });

    if (!profile) {
      throw new CustomError(404, "Profile not found");
    }

    // Update the profile status based on completion
    profile.updateProfileStatus();
    await profile.save();

    return profile;
  }),

  // Fix all profiles with incorrect status
  fixAllProfileStatuses: serviceHandler(async () => {
    const profiles = await model.getAllDocuments({ isDeleted: false });
    let fixedCount = 0;

    for (const profile of profiles) {
      const oldStatus = profile.profileStatus;
      profile.updateProfileStatus();
      
      if (profile.profileStatus !== oldStatus) {
        await profile.save();
        fixedCount++;
      }
    }

    return {
      message: `Fixed ${fixedCount} profiles with incorrect status`,
      fixedCount
    };
  })
};

module.exports = teacherProfileService; 