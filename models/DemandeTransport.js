const mongoose = require('mongoose');

const demandeTransportSchema = new mongoose.Schema({
  poisColieTotal: {
    type: Number,
    
  },
  pointRamasage: {
    type: String,
    required: true,
  },
  pointLivrison: {
    type: String,
    required: true,
  },
  id_driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver', 
    required: false,
  },
  prixProposer: {
    type: Number,
  },
  statutsDemande: {
    type: String,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'rejected'],
    default: 'pending',
    required: true,
  },
    
  id_traject: {
    
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Traject',
    required: false,
  },
  id_user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  proposerDriver: {
    type: Boolean,
    default: false,
  },
  proposerUser: {
    type: Boolean,
    default: false,
  },
  id_bagages: [{ // Corrected from id_bagagdes to id_bagages for consistency
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Baggage', // Referencing the existing Baggage model
    required: false,
  }],
}, { timestamps: true });

module.exports = mongoose.model('DemandeTransport', demandeTransportSchema);
