const mongoose  = require('mongoose')
const withdrawalSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile",
    required: true,
  },
  requestDate: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending","process", "approved"],
    default: "process",
  },
  approvalDate: { type: Date },
});

const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);
module.exports = Withdrawal;
