const DatabaseService = require("../../Service/DbService");
const serviceHandler = require("../../Utils/serviceHandler");
const Consultancy = require("./ConsultancyModel");
const ConsultancyCardModel = require("../ConsultancyCard/consultancyCardModel");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");

const CustomError = require("../../Errors/CustomError");
const paymentService = require("../Payment/paymentService");
const model = new DatabaseService(Consultancy);
const ConsultancyCard = require("../ConsultancyCard/consultancyCardModel");
const consultancyCardModel = new DatabaseService(ConsultancyCard);
const paymentGatewayInstance = require("../../Utils/paymentGatewayUtil");
const instance = paymentGatewayInstance.getInstance();

const consultancyService = {
  create: serviceHandler(async (data) => {
    const { decodedUser, cardId, type, scheduledDate } = data;
    let consultancy, payment;

    const studentId = decodedUser._id;
    try {
      // if active consultancy for this card exists, then reject the request
      const isActive = await model.getDocument({
        cardId: cardId,
        studentId: studentId,
        isScheduled: true,
        isFinished: false,
      });

      if (isActive?.isScheduled)
        throw new CustomError(400, "Consultancy Is Already Active");
      const consultancyCard = await consultancyCardModel.getDocumentById({
        _id: cardId,
      });
      const { teacherId, pricing } = consultancyCard;

      const amount =
        type.toLowerCase() === "single" ? pricing.single : pricing.project;
      const options = {
        amount: amount * 100,
        currency: "INR",
        receipt: `rec-${uuidv4().slice(0,20)}`,
      };
      const order = await instance.orders.create(options);
      if (order.status) {
        const paymentPayload = {
          studentId,
          amount,
          currency: order.currency,
          razorpayOrderId: order.id,
          transactionType: "hireTeacher",
          referenceModel: "ConsultancyCard",
          referenceId: cardId,
        };
        payment = await paymentService.create(paymentPayload);

        const consultancyPayload = {
          teacherId,
          studentId,
          cardId,
          type,
          scheduledDate,
          paymentId: payment?._id,
        };

        consultancy = await model.save(consultancyPayload);
      }

      return { consultancy, order: order, payment: payment };
    } catch (error) {
      throw error;
    }
  }),
  getConsultancyByTeacherOrAdmin: serviceHandler(async (data) => {
    console.log(data);
    const { decodedUser, expertId } = data;
    let result;
    const query = { isScheduled: true, isFinished: true };
    data.populate = [{ path: "cardId" }, { path: "teacherId" }];
    if (decodedUser.role === "admin") {
      query.teacherId = expertId;
      result = await model.getAllDocuments(query, data);
    } else {
      query.teacherId = decodedUser._id;
      result = await model.getAllDocuments(query, data);
    }
    // grouping data
    function groupBy(array, keyGetter) {
      var grouped = {};
      array.forEach(function (item) {
        var key = keyGetter(item);
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(item);
      });
      return grouped;
    }

    var groupedData = groupBy(result, function (item) {
      return item.cardId._id;
    });

    var groupedEntry = {};
    Object.keys(groupedData).forEach(function (key) {
      var value = groupedData[key];

      groupedEntry[key] = {
        _id: value[0]._id,
        title: value[0].cardId.title,
        sales: value.length,
        price: value.reduce(function (sum, item) {
          return sum + Number(item.cardId.pricing.single);
        }, 0),
        teacherName: value[0].teacherId.name,
      };
    });

    console.log(groupedEntry);
    const arr = Object.keys(groupedData).map((item) => groupedEntry[item]);

    return arr;
  }),

  myConsultancyEarning: serviceHandler(async (data) => {

    const result = await Consultancy.aggregate([
      {
        $match: {
          teacherId:new mongoose.Types.ObjectId( data.createdBy),
          status: "completed",
          paymentId: { $ne: null },
          isScheduled: true,
          isFinished: true,
        },
      },
      {
        $lookup: {
          from: "payments",
          localField: "paymentId",
          foreignField: "_id",
          as: "payment",
        },
      },
      {
        $unwind: "$payment",
      },
      {
        $group: {
          _id: "$teacherId",
          totalEarning: { $sum: "$payment.amount" },
          payableAmount: { $sum: { $multiply: ["$payment.amount", 0.8] } },
        },
      },
    ]);
    console.log("Result", JSON.stringify(result));
    const earnings ={
      totalEarning: result?.[0]?.totalEarning,
      payableAmount: result?.[0]?.payableAmount,
    }
    return earnings
  }),

  getAll: serviceHandler(async (data) => {
    data.populate = [
      { path: "teacherId" },
      { path: "studentId", select: "name" },
      { path: "cardId", select: "title pricing" },
    ];
    return await model.getAllDocuments({}, data);
  }),

  getById: serviceHandler(async (data) => {
    const { consultancyId } = data;
    const query = { _id: consultancyId };
    const populateOptions = [
      { path: "teacherId" },
      { path: "studentId", select: "name" },
      { path: "cardId", select: "title pricing" },
    ];
    return await model.getDocumentById(query, populateOptions);
  }),

  verifyPayment: serviceHandler(async (data) => {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      consultancyId,
    } = data;
    const isSignatureVerified = paymentGatewayInstance.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (isSignatureVerified === false) {
      throw new CustomError(400, "Payment Not Verified");
    }
    const consultancy = await model.getAllDocuments(
      {
        _id: consultancyId,
      },
      { populate: [{ path: "cardId" }] }
    );
    const getConsultancy = consultancy[0];

    console.log(getConsultancy, "Consultancy payment verification");

    const vendorPayload = {
      teacherId: getConsultancy.teacherId,
      amount: getConsultancy.cardId.pricing.single,
      razorpay_payment_id,
      consultancyId,
    };
    // await paymentService.transferToVendor(vendorPayload);
    const promises = [];

    const filter = { _id: consultancyId };
    const updateDocument = {
      isScheduled: true,
      paymentStatus: "paid",
    };
    promises.push(
      model.updateDocument(filter, updateDocument, {
        new: true,
        populate: [
          { path: "studentId" },
          { path: "teacherId" },
          { path: "cardId" },
        ],
      })
    );
    const updatePayment = {
      paymentStatus: "Completed",
      transactionId: razorpay_payment_id,
      paymentId: getConsultancy?.paymentId,
    };
    promises.push(paymentService.updatePayment(updatePayment));
    await Promise.all(promises);
  }),

  verifyConsultancy: serviceHandler(async (data) => {
    const { consultancyCardId, decodedUser } = data;
    let isScheduled = false;

    const getCard = await consultancyCardModel.getDocumentById({
      _id: consultancyCardId,
    });
    if (!getCard) {
      throw new CustomError(400, "Incorrect Card Id");
    }

    const query = {
      teacherId: getCard?.teacherId,
      cardId: consultancyCardId,
      studentId: decodedUser._id,
      status: "inProgress",
      isScheduled: true,
      isFinished: false,
    };

    isScheduled = await model.getAllDocuments(query);
    if (isScheduled.length > 0) {
      return true;
    }

    return false;
  }),

  endConsultancy: serviceHandler(async (data) => {
    const { consultancyCardId, decodedUser } = data;

    const getCard = await consultancyCardModel.getDocumentById({
      _id: consultancyCardId,
    });
    if (!getCard) {
      throw new CustomError(400, "Incorrect Card Id");
    }

    const query = {
      teacherId: getCard?.teacherId,
      cardId: consultancyCardId,
      studentId: decodedUser._id,
      status: "inProgress",
    };

    const updatedDocument = await model.updateDocument(query, {
      status: "completed",
      isFinished: true,
    });
    return updatedDocument;
  }),

  activeOrInactiveConsultancy: serviceHandler(async (data) => {
    const { consultancyCardId, supervisorId, decodedUser } = data;

    const query = {
      teacherId: supervisorId,
      cardId: consultancyCardId,
      studentId: decodedUser._id,
    };

    const consultancy = await model.getDocumentById(query);
    if (!consultancy) {
      throw new Error("No matching document found.");
    }

    if (consultancy.type === "single") {
      return consultancy.status === "inProgress" ? true : false;
    } else if (consultancy.scheduledDate) {
      const currentDate = new Date();
      const scheduledDate = new Date(consultancy.scheduledDate);
      const daysDifference = (currentDate - scheduledDate) / (1000 * 3600 * 24);

      return daysDifference <= 30 ? true : false;
    }
  }),

  checkExistingBooking: serviceHandler(async (data) => {
    const { studentId, consultancyId } = data;
    
    console.log('Checking existing booking with data:', { studentId, consultancyId });
    
    const existingBooking = await model.getDocument({
      studentId: studentId,
      cardId: consultancyId,
      status: { $in: ["pending", "inProgress"] },
      isFinished: false
    });

    console.log('Found existing booking:', existingBooking);

    return {
      hasActiveBooking: !!existingBooking,
      booking: existingBooking
    };
  }),

  getUserBookings: serviceHandler(async (data) => {
    const { studentId, page = 1, limit = 10 } = data;
    
    console.log('Getting user bookings for student:', studentId, 'page:', page, 'limit:', limit);
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get all bookings for the student with populated teacher and consultancy data
    const query = { studentId: studentId };
    const options = { 
      sort: 'createdAt', // Sort by newest first
      limit: parseInt(limit),
      skip: skip
    };
    const populate = [
      {
        path: 'teacherId',
        select: 'name email specialisation institute experience skills degree role'
      },
      {
        path: 'cardId',
        select: 'title description pricing teacherId'
      }
    ];
    
    const bookings = await model.getAllDocuments(query, { ...options, populate });
    
    // Get total count for pagination
    const totalCount = await model.model.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    console.log('Found bookings:', bookings.length);
    console.log('Sample booking data:', JSON.stringify(bookings[0], null, 2));

    // For bookings where teacherId is null, get teacher info from ConsultancyCard
    for (let booking of bookings) {
      console.log('Processing booking:', booking._id, 'teacherId:', booking.teacherId, 'cardId.teacherId:', booking.cardId?.teacherId);
      
      if (!booking.teacherId && booking.cardId && booking.cardId.teacherId) {
        console.log('Fetching teacher info for teacherId:', booking.cardId.teacherId);
        // Get teacher info from the ConsultancyCard's teacherId (Teacher model, not Profile)
        const Teacher = require("../Teachers/teacherModel");
        const teacher = await Teacher.findById(booking.cardId.teacherId);
        console.log('Found teacher:', teacher ? 'Yes' : 'No', teacher?.name);
        if (teacher) {
          booking.teacherId = teacher;
          console.log('Set teacherId for booking:', booking._id);
        }
      }
    }

    return {
      bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }),

  getExpertBookings: serviceHandler(async (data) => {
    const { teacherId, page = 1, limit = 10 } = data;
    
    console.log('Getting expert bookings for teacher:', teacherId, 'page:', page, 'limit:', limit);
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get all bookings for the expert with populated student and consultancy data
    const query = { teacherId: teacherId };
    const options = { 
      sort: 'createdAt', // Sort by newest first
      limit: parseInt(limit),
      skip: skip
    };
    // First get the bookings without populate
    const bookings = await model.getAllDocuments(query, options);
    
    // Then manually populate the student and card data
    const Student = require("../Students/studentModel");
    const ConsultancyCard = require("../ConsultancyCard/consultancyCardModel");
    
    for (let booking of bookings) {
      if (booking.studentId) {
        const student = await Student.findById(booking.studentId).select('firstName lastName email');
        booking.studentId = student;
      }
      if (booking.cardId) {
        const card = await ConsultancyCard.findById(booking.cardId).select('title description pricing teacherId');
        booking.cardId = card;
      }
    }
    
    // Get total count for pagination
    const totalCount = await model.model.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    console.log('Found expert bookings:', bookings.length);
    if (bookings.length > 0) {
      console.log('Sample expert booking data:', JSON.stringify(bookings[0], null, 2));
      console.log('Student data in booking:', bookings[0].studentId);
      console.log('Student firstName:', bookings[0].studentId?.firstName);
      console.log('Student lastName:', bookings[0].studentId?.lastName);
      console.log('Student email:', bookings[0].studentId?.email);
    }

    return {
      bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit),
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }),

  acceptConsultancy: serviceHandler(async (data) => {
    const { consultancyId, decodedUser } = data;
    
    console.log('Accepting consultancy:', consultancyId, 'by teacher:', decodedUser._id);
    
    // Find the consultancy and verify the teacher owns it
    const consultancy = await model.getDocumentById({ _id: consultancyId });
    if (!consultancy) {
      throw new CustomError(404, "Consultancy not found");
    }
    
    // Verify the teacher is the owner of this consultancy
    if (consultancy.teacherId.toString() !== decodedUser._id.toString()) {
      throw new CustomError(403, "You can only accept your own consultancy bookings");
    }
    
    // Check if consultancy is in pending status
    if (consultancy.status !== 'pending') {
      throw new CustomError(400, "Only pending consultancies can be accepted");
    }
    
    // Update the consultancy status to inProgress
    const updatedConsultancy = await model.updateDocument(
      { _id: consultancyId },
      { 
        status: 'inProgress',
        isScheduled: true
      },
      {
        new: true,
        populate: [
          { path: "studentId", select: "firstName lastName email" },
          { path: "teacherId", select: "name email" },
          { path: "cardId", select: "title description pricing" }
        ]
      }
    );
    
    console.log('Consultancy accepted successfully:', updatedConsultancy);
    
    return {
      consultancy: updatedConsultancy,
      message: "Consultancy accepted successfully"
    };
  }),

  rejectConsultancy: serviceHandler(async (data) => {
    const { consultancyId, decodedUser } = data;
    
    console.log('Rejecting consultancy:', consultancyId, 'by teacher:', decodedUser._id);
    
    // Find the consultancy and verify the teacher owns it
    const consultancy = await model.getDocumentById({ _id: consultancyId });
    if (!consultancy) {
      throw new CustomError(404, "Consultancy not found");
    }
    
    // Verify the teacher is the owner of this consultancy
    if (consultancy.teacherId.toString() !== decodedUser._id.toString()) {
      throw new CustomError(403, "You can only reject your own consultancy bookings");
    }
    
    // Check if consultancy is in pending status
    if (consultancy.status !== 'pending') {
      throw new CustomError(400, "Only pending consultancies can be rejected");
    }
    
    // Update the consultancy status to rejected
    const updatedConsultancy = await model.updateDocument(
      { _id: consultancyId },
      { 
        status: 'rejected',
        isScheduled: false
      },
      {
        new: true,
        populate: [
          { path: "studentId", select: "firstName lastName email" },
          { path: "teacherId", select: "name email" },
          { path: "cardId", select: "title description pricing" }
        ]
      }
    );
    
    console.log('Consultancy rejected successfully:', updatedConsultancy);
    
    return {
      consultancy: updatedConsultancy,
      message: "Consultancy rejected successfully"
    };
  }),

  requestPayment: serviceHandler(async (data) => {
    const { consultancyId, amount, consultancyTitle, studentName, decodedUser } = data;
    
    console.log('Requesting payment for consultancy:', consultancyId, 'by teacher:', decodedUser._id);
    
    // Find the consultancy and verify the teacher owns it
    const consultancy = await model.getDocumentById({ 
      _id: consultancyId 
    }, [
      { path: "studentId", select: "_id firstName lastName" }
    ]);
    
    if (!consultancy) {
      throw new CustomError(404, "Consultancy not found");
    }
    
    // Verify the teacher is the owner of this consultancy
    if (consultancy.teacherId.toString() !== decodedUser._id.toString()) {
      throw new CustomError(403, "You can only request payment for your own consultancies");
    }
    
    // Check if consultancy is completed
    if (consultancy.status !== 'completed') {
      throw new CustomError(400, "Only completed consultancies are eligible for payment requests");
    }
    
    // Create payment request in database
    const paymentRequestService = require("../PaymentRequests/paymentRequestService");
    
    const paymentRequestData = {
      consultancyId,
      teacherId: decodedUser._id,
      studentId: consultancy.studentId._id,
      amount: parseFloat(amount),
      consultancyTitle,
      studentName
    };
    
    const paymentRequest = await paymentRequestService.create(paymentRequestData);
    
    console.log('Payment request created in database:', paymentRequest);
    
    return {
      message: "Payment request submitted successfully",
      paymentRequest
    };
  }),

  completeSession: serviceHandler(async (bookingId, decodedUser) => {
    console.log('Completing session for booking:', bookingId, 'by user:', decodedUser._id);
    
    // Find the booking
    const booking = await model.getDocumentById({ _id: bookingId });
    if (!booking) {
      throw new CustomError(404, "Booking not found");
    }
    
    // Check if booking is in inProgress status
    if (booking.status !== 'inProgress') {
      throw new CustomError(400, "Only active sessions can be completed");
    }
    
    // Update the booking status to completed
    const updatedBooking = await model.updateDocument(
      { _id: bookingId },
      { 
        status: 'completed',
        isFinished: true,
        completedAt: new Date()
      },
      {
        new: true,
        populate: [
          { path: "studentId", select: "firstName lastName email" },
          { path: "cardId", select: "title description pricing teacherId" }
        ]
      }
    );
    
    console.log('Session completed successfully:', updatedBooking);
    
    return {
      booking: updatedBooking,
      message: "Session completed successfully"
    };
  }),
};

module.exports = consultancyService;
