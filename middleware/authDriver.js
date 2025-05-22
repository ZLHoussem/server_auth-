
// ===== middleware/auth.js =====
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const Driver = require('../models/Driver');

exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(403).json({ message: 'No token provided!' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    req.driverId = decoded.id;
    
    // Check if driver still exists
    const driver = await driver.findById(req.driverId).select('-password');
    if (!driver) {
      return res.status(401).json({ message: 'driver not found!' });
    }
    
    // Check if email is verified
    if (!driver.isVerified) {
      return res.status(403).json({ 
        message: 'Email not verified. Please verify your email first.',
        driverId: driver._id 
      });
    }
    
    req.driver = driver;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized!' });
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.driver && req.driver.roles.includes('admin')) {
    next();
    return;
  }
  
  res.status(403).json({ message: 'Require Admin Role!' });
};
