// ===== routes/user.js =====
const express = require("express");
const { verifyToken, isAdmin } = require("../middleware/authUser");
const User = require("../models/User");
const router = express.Router();

// Get current user's profile
router.get("/profile", verifyToken, (req, res) => {
  res.status(200).json(req.user);
});

// Update user profile
router.put("/profile", verifyToken, async (req, res) => {
  try {
    // Prevent password update through this route
    if (req.body.password) {
      delete req.body.password;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $set: req.body },
      { new: true, select: "-password" }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users (admin only)
router.get("/all", [verifyToken, isAdmin], async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
