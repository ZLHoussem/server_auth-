const Baggage = require('../models/Baggage');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../config/config');

// @desc    Get all baggage items
// @route   GET /api/baggage
// @access  Public
exports.getAllBaggage = async (req, res, next) => {
  try {
    const baggage = await Baggage.find().sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: baggage.length,
      data: baggage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single baggage item
// @route   GET /api/baggage/:id
// @access  Public
exports.getBaggage = async (req, res, next) => {
  try {
    const baggage = await Baggage.findById(req.params.id);
    
    if (!baggage) {
      return res.status(404).json({
        success: false,
        error: 'No baggage found with that ID'
      });
    }
    
    res.status(200).json({
      success: true,
      data: baggage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new baggage item with image upload
// @route   POST /api/baggage
// @access  Public
exports.createBaggage = async (req, res, next) => {
  try {
    const { description } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please add at least one image'
      });
    }
    
    const imageUrls = [];
    for (const file of req.files) {
      // Create FormData properly for Node.js
      const formData = new FormData();
      
      // Convert buffer to readable stream
      const { Readable } = require('stream');
      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null); // End the stream
      
      // Append the stream with proper metadata
      formData.append('image', readableStream, {
        filename: file.originalname || 'image.jpg',
        contentType: file.mimetype
      });
      
      const imageResponse = await axios.post(config.IMAGE_SERVER_URL, formData, {
        headers: {
          ...formData.getHeaders()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });
      
      if (!imageResponse.data.success || !imageResponse.data.imageUrl) {
        console.error('Failed to upload an image:', imageResponse.data);
        continue;
      }
      
      imageUrls.push(imageResponse.data.imageUrl);
    }
    
    if (imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Failed to upload any images successfully'
      });
    }
    
    const baggage = await Baggage.create({
      description,
      imageUrls
    });
    
    res.status(201).json({
      success: true,
      data: baggage,
      
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update baggage item
// @route   PUT /api/baggage/:id
// @access  Public
exports.updateBaggage = async (req, res, next) => {
  try {
    let baggage = await Baggage.findById(req.params.id);
    
    if (!baggage) {
      return res.status(404).json({
        success: false,
        error: 'No baggage found with that ID'
      });
    }
    
    // If there are new files, upload them and replace existing imageUrls
    if (req.files && req.files.length > 0) {
      const newImageUrls = [];
      for (const file of req.files) {
        const formData = new FormData();
        const filename = file.originalname || 'default-image.jpg'; // Provide a default filename
        formData.append('image', file.buffer, {
          filename: filename,
          contentType: file.mimetype
        });
        
        const imageResponse = await axios.post(config.IMAGE_SERVER_URL, formData, {
          headers: {
            ...formData.getHeaders()
          }
        });
        
        if (imageResponse.data.success && imageResponse.data.imageUrl) {
          newImageUrls.push(imageResponse.data.imageUrl);
        } else {
          console.error('Failed to upload an image during update or imageUrl missing:', imageResponse.data);
          // Optionally, handle this error more robustly, e.g., by not updating images if one fails
        }
      }
      // Only update imageUrls if new images were successfully uploaded
      if (newImageUrls.length > 0) {
        req.body.imageUrls = newImageUrls;
      } else if (req.files.length > 0 && newImageUrls.length === 0) {
        // All image uploads failed
         return res.status(400).json({
          success: false,
          error: 'Failed to upload any new images during update.'
        });
      }
      // If req.files was empty, imageUrls will not be overwritten unless explicitly provided in req.body.imageUrls
    }
    // Note: If req.body.imageUrls is explicitly passed (e.g. to remove images or reorder), 
    // it will be used by findByIdAndUpdate. This logic prioritizes new file uploads.
    
    baggage = await Baggage.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: baggage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete baggage item
// @route   DELETE /api/baggage/:id
// @access  Public
exports.deleteBaggage = async (req, res, next) => {
  try {
    const baggage = await Baggage.findById(req.params.id);
    
    if (!baggage) {
      return res.status(404).json({
        success: false,
        error: 'No baggage found with that ID'
      });
    }
    
    await baggage.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
