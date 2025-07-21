const { verifyToken } = require('../../Utils/utils');
const earningsCtrl = require('./earningsCtrl');

const router = require('express').Router();

// Teacher/Expert routes (require authentication)
router.post("/summary", verifyToken, earningsCtrl.getEarningsSummary);
router.post("/transactions", verifyToken, earningsCtrl.getTransactions);
router.get("/transaction/:transactionId", verifyToken, earningsCtrl.getTransactionById);
router.post("/range", verifyToken, earningsCtrl.getEarningsByRange);
router.get("/monthly/:year", verifyToken, earningsCtrl.getMonthlyEarnings);
router.post("/request-settlement", verifyToken, earningsCtrl.requestSettlement);
router.post("/settlements", verifyToken, earningsCtrl.getSettlementHistory);
router.post("/export", verifyToken, earningsCtrl.exportEarnings);

// Admin routes (require admin authentication)
router.post("/admin/pending-settlements", verifyToken, earningsCtrl.getPendingSettlements);
router.post("/admin/settle", verifyToken, earningsCtrl.processSettlement);
router.post("/admin/bulk-settle", verifyToken, earningsCtrl.bulkSettlement);
router.post("/admin/update-status", verifyToken, earningsCtrl.updateTransactionStatus);

// Internal routes (for creating earnings when payments are made)
router.post("/create-transaction", earningsCtrl.createEarningsTransaction);

const earningsRouter = router;

module.exports = { earningsRouter }; 