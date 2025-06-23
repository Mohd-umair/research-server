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
    const { amount, currency, teacherId, consultancyType } = req.body;

    if (!amount || !teacherId) {
      throw new CustomError(400, "Amount and teacher ID are required");
    }

    const orderData = {
      amount,
      currency: currency || 'INR',
      teacherId,
      consultancyType: consultancyType || 'hourly_consultation'
    };

    const order = await paymentService.createConsultancyOrder(orderData);

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
      amount 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new CustomError(400, "Payment verification details are required");
    }

    const verificationData = {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      teacherId,
      amount
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