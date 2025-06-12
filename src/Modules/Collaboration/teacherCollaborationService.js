const TeacherCollaboration = require("./teacherCollaborationModel");
const CustomError = require("../../Errors/CustomError");

const teacherCollaborationService = {
  // Create a new teacher collaboration
  createTeacherCollaboration: async (collaborationData) => {
    try {
      const newCollaboration = new TeacherCollaboration(collaborationData);
      const savedCollaboration = await newCollaboration.save();
      return await TeacherCollaboration.findById(savedCollaboration._id)
        .populate('createdBy', 'firstName lastName email')
        .exec();
    } catch (error) {
      throw new CustomError(500, "Error creating teacher collaboration: " + error.message);
    }
  },

  // Get all teacher collaborations with filtering and pagination
  getAllTeacherCollaborations: async (queryParams = {}) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        createdBy,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        isActive,
        userRole
      } = queryParams;

      // Ensure createdBy is provided for user filtering
      if (!createdBy) {
        throw new Error("User ID (createdBy) is required for filtering teacher collaborations");
      }

      const filter = { 
        isDeleted: false,
        createdBy: createdBy // Filter by current user - only show their own collaborations
      };

      console.log('TeacherCollaboration filter:', filter);

      if (isActive !== undefined) {
        filter.isActive = isActive;
      }

      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (page - 1) * limit;

      const [savedData, totalCount] = await Promise.all([
        TeacherCollaboration.find(filter)
          .populate('createdBy', 'firstName lastName email department')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .exec(),
        TeacherCollaboration.countDocuments(filter)
      ]);

      console.log(`Found ${savedData.length} teacher collaborations for user ${createdBy}`);

      return {
        savedData,
        totalCount,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1
      };
    } catch (error) {
      throw new CustomError(500, "Error fetching teacher collaborations: " + error.message);
    }
  },

  // Get teacher collaboration by ID
  getTeacherCollaborationById: async (collaborationId) => {
    try {
      const collaboration = await TeacherCollaboration.findOne({
        _id: collaborationId,
        isDeleted: false
      })
      .populate('createdBy', 'firstName lastName email department')
      .exec();

      if (!collaboration) {
        throw new CustomError(404, "Teacher collaboration not found");
      }

      return collaboration;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, "Error fetching teacher collaboration: " + error.message);
    }
  },

  // Update teacher collaboration
  updateTeacherCollaboration: async (collaborationId, updateData) => {
    try {
      // Remove fields that shouldn't be updated directly
      const { _id, createdBy, createdAt, updatedAt, ...validUpdateData } = updateData;

      const updatedCollaboration = await TeacherCollaboration.findOneAndUpdate(
        { _id: collaborationId, isDeleted: false },
        validUpdateData,
        { new: true, runValidators: true }
      )
      .populate('createdBy', 'firstName lastName email department')
      .exec();

      if (!updatedCollaboration) {
        throw new CustomError(404, "Teacher collaboration not found");
      }

      return updatedCollaboration;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, "Error updating teacher collaboration: " + error.message);
    }
  },

  // Soft delete teacher collaboration
  deleteTeacherCollaboration: async (collaborationId) => {
    try {
      const deletedCollaboration = await TeacherCollaboration.findOneAndUpdate(
        { _id: collaborationId, isDeleted: false },
        { 
          isDeleted: true, 
          isActive: false,
          deletedAt: new Date()
        },
        { new: true }
      ).exec();

      if (!deletedCollaboration) {
        throw new CustomError(404, "Teacher collaboration not found");
      }

      return deletedCollaboration;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, "Error deleting teacher collaboration: " + error.message);
    }
  },

  // Update collaboration status (isActive)
  updateCollaborationStatus: async (collaborationId, isActive) => {
    try {
      const updatedCollaboration = await TeacherCollaboration.findOneAndUpdate(
        { _id: collaborationId, isDeleted: false },
        { isActive },
        { new: true, runValidators: true }
      )
      .populate('createdBy', 'firstName lastName email')
      .exec();

      if (!updatedCollaboration) {
        throw new CustomError(404, "Teacher collaboration not found");
      }

      return updatedCollaboration;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, "Error updating collaboration status: " + error.message);
    }
  },

  // Get collaborations by teacher ID
  getCollaborationsByTeacherId: async (teacherId) => {
    try {
      const collaborations = await TeacherCollaboration.find({
        createdBy: teacherId,
        isDeleted: false
      })
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();

      return collaborations;
    } catch (error) {
      throw new CustomError(500, "Error fetching teacher's collaborations: " + error.message);
    }
  },

  // Search teacher collaborations
  searchTeacherCollaborations: async (searchQuery) => {
    try {
      const collaborations = await TeacherCollaboration.find({
        isDeleted: false,
        isActive: true,
        $or: [
          { title: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } }
        ]
      })
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();

      return collaborations;
    } catch (error) {
      throw new CustomError(500, "Error searching teacher collaborations: " + error.message);
    }
  },

  // Get collaboration statistics
  getCollaborationStatistics: async (teacherId = null) => {
    try {
      const matchStage = { isDeleted: false };
      if (teacherId) {
        matchStage.createdBy = teacherId;
      }

      const stats = await TeacherCollaboration.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalCollaborations: { $sum: 1 },
            activeCollaborations: {
              $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] }
            },
            inactiveCollaborations: {
              $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] }
            }
          }
        }
      ]);

      return stats[0] || {
        totalCollaborations: 0,
        activeCollaborations: 0,
        inactiveCollaborations: 0
      };
    } catch (error) {
      throw new CustomError(500, "Error fetching collaboration statistics: " + error.message);
    }
  }
};

module.exports = teacherCollaborationService; 