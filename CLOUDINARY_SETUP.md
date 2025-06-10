# Cloudinary Setup for Image Uploads

## Overview
This application now uses Cloudinary for image storage instead of local file storage. All images are uploaded directly to Cloudinary and served from their CDN.

## Required Environment Variables

Add these variables to your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

## How to Get Cloudinary Credentials

1. **Sign up for Cloudinary**: Go to [cloudinary.com](https://cloudinary.com) and create a free account
2. **Get your credentials**: After signing up, go to your dashboard
3. **Copy the credentials**: You'll find your Cloud Name, API Key, and API Secret in the dashboard

## Features Implemented

### Server-Side (Node.js)
- ✅ Multer configured for memory storage (no local files)
- ✅ Direct upload to Cloudinary using upload_stream
- ✅ Automatic image optimization (quality, format, size)
- ✅ Organized folder structure (`consultancy-images/`)
- ✅ Proper error handling for Cloudinary operations
- ✅ Delete functionality using Cloudinary public_id

### Client-Side (Angular)
- ✅ FormData implementation for file uploads
- ✅ File validation (type, size)
- ✅ Image preview functionality
- ✅ Integration with consultancy service
- ✅ Utility method for Cloudinary URL optimization

## Image Transformations

The server automatically applies these optimizations:
- **Size limit**: 1200x800 pixels maximum
- **Quality**: Auto-optimized based on content
- **Format**: Auto-converted to best format (WebP, AVIF, etc.)
- **Compression**: Automatic compression for faster loading

## Usage Example

### Frontend (Angular)
```typescript
// Upload image
this.consultancyService.uploadImage(file).subscribe(response => {
  console.log('Cloudinary URL:', response.data.url);
});

// Get optimized image URL
const optimizedUrl = this.consultancyService.getOptimizedImageUrl(
  cloudinaryUrl, 
  300, // width
  200  // height
);
```

### Backend Response
```json
{
  "success": true,
  "data": {
    "imagePath": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/consultancy-images/sample.jpg",
    "publicId": "consultancy-images/sample",
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/consultancy-images/sample.jpg",
    "cloudinaryData": {
      "width": 1200,
      "height": 800,
      "format": "jpg",
      "resourceType": "image"
    }
  },
  "message": "Image uploaded successfully to Cloudinary"
}
```

## Benefits of Cloudinary

1. **No local storage**: Files don't consume server disk space
2. **CDN delivery**: Fast image loading worldwide
3. **Automatic optimization**: Better performance and SEO
4. **Transformations**: Resize, crop, and optimize on-the-fly
5. **Backup**: Images are safely stored in the cloud
6. **Scalability**: Handle unlimited image uploads

## Migration Notes

- ❌ Removed local file storage (`public/uploads/`)
- ❌ Removed static file serving for uploads
- ❌ Removed file system operations (fs module)
- ✅ All images now stored in Cloudinary
- ✅ URLs point directly to Cloudinary CDN
- ✅ Automatic image optimization enabled 