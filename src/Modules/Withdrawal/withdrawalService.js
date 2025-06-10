const WithdrawalModel = require("./withdrawalModel");
const consultancyService = require("../Consultancy/consultancyService");
const { Types } = require("mongoose");
const paymentService = require("../Payment/paymentService");
const ProfileModel = require("../Profiles/profileModel");
const { v4: uuidv4 } = require("uuid");

class WithdrawalService {
  async getWalletAmount(teacherId) {
    try {
      const teacherObjectId = new Types.ObjectId(teacherId);
      const consultancyEarnings = await consultancyService.myConsultancyEarning(
        { createdBy: teacherId }
      );

      const withdrawnResult = await WithdrawalModel.aggregate([
        {
          $match: {
            teacherId: teacherObjectId,
            status: { $in: ["approved", "process"] },
          },
        },
        {
          $group: {
            _id: "$teacherId",
            totalWithdrawn: { $sum: "$amount" },
          },
        },
      ]);

      console.log("Consultancy Earnings:", consultancyEarnings);
      console.log("Withdrawn Earnings:", withdrawnResult);
      const totalPayableAmount = consultancyEarnings?.payableAmount ?? 0;
      const totalAmountWithdrawn = withdrawnResult.length
        ? withdrawnResult[0].totalWithdrawn
        : 0;
      const payableBalanceLeft = totalPayableAmount - totalAmountWithdrawn;

      return {
        payableBalanceLeft,
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async requestPayout(payoutDto) {
    try {
      const { payableBalanceLeft } = await this.getWalletAmount(
        payoutDto.createdBy
      );

      console.log(payableBalanceLeft);
      if (payableBalanceLeft <= 0) {
        throw new Error("No pending amount to payout");
      }
      if (payableBalanceLeft < payoutDto.amount)
        throw new Error("Payout amount cannot be greater than wallet balance.");
      const payload = {
        amount: payoutDto.amount,
        teacherId: payoutDto.createdBy,
        status: "process",
      };
      const result = await WithdrawalModel.create(payload);
      return result;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async approvePayoutRequest(withdrawId) {
    try {
      console.log("ID" , withdrawId);
      const withdrawalRequest = await WithdrawalModel.findOne({
        _id: withdrawId,
        status: "process",
      });
      const { teacherId, amount } = withdrawalRequest;
      const profile = await ProfileModel.findOne({ _id: teacherId });
      // if (!profile.razorPayID) {
      //   throw new Error("Razorpay ID not found for the teacher");
      // }
      if (!profile.contactId || !profile.fundId) {
        throw new Error("Teacher doesnt have contact or fund Id")
      }

      const transferPayload ={
        fund_account_id:profile.fundId,
          amount: amount*100,
          reference_id:`payout-${uuidv4().slice(0,20)}`,
      }


      await paymentService.transferToVendor(transferPayload);

      withdrawalRequest.status = "approved";
      await withdrawalRequest.save();
      return;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getPendingRequests(bodyDto) {
    const { userRole, createdBy, status } = bodyDto;
    const query = {
      status: status ?? "process",
    };
    if (userRole === "TEACHER") {
      query.teacherId = createdBy;
      return WithdrawalModel.find(query);
    } else {
      return WithdrawalModel.find(query);
    }
  }

  async rejectPayoutRequest(withdrawId) {
    await WithdrawalModel.findOneAndDelete({ _id: withdrawId });
    return 
  }
}
const withdrawalService = new WithdrawalService();

module.exports = { withdrawalService };
