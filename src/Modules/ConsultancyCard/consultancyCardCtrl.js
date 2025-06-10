const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const consultancyCardService = require("./consultancyCardService");
const { validationResult } = require("express-validator");
const consultancyCardmiddleware = require("../../middlewares/validation/consultancycardvalidationschema");

const consultancyCardCtrl = {
  create: [
    consultancyCardmiddleware,
    asyncHandler(async (req, res, next) => {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        console.log(errors.errors);
        
        return res
          .status(400)
          .json({ msg: errors.errors });
      } else {
        const docDto = req.body;
        const savedDoc = await consultancyCardService.create(docDto);
        return successResponse({ res, data: savedDoc, msg: "New Card Added" });
      }
    }),
  ],

  getById: asyncHandler(async (req, res, next) => {
    const docData = req.body;
    const response = await consultancyCardService.getById(docData);
    return successResponse({ res, data: response, msg: "Card By ID" });
  }),

  getAll: asyncHandler(async (req, res, next) => {
    const docData = req.body;
    const response = await consultancyCardService.getAll(docData);
    return successResponse({ 
      res, 
      data: response.data, 
      count: response.totalCount,
      msg: "Consultancy Cards Retrieved",
      pagination: {
        currentPage: response.currentPage,
        totalPages: response.totalPages,
        totalCount: response.totalCount,
        hasNextPage: response.hasNextPage,
        hasPrevPage: response.hasPrevPage
      }
    });
  }),

  getUserConsultancyCard: asyncHandler(async (req, res, next) => {
    const teacherId = req.body.decodedUser._id; // Assuming user ID is stored in req.user
    console.log(teacherId);

    const response = await consultancyCardService.getUserConsultancyCard(
      teacherId
    );
    return successResponse({
      res,
      data: response,
      msg: "User Consultancy Cards",
    });
  }),

  update: asyncHandler(async (req, res, next) => {
    const docDto = req.body;
    const updatedDoc = await consultancyCardService.update(docDto);
    return successResponse({ res, data: updatedDoc, msg: "Card Updated" });
  }),

  delete: asyncHandler(async (req, res, next) => {
    const docData = req.body;
    await consultancyCardService.delete(docData);
    return successResponse({ res, msg: "Card Deleted" });
  }),
};

module.exports = consultancyCardCtrl;
