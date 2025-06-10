const cloudinary = require("cloudinary");
const CustomError = require("../Errors/CustomError");
const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
   ACL: 'public-read'
});
const s3 = new AWS.S3();
class UploadFiles {
  async uploadFile(fileObj, folderPath) {
    try {
      const { name, data, mimetype } = fileObj
      const fileContent = Buffer.from(data,'binary')

    const params = {
      Bucket: "cc-03-researchdecode",
      Key: `${folderPath}/${name}`,
      Body: fileContent,
    };
      return await s3.upload(params).promise();
    } catch (error) {
      console.log(error);
      throw new CustomError(500, error);
    }
  }
}

const uploadFileService = new UploadFiles();

module.exports = uploadFileService;
