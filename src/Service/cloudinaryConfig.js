require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dtp2crzrx",
  api_key: process.env.CLOUDINARY_API_KEY || "445326338749266",
  api_secret: process.env.CLOUDINARY_API_SECRET || "A2uwbIdewXeS-rfL4yix3C-nUjM",
});

module.exports = cloudinary;