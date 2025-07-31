const Razorpay = require("razorpay");
const crypto = require("crypto");
const axios = require("axios");

class PaymentGateway {
  constructor() {
    this._instance = null;
  }

  getInstance() {
    if (!this._instance) {
      // Check if environment variables are available
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
        console.warn('⚠️  Razorpay credentials not found in environment variables');
        console.warn('   RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'SET' : 'NOT SET');
        console.warn('   RAZORPAY_SECRET:', process.env.RAZORPAY_SECRET ? 'SET' : 'NOT SET');
        throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_SECRET environment variables.');
      }
      
      this._instance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_SECRET,
      });
    }
    return this._instance;
  }

  getAuthKey() {
    const creds = {
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    }
    
    if (!creds.key_id || !creds.key_secret) {
      throw new Error('Razorpay credentials not configured');
    }
    
    return Buffer.from(`${creds.key_id}:${creds.key_secret}`).toString("base64")
  }

  verifySignature(razorpay_order_id, razorpay_payment_id, signature) {
    if (!process.env.RAZORPAY_SECRET) {
      throw new Error('RAZORPAY_SECRET not configured');
    }
    
    const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest("hex");
    return digest === signature;
  }
  
  async createContact({ name, email, contact, type = "vendor", reference_id, notes = {} }) {
    try {
      const res = await axios.post(
        "https://api.razorpay.com/v1/contacts",
        {
          name,
          email,
          contact,
          type,
          reference_id,
          notes,
        },
        {
          headers: {
            Authorization: `Basic ${this.getAuthKey()}`,
            "Content-Type": "application/json",
          },
        }
      );
      return res.data;
    } catch (error) {
      console.error("Error creating contact:", error.response?.data || error.message);
      throw error;
    }

  }


 async createFundAccount({ contact_id, account_number, ifsc, name }) {
    try {
      const res = await axios.post(
        "https://api.razorpay.com/v1/fund_accounts",
        {
          contact_id,
          account_type: "bank_account",
          bank_account: {
            name,
            ifsc,
            account_number,
          },
        },
        {
          headers: {
            Authorization: `Basic ${this.getAuthKey()}`,
            "Content-Type": "application/json",
          },
        }
      );
      return res.data;
    } catch (error) {
      console.error("Error creating fund account:", error.response?.data || error.message);
      throw error;
    }
  }

  async payoutToVendor({ fund_account_id, amount, reference_id, narration = "", mode = "IMPS" }) {
    try {
      const res = await axios.post(
        "https://api.razorpay.com/v1/payouts",
        {
          account_number: process.env.RAZORPAYX_ACCOUNT_NUMBER, // Set this in .env
          fund_account_id,
          amount, // in paise
          currency: "INR",
          mode,
          purpose: "payout",
          queue_if_low_balance: true,
          reference_id,
          narration,
        },
        {
          headers: {
            Authorization: `Basic ${this.getAuthKey()}`,
            "Content-Type": "application/json",
          },
        }
      );
      return res.data;
    } catch (error) {
      console.error("Error making payout:", error.response?.data || error.message);
      throw error;
    }
  }

}

// Create a singleton instance but don't initialize it immediately
const paymentGatewayInstance = new PaymentGateway()
module.exports = paymentGatewayInstance


