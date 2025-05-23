const mongoose = require('mongoose');

const villeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  payer: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Ville', villeSchema);
