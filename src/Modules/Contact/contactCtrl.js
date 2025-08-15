const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const contactService = require("./contactService");
const CustomError = require("../../Errors/CustomError");

/**
 * Contact Controller
 * Handles HTTP requests for contact form submissions and management
 */
const contactCtrl = {
  /**
   * Submit a new contact form
   * @route POST /contact/submit
   * @access Public
   */
  submitContact: asyncHandler(async (req, res, next) => {
    try {
      const { name, email, phone, subject, message, category } = req.body;

      // Basic validation
      if (!name || !email || !subject || !message) {
        throw new CustomError(400, "Name, email, subject, and message are required");
      }

      // Get request information
      const requestInfo = {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        pageUrl: req.headers.referer || req.headers.origin,
        referrer: req.headers.referer
      };

      // Create contact
      const contact = await contactService.createContact(
        { name, email, phone, subject, message, category },
        requestInfo
      );

      return successResponse({
        res,
        data: {
          id: contact._id,
          name: contact.name,
          email: contact.email,
          subject: contact.subject,
          status: contact.status
        },
        message: "Contact form submitted successfully. We'll get back to you soon!",
        statusCode: 201
      });
    } catch (error) {
      next(error);
    }
  }),

  /**
   * Get all contacts (Admin only)
   * @route GET /contact
   * @access Private (Admin)
   */
  getAllContacts: asyncHandler(async (req, res, next) => {
    try {
      const result = await contactService.getAllContacts(req.query);

      return successResponse({
        res,
        data: result.data,
        count: result.totalCount,
        msg: `Found ${result.data.length} contacts`
      });
    } catch (error) {
      next(error);
    }
  }),

  /**
   * Get contact by ID (Admin only)
   * @route GET /contact/:id
   * @access Private (Admin)
   */
  getContactById: asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new CustomError(400, "Contact ID is required");
      }

      const contact = await contactService.getContactById(id);

      return successResponse({
        res,
        data: contact,
        message: "Contact details fetched successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  /**
   * Update contact (Admin only)
   * @route PUT /contact/:id
   * @access Private (Admin)
   */
  updateContact: asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const adminId = req.user.id; // From auth middleware

      if (!id) {
        throw new CustomError(400, "Contact ID is required");
      }

      const contact = await contactService.updateContact(id, updateData, adminId);

      return successResponse({
        res,
        data: contact,
        message: "Contact updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  /**
   * Delete contact (Admin only)
   * @route DELETE /contact/:id
   * @access Private (Admin)
   */
  deleteContact: asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new CustomError(400, "Contact ID is required");
      }

      await contactService.deleteContact(id);

      return successResponse({
        res,
        message: "Contact deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  /**
   * Get contact statistics (Admin only)
   * @route GET /contact/stats
   * @access Private (Admin)
   */
  getContactStats: asyncHandler(async (req, res, next) => {
    try {
      const stats = await contactService.getContactStats();

      return successResponse({
        res,
        data: stats,
        message: "Contact statistics fetched successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  /**
   * Get recent contacts (Admin only)
   * @route GET /contact/recent
   * @access Private (Admin)
   */
  getRecentContacts: asyncHandler(async (req, res, next) => {
    try {
      const { limit = 10 } = req.query;
      const contacts = await contactService.getRecentContacts(parseInt(limit));

      return successResponse({
        res,
        data: contacts,
        message: "Recent contacts fetched successfully",
      });
    } catch (error) {
      next(error);
    }
  })
};

module.exports = contactCtrl;
