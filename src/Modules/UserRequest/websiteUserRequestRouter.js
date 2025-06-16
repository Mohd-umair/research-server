const express = require("express");
const websiteUserRequestCtrl = require("./websiteUserRequestCtrl");
const websiteUserRequestRouter = express.Router();

/**
 * Website User Request Routes
 * Public API endpoints for the website frontend
 * Base path: /user-request/website
 */

// ===== PUBLIC WEBSITE ROUTES (No Authentication Required) =====

/**
 * @route   GET /user-request/website/research
 * @desc    Get all unfulfilled user requests for research page
 * @access  Public
 * @params  Query parameters: page, limit, search, type, priority, sortBy, sortOrder
 */
websiteUserRequestRouter.get("/research", websiteUserRequestCtrl.getResearchRequests);

/**
 * @route   GET /user-request/website/stats
 * @desc    Get request statistics for website dashboard
 * @access  Public
 */
websiteUserRequestRouter.get("/stats", websiteUserRequestCtrl.getRequestStats);

/**
 * @route   GET /user-request/website/:id
 * @desc    Get specific request details for public view
 * @access  Public
 */
websiteUserRequestRouter.get("/:id", websiteUserRequestCtrl.getRequestById);

module.exports = { websiteUserRequestRouter }; 