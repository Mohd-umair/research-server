require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dydmzp82t",
  api_key: process.env.CLOUDINARY_API_KEY || "573256125428726",
  api_secret: process.env.CLOUDINARY_API_SECRET || "ZxVgyMOzXuHjHqwHLbavF94iOf4",
});

module.exports = cloudinary