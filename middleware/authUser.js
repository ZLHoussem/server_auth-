
// ===== middleware/auth.js =====
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');

exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(403).json({ message: 'No token provided!' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    req.userId = decoded.id;
    
    // Check if user still exists
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found!' });
    }
    
    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({ 
        message: 'Email not verified. Please verify your email first.',
        userId: user._id 
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized!' });
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.roles.includes('admin')) {
    next();
    return;
  }
  
  res.status(403).json({ message: 'Require Admin Role!' });
};
