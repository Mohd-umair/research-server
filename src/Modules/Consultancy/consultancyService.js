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
};

module.exports = consultancyService;
