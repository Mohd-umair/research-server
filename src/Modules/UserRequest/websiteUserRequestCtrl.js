const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const userRequestService = require("./userRequestService");
const CustomError = require("../../Errors/CustomError");

/**
 * Website User Request Controller
 * Handles public API endpoints for the website frontend
 * These endpoints don't require authentication and are optimized for public consumption
 */
const websiteUserRequestCtrl = {
  
  /**
   * Get all unfulfilled user requests for website research page
   * @route GET /user-request/website/research
   * @access Public
   * @param {Object} req.query - Query parameters for filtering and pagination
   * @param {number} req.query.page - Page number (default: 1)
   * @param {number} req.query.limit - Items per page (default: 20)
   * @param {string} req.query.search - Search term
   * @param {string} req.query.type - Filter by request type (Lab, Document, Data)
   * @param {string} req.query.priority - Filter by priority (Low, Medium, High)
   * @param {string} req.query.sortBy - Sort field (default: createdAt)
   * @param {string} req.query.sortOrder - Sort order (asc/desc, default: desc)
   */
  getResearchRequests: asyncHandler(async (req, res, next) => {
    try {
      const queryParams = {
        ...req.query,
        // Ensure reasonable limits for public API
        limit: Math.min(parseInt(req.query.limit) || 20, 50), // Max 50 items per page
        page: Math.max(parseInt(req.query.page) || 1, 1) // Min page 1
      };
      
      const result = await userRequestService.getAllUnfulfilledRequestsForWebsite(queryParams);

      return successResponse({
        res,
        data: result.data,
        meta: {
          totalCount: result.totalCount,
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
          itemsPerPage: queryParams.limit
        },
        message: `Found ${result.data.length} unfulfilled research requests`,
      });
    } catch (error) {
      next(error);
    }
  }),

  /**
   * Get request statistics for website dashboard
   * @route GET /user-request/website/stats
   * @access Public
   */
  getRequestStats: asyncHandler(async (req, res, next) => {
    try {
      // Get basic statistics for public display
      const stats = await userRequestService.getPublicRequestStatistics();

      return successResponse({
        res,
        data: stats,
        message: "Request statistics fetched successfully",
      });
    } catch (error) {
      next(error);
    }
  }),

  /**
   * Get request by ID for public view (limited information)
   * @route GET /user-request/website/:id
   * @access Public
   */
  getRequestById: asyncHandler(async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new CustomError(400, "Request ID is required");
      }

      const request = await userRequestService.getPublicRequestById(id);

      return successResponse({
        res,
        data: request,
        message: "Request details fetched successfully",
      });
    } catch (error) {
      next(error);
    }
  })
};

module.exports = websiteUserRequestCtrl; 