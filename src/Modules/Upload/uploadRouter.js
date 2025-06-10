const express = require("express");
const uploadCtrl = require("./uploadCtrl");
const { verifyToken } = require("../../Utils/utils");

const router = express.Router();

// Simple test route to verify router is working
router.get("/test", (req, res) => {
  console.log("Upload test route hit successfully!");
  res.json({ 
    success: true, 
    message: "Upload router is working!",
    timestamp: new Date().toISOString()
  });
});

// Upload image endpoint with authentication
router.post("/image", verifyToken, uploadCtrl.uploadImage);

// Upload document endpoint with authentication
router.post("/document", verifyToken, uploadCtrl.uploadDocument);

// Test upload endpoint WITHOUT authentication (for debugging)
router.post("/test-image", uploadCtrl.uploadImage);

// Delete image endpoint
router.delete("/image", verifyToken, uploadCtrl.deleteImage);

module.exports = router; 