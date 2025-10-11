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

    return { savedData: populatedData, totalCount, currentPage: page, totalPages: Math.ceil(totalCount / limit) };
  },
};

module.exports = collaborationService;
