const mongoose = require('mongoose');

const BaggageSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Please add a description'],
    trim: true
  },
  imageUrls: {
    type: [String],
    required: [true, 'Please add at least one image URL']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Baggage', BaggageSchema);
