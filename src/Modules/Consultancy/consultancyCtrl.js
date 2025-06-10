const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const consultancyService = require("./consultancyService");
const consultancymiddleware = require("../../middlewares/validation/consultancyValidationSchema");
const { validationResult } = require("express-validator");

const consultancyCtrl = {
  create: [
    consultancymiddleware,
    asyncHandler(async (req, res, next) => {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        console.log(errors.errors);
        return res.json({ msg: errors.errors }); //collect this in fe like if the msg is an array then that is a error other wise that is correct code
      } else {
        const docData = req.body;
        const response = await consultancyService.create(docData);
        return successResponse({
          res,
          data: response,
          msg: "Consultancy Scheduled",
        });
      }
    }),
  ],

  getConsultancyByTeacherOrAdmin: asyncHandler(async (req, res, next) => {
    const bodyDto = req.body
    const result = await consultancyService.getConsultancyByTeacherOrAdmin(bodyDto);
    return successResponse({ res, data: result });

  }),

  getById: asyncHandler(async (req, res, next) => {
    const docData = req.body;
    const response = await consultancyService.getById(docData);
    return successResponse({ res, data: response, msg: "Card By ID" });
  }),
  getAll: asyncHandler(async (req, res, next) => {
    const docData = req.body;
    const response = await consultancyService.getAll(docData);
    return successResponse({ res, data: response });
  }),
  verifyPayment: asyncHandler(async (req, res, next) => {
    const paymentObj = req.body;
    const response = await consultancyService.verifyPayment(paymentObj);
    return successResponse({
      res,
      data: response,
      msg: "Payment Successfully Done",
    });
  }),

  verifyConsultancy: asyncHandler(async (req, res, next) => {
    const data = req.body;
    const result = await consultancyService.verifyConsultancy(data);
    return successResponse({ res: res, data: result });
  }),


  endConsultancy: asyncHandler(async (req, res, next) => {
    const data = req.body;

    const result = await consultancyService.endConsultancy(data);
    return successResponse({ res: res, data: result });
  }),
  activeOrInactiveConsultancy: asyncHandler(async (req, res, next) => {
    const data = req.body;

    const result = await consultancyService.activeOrInactiveConsultancy(data);
    return successResponse({ res: res, data: result });
  }),
};

module.exports = consultancyCtrl;