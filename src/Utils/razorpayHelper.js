const axios = require('axios');

/**
 * Helper function to call Razorpay API
 * @param {string} endpoint - The Razorpay API endpoint (e.g., '/v2/accounts').
 * @param {string} method - The HTTP method (e.g., 'POST', 'GET').
 * @param {Object} data - The request body for POST/PUT requests.
 * @param {Object} config - Additional Axios config (optional).
 * @returns {Promise<Object>} - The API response.
 */
const callRazorpayApi = async (endpoint, method, data = {}, config = {}) => {
  const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID; // Store in .env
  const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET; // Store in .env
  const baseURL = 'https://api.razorpay.com';

  try {
    const response = await axios({
      url: endpoint,
      method,
      baseURL,
      data,
      auth: {
        username: RAZORPAY_KEY_ID,
        password: RAZORPAY_SECRET,
      },
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    });

    return response.data;
  } catch (error) {
    console.error('Error calling Razorpay API:', error.response?.data || error.message);
    throw new Error(error.response?.data || error.message);
  }
};

module.exports = callRazorpayApi;
