const { verifyToken } = require("../../Utils/utils");
const withdrawalCtrl= require("./withdrawalCtrl")
const router = require('express').Router();


router.get("/my-wallet", verifyToken, withdrawalCtrl.walletAmount)
router.post("/withdraw-request", verifyToken, withdrawalCtrl.requestMoney);
router.post('/approve' , verifyToken, withdrawalCtrl.approve)
router.post('/reject' , verifyToken, withdrawalCtrl.reject)
router.post("/", verifyToken, withdrawalCtrl.getPendingRequests)

module.exports =router