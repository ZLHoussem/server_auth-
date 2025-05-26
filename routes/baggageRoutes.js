const express = require("express");
const router = express.Router();
const multer = require("multer");
const baggageController = require("../controllers/baggageController");

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Not an image! Please upload an image file."), false);
    }
  },
});

// Routes
router.get("/", baggageController.getAllBaggage);

router.get("/:id", baggageController.getBaggage);
router.post("/", upload.array("images", 3), baggageController.createBaggage); // Changed to upload.array and 'images'
router.put("/:id", upload.array("images", 3), baggageController.updateBaggage); // Changed to upload.array and 'images'
router.delete("/:id", baggageController.deleteBaggage);

module.exports = router;
