// middlewares/errorHandler.js

// Central error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    
    // MongoDB validation error
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    // MongoDB duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate field value entered'
      });
    }
    
    // MongoDB invalid ID error
    if (err.name === 'CastError') {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }
    
    // Default error response
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Server Error'
    });
  };
  
  module.exports = errorHandler;