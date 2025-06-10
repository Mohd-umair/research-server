const successResponse = require("../../Utils/apiResponse");
const asyncHandler = require("../../Utils/asyncHandler");
const cloudinary = require("../../Service/cloudinaryConfig");
const multer = require('multer');

// Configure multer for memory storage (no local files)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    fieldSize: 10 * 1024 * 1024, // 10MB field size
    parts: 10, // Max number of parts
    fields: 5 // Max number of fields
  },
  fileFilter: (req, file, cb) => {
    console.log('Multer fileFilter called with:', file.originalname, file.mimetype);
    
    // Check file type
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      console.log('File type accepted');
      cb(null, true);
    } else {
      console.log('File type rejected');
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'), false);
    }
  }
});

// Configure multer for document uploads
const uploadDocument = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    fieldSize: 10 * 1024 * 1024, // 10MB field size
    parts: 10, // Max number of parts
    fields: 5 // Max number of fields
  },
  fileFilter: (req, file, cb) => {
    console.log('Document fileFilter called with:', file.originalname, file.mimetype);
    
    // Check file type for documents
    const allowedTypes = /pdf|doc|docx/;
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (mimetype && extname) {
      console.log('Document file type accepted');
      cb(null, true);
    } else {
      console.log('Document file type rejected');
      cb(new Error('Only document files (PDF, DOC, DOCX) are allowed!'), false);
    }
  }
});

const uploadCtrl = {
  uploadImage: [
    (req, res, next) => {
      console.log('=== UPLOAD DEBUG START ===');
      console.log('Request method:', req.method);
      console.log('Request URL:', req.url);
      console.log('Content-Type:', req.headers['content-type']);
      console.log('Content-Length:', req.headers['content-length']);
      console.log('Raw body length:', req.body ? Object.keys(req.body).length : 'undefined');
      console.log('=== UPLOAD DEBUG END ===');
      next();
    },
    upload.single('image'),
    asyncHandler(async (req, res, next) => {
      try {
        console.log('Upload endpoint hit');
        console.log('Request headers:', req.headers);
        console.log('Request file:', req.file);
        console.log('Request body:', req.body);

        if (!req.file) {
          console.log('No file provided in request');
          return res.status(400).json({
            success: false,
            message: 'No image file provided'
          });
        }

        console.log('File received:', {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        });

        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: 'consultancy-images', // Organize images in folders
              transformation: [
                { width: 1200, height: 800, crop: 'limit' }, // Optimize image size
                { quality: 'auto' }, // Auto quality optimization
                { format: 'auto' } // Auto format optimization
              ]
            },
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error:', error);
                reject(error);
              } else {
                console.log('Cloudinary upload success:', result.secure_url);
                resolve(result);
              }
            }
          ).end(req.file.buffer);
        });

        // Return the uploaded image details
        return successResponse({
          res,
          data: {
            imagePath: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            originalName: req.file.originalname,
            size: req.file.size,
            url: uploadResult.secure_url,
            cloudinaryData: {
              width: uploadResult.width,
              height: uploadResult.height,
              format: uploadResult.format,
              resourceType: uploadResult.resource_type
            }
          },
          msg: "Image uploaded successfully to Cloudinary"
        });

      } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload image to Cloudinary',
          error: error.message
        });
      }
    })
  ],

  uploadDocument: [
    (req, res, next) => {
      console.log('=== DOCUMENT UPLOAD DEBUG START ===');
      console.log('Request method:', req.method);
      console.log('Request URL:', req.url);
      console.log('Content-Type:', req.headers['content-type']);
      console.log('Content-Length:', req.headers['content-length']);
      console.log('Raw body length:', req.body ? Object.keys(req.body).length : 'undefined');
      console.log('=== DOCUMENT UPLOAD DEBUG END ===');
      next();
    },
    uploadDocument.single('file'),
    asyncHandler(async (req, res, next) => {
      try {
        console.log('Document upload endpoint hit');
        console.log('Request headers:', req.headers);
        console.log('Request file:', req.file);
        console.log('Request body:', req.body);

        if (!req.file) {
          console.log('No file provided in request');
          return res.status(400).json({
            success: false,
            message: 'No document file provided'
          });
        }

        console.log('Document file received:', {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        });

        // Upload to Cloudinary as raw file (for documents)
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'raw', // For non-image files
              folder: 'teacher-documents', // Organize documents in folders
              public_id: `${Date.now()}_${req.file.originalname.replace(/\.[^/.]+$/, "")}`
            },
            (error, result) => {
              if (error) {
                console.error('Cloudinary document upload error:', error);
                reject(error);
              } else {
                console.log('Cloudinary document upload success:', result.secure_url);
                resolve(result);
              }
            }
          ).end(req.file.buffer);
        });

        // Return the uploaded document details
        return successResponse({
          res,
          data: {
            documentPath: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            originalName: req.file.originalname,
            size: req.file.size,
            url: uploadResult.secure_url,
            cloudinaryData: {
              format: uploadResult.format,
              resourceType: uploadResult.resource_type,
              bytes: uploadResult.bytes
            }
          },
          msg: "Document uploaded successfully to Cloudinary"
        });

      } catch (error) {
        console.error('Document upload error:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload document to Cloudinary',
          error: error.message
        });
      }
    })
  ],

  deleteImage: asyncHandler(async (req, res, next) => {
    try {
      const { publicId } = req.body;
      
      if (!publicId) {
        return res.status(400).json({
          success: false,
          message: 'Public ID is required for Cloudinary deletion'
        });
      }

      // Delete from Cloudinary
      const deleteResult = await cloudinary.uploader.destroy(publicId);
      
      if (deleteResult.result === 'ok') {
        return successResponse({
          res,
          data: { 
            deleted: true,
            publicId: publicId,
            result: deleteResult.result
          },
          msg: "Image deleted successfully from Cloudinary"
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Image not found in Cloudinary or already deleted',
          result: deleteResult.result
        });
      }

    } catch (error) {
      console.error('Delete error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete image from Cloudinary',
        error: error.message
      });
    }
  })
};

module.exports = uploadCtrl; 