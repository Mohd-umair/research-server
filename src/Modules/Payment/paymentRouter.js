const paymentRouter = require("express").Router();
const { create, getPaymentHistory }=require("./paymentCtrl")
const { verifyToken } = require("../../Utils/utils");

paymentRouter.route("/create").post(verifyToken, create)
paymentRouter.route("/paymentHistory").post(verifyToken, getPaymentHistory)




module.exports = { paymentRouter };