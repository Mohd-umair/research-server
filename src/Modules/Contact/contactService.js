const Contact = require("./contactModel");
const CustomError = require("../../Errors/CustomError");

/**
 * Contact Service
 * Handles business logic for contact form submissions and management
 */
const contactService = {
  /**
   * Create a new contact form submission
   * @param {Object} contactData - Contact form data
   * @param {Object} requestInfo - Request information (IP, user agent, etc.)
   * @returns {Object} Created contact
   */
  createContact: async (contactData, requestInfo = {}) => {
    try {
      // Extract request information
      const { ipAddress, userAgent, pageUrl, referrer } = requestInfo;
      
      // Prepare contact data with metadata
      const contact = new Contact({
        ...contactData,
        ipAddress,
        userAgent,
        metadata: {
          pageUrl,
          referrer,
          userType: contactData.userType || "Guest"
        }
      });

      const savedContact = await contact.save();
      return savedContact;
    } catch (error) {
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        throw new CustomError(400, `Validation failed: ${validationErrors.join(', ')}`);
      }
      throw error;
    }
  },

  /**
   * Get all contacts with pagination and filtering
   * @param {Object} queryParams - Query parameters
   * @returns {Object} Paginated contacts
   */
  getAllContacts: async (queryParams = {}) => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        category,
        priority,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = queryParams;

      // Build filter query
      const filter = { isDeleted: false };
      
      if (status) filter.status = status;
      if (category) filter.category = category;
      if (priority) filter.priority = priority;
      
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { subject: { $regex: search, $options: 'i' } },
          { message: { $regex: search, $options: 'i' } }
        ];
      }

      // Calculate pagination
      const skip = (page - 1) * limit;
      
      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute queries
      const [contacts, totalCount] = await Promise.all([
        Contact.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .populate('adminResponse.respondedBy', 'name email')
          .lean(),
        Contact.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      return {
        data: contacts,
        totalCount,
        currentPage: parseInt(page),
        totalPages,
        hasNextPage,
        hasPrevPage,
        itemsPerPage: parseInt(limit)
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get contact by ID
   * @param {string} contactId - Contact ID
   * @returns {Object} Contact details
   */
  getContactById: async (contactId) => {
    try {
      const contact = await Contact.findById(contactId)
        .populate('adminResponse.respondedBy', 'name email')
        .lean();

      if (!contact || contact.isDeleted) {
        throw new CustomError(404, "Contact not found");
      }

      return contact;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update contact status and add admin response
   * @param {string} contactId - Contact ID
   * @param {Object} updateData - Update data
   * @param {string} adminId - Admin ID
   * @returns {Object} Updated contact
   */
  updateContact: async (contactId, updateData, adminId) => {
    try {
      const contact = await Contact.findById(contactId);
      
      if (!contact || contact.isDeleted) {
        throw new CustomError(404, "Contact not found");
      }

      // Update basic fields
      if (updateData.status) contact.status = updateData.status;
      if (updateData.priority) contact.priority = updateData.priority;
      if (updateData.category) contact.category = updateData.category;

      // Update admin response if provided
      if (updateData.adminResponse) {
        contact.adminResponse = {
          respondedBy: adminId,
          responseMessage: updateData.adminResponse.message,
          responseDate: new Date(),
          isPublic: updateData.adminResponse.isPublic || false
        };
      }

      const updatedContact = await contact.save();
      return updatedContact;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete contact (soft delete)
   * @param {string} contactId - Contact ID
   * @returns {Object} Deleted contact
   */
  deleteContact: async (contactId) => {
    try {
      const contact = await Contact.findById(contactId);
      
      if (!contact || contact.isDeleted) {
        throw new CustomError(404, "Contact not found");
      }

      contact.isDeleted = true;
      const deletedContact = await contact.save();
      return deletedContact;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get contact statistics
   * @returns {Object} Contact statistics
   */
  getContactStats: async () => {
    try {
      const stats = await Contact.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            new: {
              $sum: { $cond: [{ $eq: ["$status", "New"] }, 1, 0] }
            },
            inProgress: {
              $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] }
            },
            resolved: {
              $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] }
            },
            closed: {
              $sum: { $cond: [{ $eq: ["$status", "Closed"] }, 1, 0] }
            },
            urgent: {
              $sum: { $cond: [{ $eq: ["$priority", "Urgent"] }, 1, 0] }
            },
            high: {
              $sum: { $cond: [{ $eq: ["$priority", "High"] }, 1, 0] }
            }
          }
        }
      ]);

      const categoryStats = await Contact.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayStats = await Contact.countDocuments({
        createdAt: { $gte: today },
        isDeleted: false
      });

      return {
        total: stats[0]?.total || 0,
        new: stats[0]?.new || 0,
        inProgress: stats[0]?.inProgress || 0,
        resolved: stats[0]?.resolved || 0,
        closed: stats[0]?.closed || 0,
        urgent: stats[0]?.urgent || 0,
        high: stats[0]?.high || 0,
        today: todayStats,
        categories: categoryStats
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get recent contacts for dashboard
   * @param {number} limit - Number of contacts to return
   * @returns {Array} Recent contacts
   */
  getRecentContacts: async (limit = 10) => {
    try {
      const contacts = await Contact.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('name email subject category status priority createdAt')
        .lean();

      return contacts;
    } catch (error) {
      throw error;
    }
  }
};

module.exports = contactService;
