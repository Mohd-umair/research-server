const DatabaseService = require("../../Service/DbService");
const serviceHandler = require("../../Utils/serviceHandler");
const PaymentModel = require("./paymentModel");
const teacherModel = require("../Profiles/profileModel");
const model = new DatabaseService(PaymentModel);
const teacher = new DatabaseService(teacherModel);
const Razorpay = require("razorpay");
const crypto = require("crypto");


const paymentGatewayInstance = require("../../Utils/paymentGatewayUtil");

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

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
      console.error("Payment Service: Error creating Razorpay order", error);
      console.error("Payment Service: Error details:", {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error
      });
      throw new Error(`Failed to create payment order: ${error.message}`);
    }
  }),

  // New method for verifying consultancy payment
  verifyConsultancyPayment: serviceHandler(async (data) => {
    console.log("Payment Service: Verifying consultancy payment");
    console.log("Payment Service: Received data:", data);
    
    try {
      const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature, 
        teacherId, 
        consultancyId,
        studentId,
        amount,
        sessionType
      } = data;

      console.log("Payment Service: Extracted data:", {
        razorpay_order_id,
        razorpay_payment_id,
        teacherId,
        consultancyId,
        studentId,
        amount,
        sessionType
      });

      // Verify payment signature
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        throw new Error("Payment signature verification failed");
      }

      // Get payment details from Razorpay
      const paymentDetails = await razorpayInstance.payments.fetch(razorpay_payment_id);
      
      if (paymentDetails.status !== 'captured') {
        throw new Error("Payment not captured successfully");
      }

      // Prepare payment record data
      const paymentRecordData = {
        studentId: studentId, // Use the provided studentId or null if not provided
        teacherId: teacherId,
        consultancyId: consultancyId, // Save the consultancy ID
        amount: amount,
        currency: paymentDetails.currency,
        transactionType: 'consultancy_booking',
        referenceModel: 'TeacherProfile',
        referenceId: teacherId,
        razorpayOrderId: razorpay_order_id,
        transactionId: razorpay_payment_id,
        paymentStatus: 'completed',
        paymentMethod: paymentDetails.method,
        consultancyType: sessionType === 'project' ? 'project_consultation' : 'hourly_consultation',
        sessionStatus: 'scheduled',
        paymentDetails: {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          sessionType: sessionType,
          captured_at: paymentDetails.created_at,
          fee: paymentDetails.fee,
          tax: paymentDetails.tax
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log("Payment Service: Saving payment record with data:", paymentRecordData);

      // Save payment record
      const paymentRecord = await model.save(paymentRecordData);

      console.log("Payment Service: Payment verified and saved successfully");
      console.log("Payment Service: Saved record ID:", paymentRecord._id);

      return {
        paymentId: paymentRecord._id,
        transactionId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amount: amount,
        status: 'verified',
        teacherId: teacherId,
        consultancyId: consultancyId,
        studentId: studentId,
        sessionType: sessionType,
        bookingCreated: true
      };
    } catch (error) {
      console.error("Payment Service: Error verifying payment", error);
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
