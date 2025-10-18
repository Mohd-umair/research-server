const DatabaseService = require("../../Service/DbService");
const Collaboration = require("./collaborationModel");

const model = new DatabaseService(Collaboration);

const collaborationService = {
  createCollaboration: async (data) => {
    const newCollaboration = await model.save(data);
    
    // Send notifications to all users about the new collaboration
    try {
      const notificationService = require("../Notifications/notificationService");
      
      // Get creator information
      let creatorName = 'Someone';
      if (data.userType === 'USER') {
        const StudentModel = require("../Students/studentModel");
        const student = await StudentModel.findById(data.createdBy);
        if (student) {
          creatorName = `${student.firstName} ${student.lastName}`;
        }
      } else {
        const TeacherModel = require("../Teachers/teacherModel");
        const teacher = await TeacherModel.findById(data.createdBy);
        if (teacher) {
          creatorName = `${teacher.firstName} ${teacher.lastName}`;
        }
      }
      
      await notificationService.createCollaborationCreatedNotification({
        collaborationId: newCollaboration._id,
        collaborationTitle: newCollaboration.title,
        creatorName: creatorName,
        creatorId: data.createdBy
      });
      
    } catch (notificationError) {
      console.error('Failed to send collaboration creation notifications:', notificationError.message);
      // Don't fail the collaboration creation if notification fails
    }
    
    return newCollaboration;
  },

  getAllCollaborations: async (data) => {
    const { userType = 'USER', search, page = 1, limit = 10, createdBy } = data;
    const skip = (page - 1) * limit;
    
    let query = { isDelete: false, userType };
    
    // Add createdBy filter if provided
    if (createdBy) {
      query.createdBy = createdBy;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const savedData = await model.getAllDocuments(query, { skip, limit });
    const totalCount = await model.totalCounts(query);

    // Populate user data for each collaboration
    const populatedData = await Promise.all(
      savedData.map(async (collaboration) => {
        if (collaboration.createdBy) {
          const UserModel = collaboration.userType === 'TEACHER' ? 
            require('../Teachers/teacherModel') : 
            require('../Students/studentModel');
          
          const user = await UserModel.findById(collaboration.createdBy).select('firstName lastName email');
          collaboration.createdBy = user;
        }
        
        if (collaboration.approvedBy) {
          const AdminModel = require('../Admin/adminModel');
          const admin = await AdminModel.findById(collaboration.approvedBy).select('firstName lastName email');
          collaboration.approvedBy = admin;
        }
        
        return collaboration;
      })
    );

    return { 
      savedData: populatedData, 
      totalCount, 
      currentPage: page, 
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPrevPage: page > 1
    };
  },

  getCollaborationById: async (paperId) => {
    return await model.getDocumentById({ _id :paperId });
  },

  updateCollaboration: async (paperId, updateData) => {
    return await model.updateDocument({_id : paperId }, updateData, { new: true });
  },

  deleteCollaboration: async (paperId) => {
    return await model.deleteDocument({ _id :paperId });
  },

  getCollaborationsByStudentId: async (studentId, userType = 'USER') => {
    const filter = { createdBy: studentId, userType, isDelete: false };
    const savedData = await model.getAllDocuments(filter);
    
    // Populate user data for each collaboration
    const populatedData = await Promise.all(
      savedData.map(async (collaboration) => {
        if (collaboration.createdBy) {
          const UserModel = collaboration.userType === 'TEACHER' ? 
            require('../Teachers/teacherModel') : 
            require('../Students/studentModel');
          
          const user = await UserModel.findById(collaboration.createdBy).select('firstName lastName email');
          collaboration.createdBy = user;
        }
        
        return collaboration;
      })
    );
    
    return populatedData;
  },

  searchCollaborations: async (query, userType = 'USER') => {
    const searchCondition = {
      isDelete: false,
      userType,
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    };
    const savedData = await model.getAllDocuments(searchCondition);
    
    // Populate user data for each collaboration
    const populatedData = await Promise.all(
      savedData.map(async (collaboration) => {
        if (collaboration.createdBy) {
          const UserModel = collaboration.userType === 'TEACHER' ? 
            require('../Teachers/teacherModel') : 
            require('../Students/studentModel');
          
          const user = await UserModel.findById(collaboration.createdBy).select('firstName lastName email');
          collaboration.createdBy = user;
        }
        
        return collaboration;
      })
    );
    
    return populatedData;
  },

  // Admin methods
  getAllCollaborationsForAdmin: async (data) => {
    const { page = 1, limit = 10, search, isApproved, userType } = data;
    const skip = (page - 1) * limit;
    
    let query = { isDelete: false };
    
    // Add filters
    if (isApproved !== undefined) {
      query.isApproved = isApproved;
    }
    if (userType) {
      query.userType = userType;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Fetch from both Collaboration (student) model and TeacherCollaboration model
    const TeacherCollaboration = require('./teacherCollaborationModel');
    
    let savedData = [];
    let totalCount = 0;
    
    console.log('[COLLABORATION SERVICE] Fetching collaborations for admin with filters:', { userType, isApproved, search });
    
    // If userType filter is applied, fetch from appropriate model only
    if (userType === 'USER') {
      // Only fetch from student collaborations
      console.log('[COLLABORATION SERVICE] Fetching USER collaborations only');
      savedData = await model.getAllDocuments(query, { skip, limit });
      totalCount = await model.totalCounts(query);
    } else if (userType === 'TEACHER') {
      // Only fetch from teacher collaborations
      console.log('[COLLABORATION SERVICE] Fetching TEACHER collaborations only');
      const teacherQuery = { isDeleted: false };
      if (search) {
        teacherQuery.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }
      savedData = await TeacherCollaboration.find(teacherQuery)
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean();
      totalCount = await TeacherCollaboration.countDocuments(teacherQuery);
      
      console.log('[COLLABORATION SERVICE] Found', savedData.length, 'teacher collaborations');
      
      // Add metadata for consistency with student collaborations
      savedData = savedData.map(collab => ({
        ...collab,
        userType: 'TEACHER',
        createdByModel: 'Teacher',
        isApproved: true, // Teacher collaborations don't require approval
        isDelete: collab.isDeleted || false
      }));
    } else {
      // No userType filter - fetch from both models and merge
      console.log('[COLLABORATION SERVICE] Fetching from BOTH models');
      const studentQuery = { ...query };
      const teacherQuery = { isDeleted: false };
      if (search) {
        teacherQuery.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }
      
      // Fetch from both models
      const studentCollabs = await model.getAllDocuments(studentQuery, { skip: 0, limit: 1000 });
      const teacherCollabs = await TeacherCollaboration.find(teacherQuery).sort('-createdAt').lean();
      
      console.log('[COLLABORATION SERVICE] Found', studentCollabs.length, 'student collaborations and', teacherCollabs.length, 'teacher collaborations');
      
      // Add metadata to teacher collaborations
      const teacherCollabsWithMeta = teacherCollabs.map(collab => ({
        ...collab,
        userType: 'TEACHER',
        createdByModel: 'Teacher',
        isApproved: true,
        isDelete: collab.isDeleted || false
      }));
      
      // Merge and sort by createdAt
      const allCollabs = [...studentCollabs, ...teacherCollabsWithMeta]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      totalCount = allCollabs.length;
      
      // Apply pagination to merged results
      savedData = allCollabs.slice(skip, skip + limit);
    }

    // Populate user data for each collaboration
    const populatedData = await Promise.all(
      savedData.map(async (collaboration) => {
        if (collaboration.createdBy) {
          const UserModel = collaboration.userType === 'TEACHER' || collaboration.createdByModel === 'Teacher' ? 
            require('../Teachers/teacherModel') : 
            require('../Students/studentModel');
          
          const user = await UserModel.findById(collaboration.createdBy).select('firstName lastName email');
          collaboration.createdBy = user;
        }
        
        if (collaboration.approvedBy) {
          const AdminModel = require('../Admin/adminModel');
          const admin = await AdminModel.findById(collaboration.approvedBy).select('firstName lastName email');
          collaboration.approvedBy = admin;
        }
        
        return collaboration;
      })
    );

    console.log('[COLLABORATION SERVICE] Returning', populatedData.length, 'collaborations to admin');

    return { savedData: populatedData, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) };
  },

  getCollaborationByIdForAdmin: async (collaborationId) => {
    const collaboration = await model.getDocumentById({ _id: collaborationId, isDelete: false });
    
    if (collaboration) {
      // Populate createdBy based on the user type
      if (collaboration.createdBy) {
        const UserModel = collaboration.userType === 'TEACHER' ? 
          require('../Teachers/teacherModel') : 
          require('../Students/studentModel');
        
        const user = await UserModel.findById(collaboration.createdBy).select('firstName lastName email');
        collaboration.createdBy = user;
      }
      
      // Populate approvedBy if exists
      if (collaboration.approvedBy) {
        const AdminModel = require('../Admin/adminModel');
        const admin = await AdminModel.findById(collaboration.approvedBy).select('firstName lastName email');
        collaboration.approvedBy = admin;
      }
    }
    
    return collaboration;
  },

  approveCollaboration: async (collaborationId, adminId) => {
    return await model.updateDocument(
      { _id: collaborationId },
      { 
        isApproved: true, 
        approvedAt: new Date(),
        approvedBy: adminId,
        rejectionReason: null
      },
      { new: true }
    );
  },

  rejectCollaboration: async (collaborationId, adminId, rejectionReason) => {
    return await model.updateDocument(
      { _id: collaborationId },
      { 
        isApproved: false, 
        approvedAt: null,
        approvedBy: null,
        rejectionReason: rejectionReason
      },
      { new: true }
    );
  },

  getApprovedCollaborations: async (data) => {
    const { page = 1, limit = 10, search } = data;
    const skip = (page - 1) * limit;
    
    let query = { isDelete: false, isApproved: true };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    console.log('[COLLABORATION SERVICE] Fetching approved collaborations for public/website');

    // Fetch from both Collaboration (student) model and TeacherCollaboration model
    const TeacherCollaboration = require('./teacherCollaborationModel');
    
    // Build teacher query (teacher collaborations don't have isApproved field, they're all approved by default)
    const teacherQuery = { isDeleted: false };
    if (search) {
      teacherQuery.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    
    // Fetch from both models
    const studentCollabs = await model.getAllDocuments(query, { skip: 0, limit: 1000 });
    const teacherCollabs = await TeacherCollaboration.find(teacherQuery).sort('-createdAt').lean();
    
    console.log('[COLLABORATION SERVICE] Found', studentCollabs.length, 'approved student collaborations and', teacherCollabs.length, 'teacher collaborations');
    
    // Add metadata to teacher collaborations
    const teacherCollabsWithMeta = teacherCollabs.map(collab => ({
      ...collab,
      userType: 'TEACHER',
      createdByModel: 'Teacher',
      isApproved: true,
      isDelete: collab.isDeleted || false
    }));
    
    // Merge and sort by createdAt
    const allCollabs = [...studentCollabs, ...teacherCollabsWithMeta]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const totalCount = allCollabs.length;
    
    // Apply pagination to merged results
    const savedData = allCollabs.slice(skip, skip + limit);

    // Populate user data for each collaboration
    const populatedData = await Promise.all(
      savedData.map(async (collaboration) => {
        if (collaboration.createdBy) {
          const UserModel = collaboration.userType === 'TEACHER' || collaboration.createdByModel === 'Teacher' ? 
            require('../Teachers/teacherModel') : 
            require('../Students/studentModel');
          
          const user = await UserModel.findById(collaboration.createdBy).select('firstName lastName email');
          collaboration.createdBy = user;
        }
        
        if (collaboration.approvedBy) {
          const AdminModel = require('../Admin/adminModel');
          const admin = await AdminModel.findById(collaboration.approvedBy).select('firstName lastName email');
          collaboration.approvedBy = admin;
        }
        
        return collaboration;
      })
    );

    console.log('[COLLABORATION SERVICE] Returning', populatedData.length, 'approved collaborations for website');

    return { savedData: populatedData, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) };
  },
};

module.exports = collaborationService;
