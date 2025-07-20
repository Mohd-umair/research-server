const CustomError = require("../../Errors/CustomError");
const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const paymentService = require("./paymentService");

const paymentCtrl = {
  create: asyncHandler(async (req, res, next) => {
    const {verificationPayload} = req.body;

    console.log("in payment",req.body);

    const payment = await paymentService.create(req.body);

    return successResponse({
      res: res,
      data: payment,
      msg: "payment created Successfully",
    });
  }),

  getPaymentHistory: asyncHandler(async (req, res, next) => {
    const bodyDto = req.body
    const result = await paymentService.getPaymentHistory(bodyDto);
    return successResponse({
      res: res,
      data: result,
      msg: "Payment history fetched successfully",
    });

  }),

  // New method for creating consultancy Razorpay order
  createConsultancyOrder: asyncHandler(async (req, res, next) => {
    console.log("=== CREATE CONSULTANCY ORDER DEBUG ===");
    console.log("Request body:", req.body);
    console.log("Request headers:", req.headers);
    console.log("User from token:", req.decodedUser);

    const { amount, currency, teacherId, consultancyId, studentId, sessionType } = req.body;

    console.log("Extracted data:", {
      amount,
      currency,
      teacherId,
      consultancyId,
      studentId,
      sessionType
    });

    if (!amount || !teacherId || !consultancyId) {
      console.log("Missing required fields");
      throw new CustomError(400, "Amount, teacher ID, and consultancy ID are required");
    }

    const orderData = {
      amount,
      currency: currency || 'INR',
      teacherId,
      consultancyId,
      studentId,
      sessionType: sessionType || 'single',
      consultancyType: sessionType === 'project' ? 'project_consultation' : 'hourly_consultation'
    };

    console.log("Order data to service:", orderData);

    const order = await paymentService.createConsultancyOrder(orderData);

    console.log("Order created successfully:", order);

    return successResponse({
      res: res,
      data: order,
      msg: "Razorpay order created successfully",
    });
  }),

  // New method for verifying consultancy payment
  verifyConsultancyPayment: asyncHandler(async (req, res, next) => {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      teacherId, 
      consultancyId,
      studentId,
      amount,
      sessionType
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new CustomError(400, "Payment verification details are required");
    }

    const verificationData = {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      teacherId,
      consultancyId,
      studentId,
      amount,
      sessionType: sessionType || 'single'
    };

    const verificationResult = await paymentService.verifyConsultancyPayment(verificationData);

    return successResponse({
      res: res,
      data: verificationResult,
      msg: "Payment verified and booking created successfully",
    });
  })

}

module.exports = paymentCtrl;