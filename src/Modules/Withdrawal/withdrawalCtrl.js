const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const { withdrawalService } = require("./withdrawalService");
const withdrawalCtrl = {
  walletAmount: asyncHandler(async (req, res, next) => {
    const user = req.body;
    const walletAmount = await withdrawalService.getWalletAmount(
      user.createdBy
    );
    return successResponse({ res, msg: "Wallet Amount", data: walletAmount });
  }),
  approve: asyncHandler(async (req, res, next) => {
    const { withdrawId } = req.body;
    const response = await withdrawalService.approvePayoutRequest(withdrawId);
    return successResponse({
      res,
      msg: "Withdrawal Request Approved",
      data: response?.data,
    });
  }),

  reject: asyncHandler(async (req, res, next) => {
    const { withdrawId } = req.body
    const response = await withdrawalService.rejectPayoutRequest(withdrawId)
    return successResponse({
      res,
      msg: "Withdrawal Request Approved",
      data: response?.data,
    });
  }),

  requestMoney: asyncHandler(async (req, res, next) => {
    const payoutDto = req.body;
    const response = await withdrawalService.requestPayout(payoutDto);
    return successResponse({ res, msg: "Payout", data: response });
  }),

  getPendingRequests: asyncHandler(async (req, res, next) => {
    const bodyDto = req.body;
    const response = await withdrawalService.getPendingRequests(bodyDto);
    return successResponse({ res, msg: "Pending Payouts", data: response });
  }),
};

module.exports = withdrawalCtrl;
