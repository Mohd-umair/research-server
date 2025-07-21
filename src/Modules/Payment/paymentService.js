const DatabaseService = require("../../Service/DbService");
const serviceHandler = require("../../Utils/serviceHandler");
const PaymentModel = require("./paymentModel");
const teacherModel = require("../Profiles/profileModel");
const model = new DatabaseService(PaymentModel);
const teacher = new DatabaseService(teacherModel);
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Import earnings service for creating earnings transactions
const earningsService = require("../Earnings/earningsService");

const paymentGatewayInstance = require("../../Utils/paymentGatewayUtil");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

// Helper function to create earnings transaction when payment is completed
const createEarningsFromPayment = async (paymentData) => {
  try {
    // Only create earnings for payments that involve teachers
    if (!paymentData.teacherId) {
      return null;
    }

    // Calculate platform fee (you can adjust this percentage)
    const platformFeePercentage = 0.10; // 10% platform fee
    const platformFee = paymentData.amount * platformFeePercentage;
    const netAmount = paymentData.amount - platformFee;

    // Determine earnings type based on transaction type
    let earningsType = 'other';
    if (paymentData.transactionType === 'consultancy_booking') {
      earningsType = 'consultancy';
    } else if (paymentData.transactionType === 'hireTeacher') {
      earningsType = 'collaboration';
    }

    // Create earnings transaction data
    const earningsData = {
      expertId: paymentData.teacherId,
      consultancyId: paymentData.consultancyId || null,
      collaborationId: paymentData.collaborationId || null,
      paymentId: paymentData._id,
      amount: paymentData.amount,
      currency: paymentData.currency || 'INR',
      status: 'pending', // Initial status
      type: earningsType,
      description: `Payment for ${earningsType} - ${paymentData.transactionType}`,
      paymentDate: new Date(),
      platformFee: platformFee,
      netAmount: netAmount
    };

    // Create the earnings transaction
    const earningsTransaction = await earningsService.createEarningsTransaction(earningsData);
    console.log('Earnings transaction created:', earningsTransaction._id);
    
    return earningsTransaction;
  } catch (error) {
    console.error('Error creating earnings transaction:', error);
    // Don't throw error to avoid breaking payment flow
    return null;
  }
};

const paymentService = {
  create: serviceHandler(async (data) => {
    console.log("Payment Service: Init Creating payment ");
    try {
      const {
        studentId,
        amount,
        currency,
        razorpayOrderId,
        transactionType,
        referenceModel,
        referenceId,
      } = data;

      const paymentSaved = await model.save({
        studentId: studentId,
        amount,
        currency,
        transactionType,
        referenceModel,
        referenceId,
        razorpayOrderId,
        transactionId: "",
      });
      if (!paymentSaved) {
        throw new Error("Payment not saved.");
      }

      console.log("Payment Service: END Saving payment for Admin ");

      return paymentSaved;
    } catch (error) {
      throw new Error(error);
    }
  }),

  // New method for creating consultancy Razorpay order
  createConsultancyOrder: serviceHandler(async (data) => {
    console.log("Payment Service: Creating consultancy Razorpay order");
    console.log("Payment Service: Received data:", data);
    try {
      const { amount, currency, teacherId, consultancyId, studentId, sessionType, consultancyType } = data;

      // Convert amount from rupees to paise (Razorpay expects amount in paise)
      const amountInPaise = Math.round(amount * 100);

      console.log("Payment Service: Amount conversion:", {
        originalAmount: amount,
        amountInPaise: amountInPaise,
        currency: currency
      });

      // Create Razorpay order
      const orderOptions = {
        amount: amountInPaise, // Convert to paise for Razorpay
        currency: currency,
        receipt: `c_${teacherId.slice(-6)}_${Date.now()}`,
        notes: {
          teacherId: teacherId,
          consultancyId: consultancyId,
          studentId: studentId,
          sessionType: sessionType,
          consultancyType: consultancyType,
          orderType: 'consultancy_booking'
        }
      };

      console.log("Payment Service: Razorpay order options:", orderOptions);

      const razorpayOrder = await razorpayInstance.orders.create(orderOptions);
      
      if (!razorpayOrder) {
        throw new Error("Failed to create Razorpay order");
      }

      console.log("Payment Service: Razorpay order created successfully", razorpayOrder.id);

      return {
        id: razorpayOrder.id,
        amount: amountInPaise, // Return amount in paise for frontend Razorpay initialization
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        status: razorpayOrder.status
      };
    } catch (error) {
      console.error("Payment Service: Error creating consultancy order:", error);
      throw new Error(`Failed to create consultancy order: ${error.message}`);
    }
  }),

  // Updated payment verification to include earnings creation
  verifyPayment: serviceHandler(async (data) => {
    console.log("Payment Service: Verifying payment");
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

      // Verify signature
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        throw new Error("Invalid signature");
      }

      // Find and update payment
      const payment = await PaymentModel.findOne({ razorpayOrderId: razorpay_order_id });
      if (!payment) {
        throw new Error("Payment not found");
      }

      // Update payment status
      payment.paymentStatus = "Completed";
      payment.transactionId = razorpay_payment_id;
      await payment.save();

      // Create earnings transaction if this payment involves a teacher
      if (payment.teacherId) {
        await createEarningsFromPayment(payment);
      }

      console.log("Payment Service: Payment verified and earnings created");
      return payment;
    } catch (error) {
      console.error("Payment Service: Error verifying payment:", error);
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }),

  transferToVendor: serviceHandler(async (data) => {
    try {
      console.log("START: Transfer To Vendor INIT");
      try {
        // await razorpayInstance.transfers.create(transferPayload);
        paymentGatewayInstance.payoutToVendor(data);
        console.log("END: PAYMENT TRANSFER TO VENDOR")

      } catch (error) {
        console.log(error)

        throw new Error("Razorpay error")
      }

      // const transferToVendor = await razorpayInstance.payments.transfer(
      //   razorpay_payment_id,
      //   {
      //     transfers: [
      //       {
      //         account: findTeacher.razorPayID,
      //         amount: transferAmount * 100,
      //         currency: "INR",
      //         notes: {
      //           transferType: "vendor",
      //         },
      //       },
      //     ],
      //   }
      // );
    } catch (error) {
      console.error(error);
      throw new Error("Transfer to vendor error", error);
    }
  }),

  getPaymentHistory: serviceHandler(async (data) => {
    const { decodedUser } = data;
    const query = {
      studentId: decodedUser._id,
      transactionId: { $ne: "" },
    };
    data.populate = [{ path: "referenceId" }];
    return await model.getAllDocuments(query, data);
  }),

  getById: serviceHandler(async (data) => {
    const { paymentId } = data;
    const payment = await model.getDocumentById({ _id: paymentId });
    return payment;
  }),

  updatePayment: serviceHandler(async (data) => {
    const { paymentId } = data;
    const filter = { _id: paymentId };
    const updateDoc = { ...data };
    const updatedPayment = await model.updateDocument(filter, updateDoc);
    return updatedPayment;
  }),
};

module.exports = paymentService;
