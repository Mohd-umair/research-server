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

  checkExistingBooking: asyncHandler(async (req, res, next) => {
    const { studentId, consultancyId } = req.query;
    
    console.log('Check existing booking endpoint hit with query:', req.query);
    
    if (!studentId || !consultancyId) {
      console.log('Missing required parameters');
      return res.status(400).json({
        success: false,
        message: "Student ID and Consultancy ID are required"
      });
    }

    const result = await consultancyService.checkExistingBooking({ studentId, consultancyId });
    console.log('Check existing booking result:', result);
    
    return successResponse({ 
      res: res, 
      data: result,
      msg: "Booking check completed"
    });
  }),

  getUserBookings: asyncHandler(async (req, res, next) => {
    const { studentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    console.log('Get user bookings endpoint hit for student:', studentId, 'page:', page, 'limit:', limit);
    
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required"
      });
    }

    const result = await consultancyService.getUserBookings({ 
      studentId, 
      page: parseInt(page), 
      limit: parseInt(limit) 
    });
    console.log('User bookings result:', result);
    
    return successResponse({ 
      res: res, 
      data: result.bookings,
      count: result.pagination.totalCount,
      pagination: result.pagination,
      msg: "User bookings retrieved successfully"
    });
  }),

  getExpertBookings: asyncHandler(async (req, res, next) => {
    const { teacherId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    console.log('Get expert bookings endpoint hit for teacher:', teacherId, 'page:', page, 'limit:', limit);
    
    if (!teacherId) {
      return res.status(400).json({
        success: false,
        message: "Teacher ID is required"
      });
    }

    const result = await consultancyService.getExpertBookings({ 
      teacherId, 
      page: parseInt(page), 
      limit: parseInt(limit) 
    });
    console.log('Expert bookings result:', result);
    
    return successResponse({ 
      res: res, 
      data: result.bookings,
      count: result.pagination.totalCount,
      pagination: result.pagination,
      msg: "Expert bookings retrieved successfully"
    });
  }),

  acceptConsultancy: asyncHandler(async (req, res, next) => {
    const { consultancyId } = req.params;
    const decodedUser = req.decodedUser; // Use req.decodedUser which has _id
    
    console.log('Accept consultancy endpoint hit for consultancy:', consultancyId, 'by user:', decodedUser._id);
    
    if (!consultancyId) {
      return res.status(400).json({
        success: false,
        message: "Consultancy ID is required"
      });
    }

    const result = await consultancyService.acceptConsultancy({ 
      consultancyId, 
      decodedUser 
    });
    console.log('Accept consultancy result:', result);
    
    return successResponse({ 
      res: res, 
      data: result.consultancy,
      msg: result.message
    });
  }),

  rejectConsultancy: asyncHandler(async (req, res, next) => {
    const { consultancyId } = req.params;
    const decodedUser = req.decodedUser; // Use req.decodedUser which has _id
    
    console.log('Reject consultancy endpoint hit for consultancy:', consultancyId, 'by user:', decodedUser._id);
    
    if (!consultancyId) {
      return res.status(400).json({
        success: false,
        message: "Consultancy ID is required"
      });
    }

    const result = await consultancyService.rejectConsultancy({ 
      consultancyId, 
      decodedUser 
    });
    console.log('Reject consultancy result:', result);
    
    return successResponse({ 
      res: res, 
      data: result.consultancy,
      msg: result.message
    });
  }),

  requestPayment: asyncHandler(async (req, res, next) => {
    const { consultancyId, amount, consultancyTitle, studentName } = req.body;
    const decodedUser = req.decodedUser;
    
    console.log('Request payment endpoint hit for consultancy:', consultancyId, 'by user:', decodedUser._id);
    
    if (!consultancyId) {
      return res.status(400).json({
        success: false,
        message: "Consultancy ID is required"
      });
    }

    const result = await consultancyService.requestPayment({ 
      consultancyId, 
      amount,
      consultancyTitle,
      studentName,
      decodedUser 
    });
    console.log('Request payment result:', result);
    
    return successResponse({ 
      res: res, 
      data: result.paymentRequest,
      msg: result.message
    });
  }),

  completeSession: asyncHandler(async (req, res, next) => {
    const { bookingId } = req.params;
    const decodedUser = req.decodedUser;
    
    console.log(`[CONTROLLER DEBUG] completeSession endpoint hit for booking: ${bookingId} by user: ${decodedUser._id}`);
    console.log(`[CONTROLLER DEBUG] User details:`, decodedUser.firstName, decodedUser.lastName, decodedUser.email);
    
    const result = await consultancyService.completeSession(bookingId, decodedUser);
    console.log(`[CONTROLLER DEBUG] Complete session result:`, result.message);
    
    return successResponse({ 
      res: res, 
      data: result.booking,
      msg: result.message
    });
  }),
};

module.exports = consultancyCtrl;