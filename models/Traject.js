// models/Traject.js
const mongoose = require('mongoose');

const trajectSchema = new mongoose.Schema({
   idChauffeur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  prixParKilo: {
    type: Number,
    required: [true, 'Prix par kilo is required'],
    default: 0
  },
  prixParPiece: {
    type: Number,
    required: [true, 'Prix par piece is required'],
    default: 0
  },
  modetransport: {
    type: String,
    required: [true, 'Mode de transport is required'],
    trim: true
  },
  dateTraject: {
    type: Date,
    required: [true, 'Date traject is required'],
    default: Date.now
  },
  portDepart: {
    type: String,
    required: [true, 'Port depart is required'],
    trim: true
  },
  portDarriver: {
    type: String,
    required: [true, 'Port d\'arriver is required'],
    trim: true
  },
  pointRamasage: {
    type: [String],
    default: []
  },
  pointLivraison: {
    type: [String],
    default: []
  },

}, {
  timestamps: true
});

module.exports = mongoose.model('Traject', trajectSchema);
