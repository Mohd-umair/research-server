const paymentRouter = require("express").Router();
const { create, getPaymentHistory, createConsultancyOrder, verifyConsultancyPayment }=require("./paymentCtrl")
const { verifyToken } = require("../../Utils/utils");

paymentRouter.route("/create").post(verifyToken, create)
paymentRouter.route("/paymentHistory").post(verifyToken, getPaymentHistory)

// New routes for consultancy payments
paymentRouter.route("/create-order").post(createConsultancyOrder)
paymentRouter.route("/verify").post(verifyConsultancyPayment)




module.exports = { paymentRouter };